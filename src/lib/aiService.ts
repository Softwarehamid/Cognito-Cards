interface GeneratedCard {
  front_text: string;
  back_text: string;
  hint: string;
  tags: string[];
  distractors: string[];
}

interface AIProvider {
  name: string;
  generateCards: (content: string) => Promise<GeneratedCard[]>;
  isConfigured: () => boolean;
}

class OpenAIProvider implements AIProvider {
  name = "OpenAI GPT";

  isConfigured(): boolean {
    return (
      !!import.meta.env.VITE_OPENAI_API_KEY &&
      import.meta.env.VITE_OPENAI_API_KEY !== "your_openai_api_key_here"
    );
  }

  async generateCards(content: string): Promise<GeneratedCard[]> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a flashcard generator. Create educational flashcards from the provided content. 
            Return exactly 5-10 flashcards as a JSON array. Each flashcard should have:
            - front_text: The question or prompt
            - back_text: The answer or explanation  
            - hint: A helpful hint (optional)
            - tags: Array of relevant tags
            - distractors: Array of 3 incorrect but plausible answers for multiple choice
            
            Focus on key concepts, definitions, and important facts.`,
          },
          {
            role: "user",
            content: `Create flashcards from this content:\n\n${content}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content_text = data.choices[0]?.message?.content;

    if (!content_text) {
      throw new Error("No content generated");
    }

    try {
      return JSON.parse(content_text);
    } catch (error) {
      throw new Error("Failed to parse generated cards");
    }
  }
}

class GoogleGeminiProvider implements AIProvider {
  name = "Google Gemini";

  isConfigured(): boolean {
    return (
      !!import.meta.env.VITE_GOOGLE_API_KEY &&
      import.meta.env.VITE_GOOGLE_API_KEY !== "your_google_gemini_api_key_here"
    );
  }

  async generateCards(content: string): Promise<GeneratedCard[]> {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Create 5-10 educational flashcards from this content. Return as JSON array with format:
            [{"front_text": "question", "back_text": "answer", "hint": "optional hint", "tags": ["tag1", "tag2"], "distractors": ["wrong1", "wrong2", "wrong3"]}]
            
            Content: ${content}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content_text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content_text) {
      throw new Error("No content generated");
    }

    try {
      // Extract JSON from the response (Gemini sometimes wraps it in markdown)
      const jsonMatch = content_text.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : content_text;
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error("Failed to parse generated cards");
    }
  }
}

class AnthropicProvider implements AIProvider {
  name = "Anthropic Claude";

  isConfigured(): boolean {
    return (
      !!import.meta.env.VITE_ANTHROPIC_API_KEY &&
      import.meta.env.VITE_ANTHROPIC_API_KEY !==
        "your_anthropic_claude_api_key_here"
    );
  }

  async generateCards(content: string): Promise<GeneratedCard[]> {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `Create 5-10 educational flashcards from this content. Return as a valid JSON array only, no other text:
            [{"front_text": "question", "back_text": "answer", "hint": "optional hint", "tags": ["tag1", "tag2"], "distractors": ["wrong1", "wrong2", "wrong3"]}]
            
            Content: ${content}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content_text = data.content?.[0]?.text;

    if (!content_text) {
      throw new Error("No content generated");
    }

    try {
      return JSON.parse(content_text);
    } catch (error) {
      throw new Error("Failed to parse generated cards");
    }
  }
}

class HuggingFaceProvider implements AIProvider {
  name = "Hugging Face";

  isConfigured(): boolean {
    return (
      !!import.meta.env.VITE_HUGGINGFACE_API_KEY &&
      import.meta.env.VITE_HUGGINGFACE_API_KEY !==
        "your_huggingface_api_key_here"
    );
  }

  async generateCards(content: string): Promise<GeneratedCard[]> {
    const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;

    const response = await fetch(
      "https://api-inference.huggingface.co/models/microsoft/DialoGPT-large",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `Create flashcards from: ${content}. Format as JSON: [{"front_text": "question", "back_text": "answer", "hint": "", "tags": [], "distractors": []}]`,
          parameters: {
            max_new_tokens: 1000,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    // HuggingFace returns different format, we'll create simpler cards
    // For now, let's create some basic cards from the content
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);
    const cards: GeneratedCard[] = sentences.slice(0, 5).map((sentence) => ({
      front_text: `What is discussed in this statement: "${sentence.slice(
        0,
        50
      )}..."?`,
      back_text: sentence.trim(),
      hint: "Think about the key concept mentioned",
      tags: ["generated", "huggingface"],
      distractors: [
        "Incorrect option A",
        "Incorrect option B",
        "Incorrect option C",
      ],
    }));

    return cards;
  }
}

class GroqProvider implements AIProvider {
  name = "Groq";

  isConfigured(): boolean {
    return (
      !!import.meta.env.VITE_GROQ_API_KEY &&
      import.meta.env.VITE_GROQ_API_KEY !== "your_groq_api_key_here"
    );
  }

  async generateCards(content: string): Promise<GeneratedCard[]> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content: `Create educational flashcards from content. Return valid JSON array only:
            [{"front_text": "question", "back_text": "answer", "hint": "optional hint", "tags": ["tag1"], "distractors": ["wrong1", "wrong2", "wrong3"]}]`,
            },
            {
              role: "user",
              content: `Create 5-10 flashcards from: ${content}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content_text = data.choices[0]?.message?.content;

    if (!content_text) {
      throw new Error("No content generated");
    }

    try {
      return JSON.parse(content_text);
    } catch (error) {
      throw new Error("Failed to parse generated cards");
    }
  }
}

class AIServiceManager {
  private providers: AIProvider[] = [
    new OpenAIProvider(),
    new GoogleGeminiProvider(),
    new AnthropicProvider(),
    new GroqProvider(),
    new HuggingFaceProvider(),
  ];

  getAvailableProviders(): AIProvider[] {
    return this.providers.filter((provider) => provider.isConfigured());
  }

  async generateCards(
    content: string
  ): Promise<{ cards: GeneratedCard[]; provider: string }> {
    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error(
        "No AI providers configured. Please add at least one API key."
      );
    }

    let lastError: Error | null = null;

    for (const provider of availableProviders) {
      try {
        console.log(`Trying ${provider.name}...`);
        const cards = await provider.generateCards(content);
        console.log(`Success with ${provider.name}!`);
        return { cards, provider: provider.name };
      } catch (error) {
        console.warn(`${provider.name} failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    throw lastError || new Error("All AI providers failed");
  }
}

export const aiService = new AIServiceManager();
export type { GeneratedCard };
