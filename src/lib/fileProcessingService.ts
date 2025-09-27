import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js to use the static worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export interface FileProcessingResult {
  text: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export class FileProcessingService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly SUPPORTED_TYPES = [
    "text/plain",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/msword", // .doc (basic support)
  ];

  /**
   * Validate file before processing
   */
  static validateFile(file: File): void {
    if (!file) {
      throw new Error("No file selected");
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(
        `File size too large. Maximum size is ${
          this.MAX_FILE_SIZE / (1024 * 1024)
        }MB`
      );
    }

    if (!this.SUPPORTED_TYPES.includes(file.type)) {
      throw new Error(
        "Unsupported file type. Please upload PDF, DOCX, or TXT files only."
      );
    }
  }

  /**
   * Process uploaded file and extract text content
   */
  static async processFile(file: File): Promise<FileProcessingResult> {
    try {
      this.validateFile(file);

      console.log(`Processing file: ${file.name} (${file.type})`);

      let extractedText = "";

      switch (file.type) {
        case "text/plain":
          extractedText = await this.processTextFile(file);
          break;
        case "application/pdf":
          extractedText = await this.processPdfFile(file);
          break;
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          extractedText = await this.processDocxFile(file);
          break;
        default:
          throw new Error(`Unsupported file type: ${file.type}`);
      }

      if (!extractedText.trim()) {
        throw new Error("No text content could be extracted from this file");
      }

      const result: FileProcessingResult = {
        text: extractedText.trim(),
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      };

      console.log(
        `Successfully extracted ${result.text.length} characters from ${file.name}`
      );
      return result;
    } catch (error: any) {
      console.error("File processing error:", error);
      throw new Error(`${error.message}`);
    }
  }

  /**
   * Process plain text files
   */
  private static async processTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text || "");
      };

      reader.onerror = () => {
        reject(new Error("Failed to read text file"));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Process PDF files with static worker
   */
  private static async processPdfFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;

          // Load PDF with static worker configuration
          const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true,
          });

          const pdf = await loadingTask.promise;
          let fullText = "";

          // Extract text from each page
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            try {
              const page = await pdf.getPage(pageNum);
              const textContent = await page.getTextContent();

              const pageText = textContent.items
                .map((item: any) => {
                  if (typeof item === "object" && item.str) {
                    return item.str;
                  }
                  return String(item);
                })
                .join(" ");

              fullText += pageText + " ";
            } catch (pageError) {
              console.warn(`Failed to process page ${pageNum}:`, pageError);
              // Continue with other pages
            }
          }

          if (!fullText.trim()) {
            reject(
              new Error(
                "No text could be extracted from this PDF. It might be image-based or encrypted."
              )
            );
          } else {
            resolve(fullText.trim());
          }
        } catch (error: any) {
          console.error("PDF processing error:", error);

          // Provide helpful error messages
          if (error.message?.includes("Invalid PDF")) {
            reject(
              new Error(
                "Invalid or corrupted PDF file. Please try a different file."
              )
            );
          } else if (error.message?.includes("worker")) {
            reject(
              new Error(
                "PDF worker failed to load. Please try refreshing the page or use a DOCX file instead."
              )
            );
          } else {
            reject(
              new Error(`Failed to process PDF: ${error.message || error}`)
            );
          }
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read PDF file"));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Process DOCX files
   */
  private static async processDocxFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });

          if (result.messages.length > 0) {
            console.warn("DOCX processing warnings:", result.messages);
          }

          resolve(result.value);
        } catch (error) {
          reject(new Error(`Failed to process DOCX: ${error}`));
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read DOCX file"));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Get human-readable file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}
