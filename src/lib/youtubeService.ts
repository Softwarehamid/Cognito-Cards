// Enhanced YouTube Service for Browser Environment
export interface TranscriptSegment {
  text: string;
  duration?: number;
  offset?: number;
}

export interface AudioProcessingRequest {
  youtubeUrl: string;
  useAudioFallback?: boolean;
  openaiApiKey?: string;
}

export interface TranscriptResponse {
  success: boolean;
  transcript?: string;
  method?: "captions" | "audio_processing" | "manual";
  error?: string;
  videoInfo?: {
    title?: string;
    duration?: number;
    hasAutoCaption?: boolean;
  };
  suggestions?: string[];
}

export class EnhancedYouTubeService {
  private static backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

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
   * Enhanced transcript fetching with multiple methods
   */
  static async getTranscript(
    request: AudioProcessingRequest
  ): Promise<TranscriptResponse> {
    try {
      const videoId = this.extractVideoId(request.youtubeUrl);

      if (!videoId) {
        return {
          success: false,
          error: "Invalid YouTube URL. Please check the URL format.",
        };
      }

      console.log(`Fetching transcript for video ID: ${videoId}`);

      // Method 1: Try to get existing transcript/captions (client-side)
      try {
        // Note: This requires youtube-transcript package to be installed
        // and may not work due to CORS in browser environment
        const transcript = await this.tryDirectTranscript(videoId);
        if (transcript) {
          return {
            success: true,
            transcript,
            method: "captions",
            videoInfo: { hasAutoCaption: true },
          };
        }
      } catch (transcriptError) {
        console.warn("Direct transcript extraction failed:", transcriptError);
      }

      // Method 2: Use backend service for audio processing
      if (request.useAudioFallback && request.openaiApiKey) {
        console.log(
          "🎵 No transcript found, trying backend audio processing..."
        );

        try {
          const response = await fetch(
            `${this.backendUrl}/api/youtube/transcript`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                youtube_url: request.youtubeUrl,
                openai_api_key: request.openaiApiKey,
                use_audio_processing: true,
              }),
            }
          );

          const result = await response.json();

          if (response.ok && result.success) {
            return {
              success: true,
              transcript: result.transcript,
              method: "audio_processing",
              videoInfo: result.video_info,
            };
          } else {
            throw new Error(result.error || "Backend processing failed");
          }
        } catch (backendError: any) {
          console.error("Backend audio processing failed:", backendError);
          return {
            success: false,
            error: `Audio processing failed: ${backendError.message}`,
            method: "audio_processing",
          };
        }
      }

      // Method 3: Manual fallback
      return {
        success: false,
        error:
          "Unable to automatically extract transcript from this video. This could be because:\n\n" +
          "• The video has no captions/subtitles\n" +
          "• The captions are disabled\n" +
          "• CORS restrictions are blocking the request\n\n" +
          "Options to resolve:\n" +
          "1. Enable captions on the YouTube video\n" +
          '2. Copy the transcript manually and paste it in the "Text Notes" tab\n' +
          "3. Enable audio processing (requires OpenAI API key)\n" +
          "4. Use a different video with available captions",
        method: "manual",
      };
    } catch (error: any) {
      console.error("YouTube transcript error:", error);
      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  }

  /**
   * Try direct transcript extraction using youtube-transcript package
   */
  private static async tryDirectTranscript(
    videoId: string
  ): Promise<string | null> {
    try {
      const { YoutubeTranscript } = await import("youtube-transcript");
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);

      if (!transcript || transcript.length === 0) {
        return null;
      }

      const fullText = transcript
        .map((segment: TranscriptSegment) => segment.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      return fullText || null;
    } catch (error: any) {
      console.warn("Direct transcript extraction failed:", error.message);

      // Don't throw here, just return null so we can try other methods
      return null;
    }
  }

  /**
   * Check if video has captions available
   */
  static async checkCaptionsAvailable(url: string): Promise<boolean> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) return false;

      const response = await fetch(
        `${this.backendUrl}/api/youtube/check-captions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ video_id: videoId }),
        }
      );

      const result = await response.json();
      return result.has_captions || false;
    } catch (error) {
      console.warn("Could not check captions availability:", error);
      return false;
    }
  }

  /**
   * Get video information
   */
  static async getVideoInfo(url: string): Promise<any> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) return null;

      const response = await fetch(`${this.backendUrl}/api/youtube/info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ youtube_url: url }),
      });

      const result = await response.json();
      return result.success ? result.video_info : null;
    } catch (error) {
      console.warn("Could not fetch video info:", error);
      return null;
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
   * Estimate processing time based on video duration
   */
  static estimateProcessingTime(durationSeconds: number): string {
    // Audio processing typically takes 10-30% of video duration
    const estimatedMinutes = Math.ceil((durationSeconds * 0.2) / 60);

    if (estimatedMinutes < 1) return "Less than 1 minute";
    if (estimatedMinutes === 1) return "About 1 minute";
    return `About ${estimatedMinutes} minutes`;
  }
}

// Usage in your React component:
/*
const handleYouTubeProcessing = async (url: string, openaiApiKey: string) => {
  setLoading(true);
  
  try {
    const result = await EnhancedYouTubeService.getTranscript({
      youtubeUrl: url,
      useAudioFallback: true,
      openaiApiKey: openaiApiKey
    });

    if (result.success) {
      console.log(`Transcript obtained via ${result.method}`);
      console.log(`Content: ${result.transcript}`);
      // Process the transcript for flashcard generation
      await generateFlashcards(result.transcript);
    } else {
      setError(result.error);
    }
  } catch (error) {
    setError("Failed to process YouTube video");
  } finally {
    setLoading(false);
  }
};
*/

// Backward compatibility - export the old method signature for existing code
export const YouTubeService = {
  extractVideoId: EnhancedYouTubeService.extractVideoId,
  getTranscript: (url: string) =>
    EnhancedYouTubeService.getTranscript({ youtubeUrl: url }),
  isValidYouTubeUrl: EnhancedYouTubeService.isValidYouTubeUrl,
};
