export interface TranscriptSegment {
  text: string;
  duration?: number;
  offset?: number;
}

export interface AudioProcessingOptions {
  ffmpegPath?: string;
  outputFormat?: "wav" | "mp3" | "m4a";
  sampleRate?: number;
  channels?: number;
}

export class EnhancedYouTubeService {
  private static defaultFFmpegPath =
    "/Users/abdulhamid-macmini/Downloads/ffmpeg-8.0/run_ffmpeg.sh";

  /**
   * Extract video ID from various YouTube URL formats
   */
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Download YouTube video using yt-dlp
   */
  static async downloadVideo(
    url: string,
    outputPath: string = "./temp"
  ): Promise<string> {
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }

      // Download video with yt-dlp (you'll need to install: pip install yt-dlp)
      const videoPath = `${outputPath}/${videoId}.%(ext)s`;
      const command = `yt-dlp -f "best[height<=720]" -o "${videoPath}" "${url}"`;

      console.log(`Downloading video: ${videoId}`);
      const { stdout } = await execAsync(command);

      // Find the actual downloaded file
      const fs = await import("fs");
      const path = await import("path");
      const files = fs
        .readdirSync(outputPath)
        .filter((file) => file.startsWith(videoId));

      if (files.length === 0) {
        throw new Error("Video download failed - no file found");
      }

      return path.join(outputPath, files[0]);
    } catch (error: any) {
      console.error("Video download error:", error);
      throw new Error(`Failed to download video: ${error.message}`);
    }
  }

  /**
   * Extract audio from video using FFmpeg
   */
  static async extractAudio(
    videoPath: string,
    options: AudioProcessingOptions = {}
  ): Promise<string> {
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      const path = await import("path");

      const {
        ffmpegPath = this.defaultFFmpegPath,
        outputFormat = "wav",
        sampleRate = 16000, // Optimal for speech recognition
        channels = 1, // Mono for better speech processing
      } = options;

      const videoDir = path.dirname(videoPath);
      const videoName = path.basename(videoPath, path.extname(videoPath));
      const audioPath = path.join(
        videoDir,
        `${videoName}_audio.${outputFormat}`
      );

      // FFmpeg command for audio extraction optimized for speech
      const command = [
        ffmpegPath,
        "-i",
        `"${videoPath}"`,
        "-vn", // No video
        "-ar",
        sampleRate.toString(), // Sample rate
        "-ac",
        channels.toString(), // Channels
        "-c:a",
        outputFormat === "wav" ? "pcm_s16le" : "aac",
        "-y", // Overwrite output file
        `"${audioPath}"`,
      ].join(" ");

      console.log(`Extracting audio with command: ${command}`);
      await execAsync(command);

      // Verify the file was created
      const fs = await import("fs");
      if (!fs.existsSync(audioPath)) {
        throw new Error("Audio extraction failed - output file not found");
      }

      console.log(`Audio extracted to: ${audioPath}`);
      return audioPath;
    } catch (error: any) {
      console.error("Audio extraction error:", error);
      throw new Error(`Failed to extract audio: ${error.message}`);
    }
  }

  /**
   * Convert audio to text using OpenAI Whisper API
   */
  static async transcribeAudio(
    audioPath: string,
    apiKey: string
  ): Promise<string> {
    try {
      const fs = await import("fs");
      const FormData = require("form-data");

      // Create form data
      const form = new FormData();
      form.append("file", fs.createReadStream(audioPath));
      form.append("model", "whisper-1");
      form.append("response_format", "text");

      // Make API call to OpenAI
      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            ...form.getHeaders(),
          },
          body: form,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OpenAI API error: ${errorData.error?.message || "Unknown error"}`
        );
      }

      const transcription = await response.text();
      console.log(
        `Transcription completed: ${transcription.length} characters`
      );

      return transcription.trim();
    } catch (error: any) {
      console.error("Transcription error:", error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Enhanced transcript fetching with fallback to audio processing
   */
  static async getTranscript(
    url: string,
    options: {
      openaiApiKey?: string;
      useAudioFallback?: boolean;
      audioOptions?: AudioProcessingOptions;
      tempDir?: string;
    } = {}
  ): Promise<string> {
    try {
      const videoId = this.extractVideoId(url);

      if (!videoId) {
        throw new Error("Invalid YouTube URL. Please check the URL format.");
      }

      console.log(`Fetching transcript for video ID: ${videoId}`);

      // Method 1: Try to get existing transcript/captions
      try {
        const { YoutubeTranscript } = await import("youtube-transcript");
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);

        if (transcript && transcript.length > 0) {
          const fullText = transcript
            .map((segment: TranscriptSegment) => segment.text)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

          if (fullText) {
            console.log(`✓ Transcript found: ${fullText.length} characters`);
            return fullText;
          }
        }
      } catch (transcriptError) {
        console.warn("Direct transcript extraction failed:", transcriptError);
      }

      // Method 2: Fallback to audio processing (if enabled and API key provided)
      if (options.useAudioFallback && options.openaiApiKey) {
        console.log(
          "🎵 No transcript found, falling back to audio processing..."
        );

        const tempDir = options.tempDir || "./temp";

        // Ensure temp directory exists
        const fs = await import("fs");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        try {
          // Download video
          console.log("📥 Downloading video...");
          const videoPath = await this.downloadVideo(url, tempDir);

          // Extract audio
          console.log("🔊 Extracting audio...");
          const audioPath = await this.extractAudio(
            videoPath,
            options.audioOptions
          );

          // Transcribe audio
          console.log("🎤 Transcribing audio...");
          const transcription = await this.transcribeAudio(
            audioPath,
            options.openaiApiKey
          );

          // Cleanup temporary files
          try {
            fs.unlinkSync(videoPath);
            fs.unlinkSync(audioPath);
            console.log("🧹 Cleaned up temporary files");
          } catch (cleanupError) {
            console.warn(
              "Warning: Could not clean up temporary files:",
              cleanupError
            );
          }

          return transcription;
        } catch (audioProcessingError) {
          console.error("Audio processing failed:", audioProcessingError);
          throw new Error(
            `Could not extract transcript using audio processing: ${audioProcessingError.message}`
          );
        }
      }

      // Method 3: Manual fallback message
      throw new Error(
        "Unable to automatically extract transcript from this video. This could be because:\n\n" +
          "• The video has no captions/subtitles\n" +
          "• The captions are disabled\n" +
          "• CORS restrictions are blocking the request\n\n" +
          "Options to resolve:\n" +
          "1. Enable captions on the YouTube video\n" +
          '2. Copy the transcript manually and paste it in the "Text Notes" tab\n' +
          "3. Use audio processing fallback (requires OpenAI API key)\n" +
          "4. Use a different video with available captions"
      );
    } catch (error: any) {
      console.error("YouTube transcript error:", error);
      throw error;
    }
  }

  /**
   * Validate if URL is a YouTube URL
   */
  static isValidYouTubeUrl(url: string): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  }

  /**
   * Get video information (duration, title, etc.)
   */
  static async getVideoInfo(url: string): Promise<any> {
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const command = `yt-dlp --dump-json "${url}"`;
      const { stdout } = await execAsync(command);

      return JSON.parse(stdout);
    } catch (error) {
      console.warn("Could not fetch video info:", error);
      return null;
    }
  }
}

// Usage example:
/*
const transcript = await EnhancedYouTubeService.getTranscript(
  "https://www.youtube.com/watch?v=VIDEO_ID",
  {
    openaiApiKey: "your-openai-api-key",
    useAudioFallback: true,
    audioOptions: {
      outputFormat: 'wav',
      sampleRate: 16000,
      channels: 1
    },
    tempDir: './temp'
  }
);
*/
