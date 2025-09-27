#!/usr/bin/env python3
"""
Enhanced YouTube Processing Backend Service
Integrates with your existing Flask app to add audio processing capabilities
"""

import os
import tempfile
import subprocess
import json
import requests
from typing import Optional, Dict, Any, Tuple
from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
import openai
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsApi
from youtube_transcript_api.formatters import TextFormatter
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class YouTubeProcessor:
    """Enhanced YouTube processing with audio fallback"""
    
    def __init__(self, ffmpeg_path: str = None):
        # Use your compiled FFmpeg
        self.ffmpeg_path = ffmpeg_path or "/Users/abdulhamid-macmini/Downloads/ffmpeg-8.0/run_ffmpeg.sh"
        self.temp_dir = tempfile.gettempdir()
        
    def extract_video_id(self, url: str) -> Optional[str]:
        """Extract video ID from YouTube URL"""
        import re
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
            r'youtube\.com\/v\/([^&\n?#]+)',
            r'youtube\.com\/watch\?.*v=([^&\n?#]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    def get_direct_transcript(self, video_id: str) -> Tuple[bool, Optional[str], Optional[Dict]]:
        """Try to get transcript using YouTube's built-in captions"""
        try:
            # Get available transcripts
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            # Try to get English transcript first
            transcript = None
            try:
                transcript = transcript_list.find_transcript(['en'])
            except:
                # If no English, get the first available
                for t in transcript_list:
                    transcript = t
                    break
            
            if transcript:
                # Fetch and format the transcript
                transcript_data = transcript.fetch()
                formatter = TextFormatter()
                full_text = formatter.format_transcript(transcript_data)
                
                return True, full_text.strip(), {
                    'language': transcript.language_code,
                    'is_generated': transcript.is_generated,
                    'segments': len(transcript_data)
                }
        except Exception as e:
            logger.warning(f"Direct transcript failed for {video_id}: {e}")
        
        return False, None, None
    
    def get_video_info(self, url: str) -> Optional[Dict[str, Any]]:
        """Get video information using yt-dlp"""
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return {
                    'title': info.get('title'),
                    'duration': info.get('duration'),
                    'uploader': info.get('uploader'),
                    'upload_date': info.get('upload_date'),
                    'view_count': info.get('view_count'),
                    'has_automatic_captions': bool(info.get('automatic_captions')),
                    'has_subtitles': bool(info.get('subtitles'))
                }
        except Exception as e:
            logger.error(f"Failed to get video info: {e}")
            return None
    
    def download_audio(self, url: str) -> Optional[str]:
        """Download and extract audio using yt-dlp and FFmpeg"""
        try:
            video_id = self.extract_video_id(url)
            if not video_id:
                raise ValueError("Invalid YouTube URL")
            
            # Create temporary file paths
            temp_video = os.path.join(self.temp_dir, f"{video_id}_temp_video.%(ext)s")
            audio_path = os.path.join(self.temp_dir, f"{video_id}_audio.wav")
            
            # Download video with yt-dlp
            ydl_opts = {
                'format': 'best[height<=720]/best',  # Limit quality for faster download
                'outtmpl': temp_video,
                'quiet': True,
            }
            
            logger.info(f"Downloading video {video_id}...")
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            
            # Find the actual downloaded file
            import glob
            video_files = glob.glob(temp_video.replace('%(ext)s', '*'))
            if not video_files:
                raise Exception("Video download failed - no file found")
            
            actual_video_path = video_files[0]
            
            # Extract audio using FFmpeg
            logger.info("Extracting audio...")
            ffmpeg_cmd = [
                self.ffmpeg_path,
                '-i', actual_video_path,
                '-vn',  # No video
                '-ar', '16000',  # Sample rate for speech recognition
                '-ac', '1',  # Mono
                '-c:a', 'pcm_s16le',  # WAV format
                '-y',  # Overwrite
                audio_path
            ]
            
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                raise Exception(f"FFmpeg error: {result.stderr}")
            
            # Cleanup video file
            try:
                os.remove(actual_video_path)
            except:
                pass
            
            if os.path.exists(audio_path):
                logger.info(f"Audio extracted to: {audio_path}")
                return audio_path
            else:
                raise Exception("Audio file was not created")
                
        except Exception as e:
            logger.error(f"Audio download failed: {e}")
            raise
    
    def transcribe_with_openai(self, audio_path: str, api_key: str) -> str:
        """Transcribe audio using OpenAI Whisper"""
        try:
            # Set OpenAI API key
            openai.api_key = api_key
            
            logger.info("Transcribing audio with OpenAI Whisper...")
            
            with open(audio_path, 'rb') as audio_file:
                transcript = openai.Audio.transcribe(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
            
            return transcript.strip()
            
        except Exception as e:
            logger.error(f"OpenAI transcription failed: {e}")
            raise Exception(f"Transcription failed: {str(e)}")
    
    def process_youtube_url(self, url: str, openai_api_key: str = None, use_audio_fallback: bool = True) -> Dict[str, Any]:
        """Main processing function with multiple fallback methods"""
        video_id = self.extract_video_id(url)
        if not video_id:
            return {
                'success': False,
                'error': 'Invalid YouTube URL'
            }
        
        result = {
            'success': False,
            'video_id': video_id,
            'video_info': self.get_video_info(url)
        }
        
        # Method 1: Try direct transcript
        logger.info(f"Trying direct transcript for {video_id}...")
        success, transcript, transcript_info = self.get_direct_transcript(video_id)
        
        if success and transcript:
            result.update({
                'success': True,
                'transcript': transcript,
                'method': 'captions',
                'transcript_info': transcript_info
            })
            return result
        
        # Method 2: Audio processing fallback
        if use_audio_fallback and openai_api_key:
            logger.info("Direct transcript failed, trying audio processing...")
            
            audio_path = None
            try:
                # Download and extract audio
                audio_path = self.download_audio(url)
                
                # Transcribe with OpenAI
                transcript = self.transcribe_with_openai(audio_path, openai_api_key)
                
                result.update({
                    'success': True,
                    'transcript': transcript,
                    'method': 'audio_processing'
                })
                
                return result
                
            except Exception as e:
                logger.error(f"Audio processing failed: {e}")
                result['audio_processing_error'] = str(e)
            
            finally:
                # Cleanup audio file
                if audio_path and os.path.exists(audio_path):
                    try:
                        os.remove(audio_path)
                    except:
                        pass
        
        # If all methods fail
        result.update({
            'success': False,
            'error': 'No transcript available and audio processing failed or disabled',
            'suggestions': [
                'Enable captions on the YouTube video',
                'Provide OpenAI API key for audio processing',
                'Copy transcript manually'
            ]
        })
        
        return result

# Initialize processor
processor = YouTubeProcessor()

# API Routes
@app.route('/api/youtube/transcript', methods=['POST'])
def get_transcript():
    """Main transcript extraction endpoint"""
    data = request.json
    
    if not data or 'youtube_url' not in data:
        return jsonify({'success': False, 'error': 'YouTube URL is required'}), 400
    
    youtube_url = data['youtube_url']
    openai_api_key = data.get('openai_api_key')
    use_audio_fallback = data.get('use_audio_processing', True)
    
    try:
        result = processor.process_youtube_url(
            youtube_url, 
            openai_api_key, 
            use_audio_fallback
        )
        
        status_code = 200 if result['success'] else 400
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"Transcript extraction error: {e}")
        return jsonify({
            'success': False,
            'error': f'Internal error: {str(e)}'
        }), 500

@app.route('/api/youtube/transcript-direct', methods=['POST'])
def get_direct_transcript():
    """Direct transcript only (no audio processing)"""
    data = request.json
    
    if not data or 'video_id' not in data:
        return jsonify({'success': False, 'error': 'Video ID is required'}), 400
    
    video_id = data['video_id']
    
    try:
        success, transcript, transcript_info = processor.get_direct_transcript(video_id)
        
        if success:
            return jsonify({
                'success': True,
                'transcript': transcript,
                'transcript_info': transcript_info
            })
        else:
            return jsonify({
                'success': False,
                'error': 'No captions available for this video'
            }), 404
            
    except Exception as e:
        logger.error(f"Direct transcript error: {e}")
        return jsonify({
            'success': False,
            'error': f'Error: {str(e)}'
        }), 500

@app.route('/api/youtube/info', methods=['POST'])
def get_video_info():
    """Get video information"""
    data = request.json
    
    if not data or 'youtube_url' not in data:
        return jsonify({'success': False, 'error': 'YouTube URL is required'}), 400
    
    try:
        info = processor.get_video_info(data['youtube_url'])
        
        if info:
            return jsonify({
                'success': True,
                'video_info': info
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Could not fetch video information'
            }), 404
            
    except Exception as e:
        logger.error(f"Video info error: {e}")
        return jsonify({
            'success': False,
            'error': f'Error: {str(e)}'
        }), 500

@app.route('/api/youtube/check-captions', methods=['POST'])
def check_captions():
    """Check if video has captions available"""
    data = request.json
    
    if not data or 'video_id' not in data:
        return jsonify({'success': False, 'error': 'Video ID is required'}), 400
    
    video_id = data['video_id']
    
    try:
        success, _, _ = processor.get_direct_transcript(video_id)
        
        return jsonify({
            'success': True,
            'has_captions': success
        })
        
    except Exception as e:
        return jsonify({
            'success': True,
            'has_captions': False,
            'error': str(e)
        })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'ffmpeg_path': processor.ffmpeg_path,
        'ffmpeg_available': os.path.exists(processor.ffmpeg_path)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

# Installation requirements:
"""
pip install flask flask-cors yt-dlp openai youtube-transcript-api
"""