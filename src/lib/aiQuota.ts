// Token estimation and AI quota utilities

export interface AIQuota {
  user_id: string;
  credits_tokens: number;
  used_tokens: number;
  period_start: string;
  ai_enabled: boolean;
}

export interface UserSettings {
  user_id: string;
  ai_generation_enabled: boolean;
  notifications_enabled: boolean;
}

export interface AIUsageLog {
  id: number;
  user_id: string;
  provider_used: string;
  tokens_used: number;
  prompt_hash: string;
  cards_generated: number;
  cost_estimate: number;
  created_at: string;
}

// Token estimation functions
export function estimateTokens(text: string, responseRatio = 0.7): number {
  // Rule of thumb: 1 token ≈ 4 characters in English
  const inputTokens = Math.ceil(text.length / 4);
  const outputTokens = Math.ceil(inputTokens * responseRatio);
  return inputTokens + outputTokens;
}

export function estimateInputTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateOutputTokens(
  inputTokens: number,
  responseRatio = 0.7
): number {
  return Math.ceil(inputTokens * responseRatio);
}

// Cost estimation (prices per 1k tokens)
export const AI_PRICING = {
  "gpt-3.5-turbo": { input: 0.0015, output: 0.002 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4": { input: 0.03, output: 0.06 },
  "gemini-1.5-flash": { input: 0.0001, output: 0.0004 },
  "claude-3-haiku": { input: 0.00025, output: 0.00125 },
  "groq-llama3": { input: 0.0001, output: 0.0001 }, // Very cheap
  huggingface: { input: 0, output: 0 }, // Free tier
} as const;

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  provider: keyof typeof AI_PRICING = "gpt-4o-mini"
): number {
  const pricing = AI_PRICING[provider];
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return inputCost + outputCost;
}

// Quota helpers
export function getRemainingCredits(quota: AIQuota): number {
  return Math.max(0, quota.credits_tokens - quota.used_tokens);
}

export function getUsagePercentage(quota: AIQuota): number {
  return Math.min(100, (quota.used_tokens / quota.credits_tokens) * 100);
}

export function canMakeRequest(
  quota: AIQuota,
  estimatedTokens: number
): boolean {
  return getRemainingCredits(quota) >= estimatedTokens;
}

// Format helpers
export function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(2)}¢`;
  }
  return `$${cost.toFixed(3)}`;
}

// Text processing helpers
export function preprocessText(text: string, maxTokens = 6000): string {
  // Strip excessive whitespace
  let processed = text.replace(/\s+/g, " ").trim();

  // Estimate tokens and truncate if needed
  const estimatedTokens = estimateInputTokens(processed);
  if (estimatedTokens > maxTokens) {
    // Truncate to approximate token limit (rough conversion)
    const maxChars = maxTokens * 4;
    processed = processed.slice(0, maxChars) + "...";
  }

  return processed;
}

// Prompt hash for caching
export function generatePromptHash(text: string): string {
  // Simple hash function for caching duplicate requests
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Rate limiting helpers
export interface RateLimit {
  count: number;
  resetTime: number;
}

export function checkRateLimit(
  userLimits: Map<string, RateLimit>,
  userId: string,
  maxRequests = 3,
  windowMs = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const userLimit = userLimits.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    userLimits.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false; // Rate limited
  }

  userLimit.count++;
  return true;
}

// Provider selection with fallback
export function selectAIProvider(
  availableProviders: string[],
  quota: AIQuota,
  estimatedTokens: number
): string | null {
  // If user has sufficient quota, try premium providers first
  const remainingTokens = getRemainingCredits(quota);

  if (remainingTokens >= estimatedTokens) {
    // Try paid providers first (better quality)
    const premiumProviders = ["gpt-4o-mini", "gpt-3.5-turbo", "claude-3-haiku"];
    for (const provider of premiumProviders) {
      if (availableProviders.includes(provider)) {
        return provider;
      }
    }
  }

  // Fall back to free providers
  const freeProviders = ["gemini-1.5-flash", "groq-llama3", "huggingface"];
  for (const provider of freeProviders) {
    if (availableProviders.includes(provider)) {
      return provider;
    }
  }

  return null; // No suitable provider
}
