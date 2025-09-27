export interface TranscriptSegment {
  text: string;
  duration?: number;
  offset?: number;
}

export class YouTubeService {
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
   * Fetch transcript for a YouTube video
   * This uses a CORS proxy approach since direct API calls may be blocked
   */
  static async getTranscript(url: string): Promise<string> {
    try {
      const videoId = this.extractVideoId(url);

      if (!videoId) {
        throw new Error("Invalid YouTube URL. Please check the URL format.");
      }

      console.log(`Fetching transcript for video ID: ${videoId}`);

      // Try to use youtube-transcript package
      try {
        const { YoutubeTranscript } = await import("youtube-transcript");
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);

        if (!transcript || transcript.length === 0) {
          throw new Error("No transcript available");
        }

        // Combine all transcript segments into a single text
        const fullText = transcript
          .map((segment: TranscriptSegment) => segment.text)
          .join(" ")
          .replace(/\s+/g, " ") // Normalize whitespace
          .trim();

        if (!fullText) {
          throw new Error("Transcript is empty or could not be processed.");
        }

        console.log(`Transcript extracted: ${fullText.length} characters`);
        return fullText;
      } catch (transcriptError) {
        console.warn("Direct transcript extraction failed:", transcriptError);

        // Fallback: Ask user to manually paste transcript
        throw new Error(
          "Unable to automatically extract transcript from this video. This could be because:\n\n" +
            "• The video has no captions/subtitles\n" +
            "• The captions are disabled\n" +
            "• CORS restrictions are blocking the request\n\n" +
            "Please try:\n" +
            "1. Enable captions on the YouTube video\n" +
            '2. Copy the transcript manually and paste it in the "Text Notes" tab\n' +
            "3. Use a different video with available captions"
        );
      }
    } catch (error: any) {
      console.error("YouTube transcript error:", error);

      // Provide user-friendly error messages
      if (error.message.includes("Invalid YouTube URL")) {
        throw new Error(
          "Invalid YouTube URL format. Please enter a valid YouTube video URL."
        );
      } else {
        throw error; // Re-throw with original message for better debugging
      }
    }
  }

  /**
   * Validate if URL is a YouTube URL
   */
  static isValidYouTubeUrl(url: string): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  }
}
