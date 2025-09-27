import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { aiService, GeneratedCard } from "../lib/aiService";
import {
  AIQuota,
  UserSettings,
  getRemainingCredits,
  estimateTokens,
  formatTokens,
  preprocessText,
} from "../lib/aiQuota";
import { YouTubeService } from "../lib/youtubeService";
import { FileProcessingService } from "../lib/fileProcessingService";
import {
  FileText,
  Youtube,
  Upload,
  Sparkles,
  ArrowRight,
  Loader2,
  Check,
  X,
  Plus,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";

interface TabProps {
  id: string;
  name: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

function Tab({ name, icon, isActive, onClick }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700"
          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
      }`}
    >
      {icon}
      <span className="ml-2">{name}</span>
    </button>
  );
}

export function AiGenerate() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("text");
  const [textContent, setTextContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [deckTitle, setDeckTitle] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [deckTags, setDeckTags] = useState<string[]>([]);

  // AI Settings and Quota
  const [aiSettings, setAiSettings] = useState<UserSettings | null>(null);
  const [aiQuota, setAiQuota] = useState<AIQuota | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [isProcessingYouTube, setIsProcessingYouTube] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const tabs = [
    { id: "text", name: "Text Notes", icon: <FileText className="w-4 h-4" /> },
    { id: "youtube", name: "YouTube", icon: <Youtube className="w-4 h-4" /> },
    { id: "upload", name: "Upload File", icon: <Upload className="w-4 h-4" /> },
  ];

  // Fetch AI settings on component mount
  useEffect(() => {
    if (user) {
      fetchAISettings();
    }
  }, [user]);

  const fetchAISettings = async () => {
    if (!user) return;

    try {
      setSettingsLoading(true);

      // Fetch user settings
      const { data: settings, error: settingsError } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (settingsError && settingsError.code !== "PGRST116") {
        console.error("Error fetching AI settings:", settingsError);
      } else if (settings) {
        setAiSettings(settings);
      }

      // Fetch AI quota
      const { data: quota, error: quotaError } = await supabase
        .from("ai_quotas")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (quotaError && quotaError.code !== "PGRST116") {
        console.error("Error fetching AI quota:", quotaError);
      } else if (quota) {
        setAiQuota(quota);
      }
    } catch (error) {
      console.error("Error fetching AI settings:", error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const updateQuotaUsage = async (
    tokensUsed: number,
    provider: string,
    cardsGenerated: number
  ) => {
    if (!user) return;

    try {
      // Update quota usage
      const { error: quotaError } = await supabase
        .from("ai_quotas")
        .update({
          used_tokens: (aiQuota?.used_tokens || 0) + tokensUsed,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (quotaError) {
        console.error("Error updating quota:", quotaError);
      }

      // Log usage for tracking
      const { error: logError } = await supabase.from("ai_usage_log").insert({
        user_id: user.id,
        provider_used: provider,
        tokens_used: tokensUsed,
        cards_generated: cardsGenerated,
        cost_estimate: tokensUsed * 0.000002, // Rough estimate
      });

      if (logError) {
        console.error("Error logging usage:", logError);
      }

      // Refresh the quota data
      await fetchAISettings();

      toast.success(`Used ${formatTokens(tokensUsed)} tokens via ${provider}`);
    } catch (error) {
      console.error("Error updating quota usage:", error);
    }
  };

  const generateCards = async () => {
    // Check if AI is enabled for this user
    if (!aiSettings?.ai_generation_enabled) {
      toast.error(
        "AI generation is disabled. Enable it in Settings to continue."
      );
      return;
    }

    // Check quota
    if (!aiQuota) {
      toast.error("Unable to check AI quota. Please try refreshing the page.");
      return;
    }

    // Check if any AI provider is configured
    const availableProviders = aiService.getAvailableProviders();
    if (availableProviders.length === 0) {
      toast.error(
        "No AI providers configured. Please add at least one API key in your .env.local file."
      );
      return;
    }

    let content = "";

    switch (activeTab) {
      case "text":
        content = textContent.trim();
        break;
      case "youtube":
        if (!youtubeUrl.trim()) {
          toast.error("Please enter a YouTube URL");
          return;
        }

        if (!YouTubeService.isValidYouTubeUrl(youtubeUrl)) {
          toast.error("Please enter a valid YouTube URL");
          return;
        }

        try {
          setIsProcessingYouTube(true);
          toast.loading("Extracting transcript from YouTube video...");
          content = await YouTubeService.getTranscript(youtubeUrl);
          toast.dismiss();
          toast.success("Transcript extracted successfully!");
        } catch (error: any) {
          toast.dismiss();
          toast.error(error.message);
          return;
        } finally {
          setIsProcessingYouTube(false);
        }
        break;
      case "upload":
        if (!uploadedFile) {
          toast.error("Please upload a file");
          return;
        }

        try {
          setIsProcessingFile(true);
          toast.loading("Processing uploaded file...");
          const result = await FileProcessingService.processFile(uploadedFile);
          content = result.text;
          toast.dismiss();
          toast.success(
            `File processed successfully! Extracted ${result.text.length} characters.`
          );
        } catch (error: any) {
          toast.dismiss();
          toast.error(error.message);
          return;
        } finally {
          setIsProcessingFile(false);
        }
        break;
      default:
        toast.error("Please select a source");
        return;
    }

    if (!content) {
      toast.error("Please provide content to generate flashcards from");
      return;
    }

    // Preprocess and estimate tokens
    const processedContent = preprocessText(content, 6000); // Cap at 6k tokens
    const estimatedTokens = estimateTokens(processedContent);
    const remainingCredits = getRemainingCredits(aiQuota);

    // Check if user has enough credits
    if (remainingCredits < estimatedTokens) {
      toast.error(
        `Not enough credits. Need ${formatTokens(
          estimatedTokens
        )} tokens, but only ${formatTokens(remainingCredits)} remaining.`
      );
      return;
    }

    // Show estimation to user
    toast(`Estimated usage: ${formatTokens(estimatedTokens)} tokens`, {
      duration: 3000,
    });

    setIsGenerating(true);

    try {
      // Show which providers are available
      const availableProviders = aiService.getAvailableProviders();
      toast(
        `Trying AI providers: ${availableProviders
          .map((p) => p.name)
          .join(", ")}`,
        { duration: 3000 }
      );

      // Use the AI service manager with fallback
      const { cards, provider } = await aiService.generateCards(
        processedContent
      );

      if (!Array.isArray(cards) || cards.length === 0) {
        throw new Error("No cards generated");
      }

      // Record actual token usage in database
      const actualTokensUsed = estimatedTokens; // Use our estimation for now
      await updateQuotaUsage(actualTokensUsed, provider, cards.length);

      setGeneratedCards(cards);
      setSelectedCards(new Set(cards.map((_, index) => index)));

      // Auto-generate deck info
      const topics = [...new Set(cards.flatMap((card) => card.tags))];
      setDeckTitle(`AI Generated - ${topics.slice(0, 2).join(" & ")}`);
      setDeckDescription(
        `Flashcards generated by ${provider} from your content covering ${topics.join(
          ", "
        )}`
      );
      setDeckTags(topics.slice(0, 5));

      toast.success(`Generated ${cards.length} flashcards using ${provider}!`);
    } catch (error: any) {
      console.error("Error generating cards:", error);
      toast.error(error.message || "Failed to generate flashcards");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToDeck = async () => {
    if (!user) {
      toast.error("Please sign in to save flashcards");
      return;
    }

    if (selectedCards.size === 0) {
      toast.error("Please select at least one flashcard to save");
      return;
    }

    if (!deckTitle.trim()) {
      toast.error("Please enter a deck title");
      return;
    }

    try {
      // Create the deck
      const { data: deck, error: deckError } = await supabase
        .from("decks")
        .insert({
          owner: user.id,
          title: deckTitle.trim(),
          description: deckDescription.trim(),
          tags: deckTags,
          is_public: false,
        })
        .select()
        .single();

      if (deckError) throw deckError;

      // Create the flashcards
      const selectedCardData = Array.from(selectedCards).map((index) => {
        const card = generatedCards[index];
        return {
          deck_id: deck.id,
          front_text: card.front_text,
          back_text: card.back_text,
          hint: card.hint || "",
        };
      });

      const { error: cardsError } = await supabase
        .from("flashcards")
        .insert(selectedCardData);

      if (cardsError) throw cardsError;

      toast.success(`Saved ${selectedCards.size} flashcards to "${deckTitle}"`);
      navigate(`/dashboard/deck/${deck.id}`);
    } catch (error: any) {
      console.error("Error saving deck:", error);
      toast.error("Failed to save flashcards");
    }
  };

  const toggleCardSelection = (index: number) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedCards(newSelected);
  };

  const selectAll = () => {
    setSelectedCards(new Set(generatedCards.map((_, index) => index)));
  };

  const selectNone = () => {
    setSelectedCards(new Set());
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400 mr-3" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              AI Generate Cards
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Transform your content into smart flashcards
            </p>
          </div>
        </div>
      </div>

      {/* AI Disabled Warning */}
      {!settingsLoading && !aiSettings?.ai_generation_enabled && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <Settings className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  AI Generation is Disabled
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Enable AI generation in your settings to create flashcards
                  automatically. You can still add cards manually to your decks.
                </p>
                <div className="mt-3">
                  <Link
                    to="/settings"
                    className="inline-flex items-center text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md hover:bg-yellow-200 transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Go to Settings
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Low Credits Warning */}
      {!settingsLoading &&
        aiSettings?.ai_generation_enabled &&
        aiQuota &&
        getRemainingCredits(aiQuota) < 1000 && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start">
                <Sparkles className="w-5 h-5 text-orange-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-orange-800">
                    Low AI Credits
                  </h3>
                  <p className="text-sm text-orange-700 mt-1">
                    You have {formatTokens(getRemainingCredits(aiQuota))} tokens
                    remaining. Credits reset monthly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      <div className="max-w-4xl mx-auto">
        {/* Source Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" />
            Choose Your Source
          </h2>

          {/* Tab Navigation */}
          <div className="flex space-x-2 mb-6">
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                {...tab}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {activeTab === "text" && (
              <div>
                <label
                  htmlFor="textContent"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Paste your notes or text content
                </label>
                <textarea
                  id="textContent"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste your study notes, lecture content, or any text you want to convert into flashcards..."
                  className="w-full h-40 p-4 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Tip: Include key concepts, definitions, and important facts
                  for best results
                </p>
              </div>
            )}

            {activeTab === "youtube" && (
              <div>
                <label
                  htmlFor="youtubeUrl"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  YouTube Video URL
                </label>
                <input
                  type="url"
                  id="youtubeUrl"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  We'll extract the transcript and generate flashcards from the
                  video content.
                  <br />
                  <span className="font-medium">Note:</span> The video must have
                  captions/subtitles enabled.
                </p>
              </div>
            )}

            {activeTab === "upload" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload File (PDF, TXT, DOCX)
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors dark:bg-gray-800">
                  <input
                    type="file"
                    accept=".pdf,.txt,.docx"
                    onChange={(e) =>
                      setUploadedFile(e.target.files?.[0] || null)
                    }
                    className="hidden"
                    id="fileUpload"
                  />
                  <label htmlFor="fileUpload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      {uploadedFile
                        ? uploadedFile.name
                        : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      PDF, TXT, or DOCX files up to 10MB
                    </p>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* AI Providers Status */}
          <div className="mt-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Available AI Providers:
            </div>
            <div className="flex flex-wrap gap-2">
              {aiService.getAvailableProviders().length > 0 ? (
                aiService.getAvailableProviders().map((provider) => (
                  <span
                    key={provider.name}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                  >
                    ✓ {provider.name}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                  ✗ No AI providers configured
                </span>
              )}
            </div>
            {aiService.getAvailableProviders().length === 0 && (
              <p className="text-xs text-gray-600 mt-2">
                Add API keys to your .env.local file to enable AI generation
              </p>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={generateCards}
              disabled={
                isGenerating ||
                isProcessingYouTube ||
                isProcessingFile ||
                !aiSettings?.ai_generation_enabled ||
                (aiQuota ? getRemainingCredits(aiQuota) < 100 : true)
              }
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Cards...
                </>
              ) : isProcessingYouTube ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting Transcript...
                </>
              ) : isProcessingFile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing File...
                </>
              ) : !aiSettings?.ai_generation_enabled ? (
                <>
                  <Settings className="w-4 h-4 mr-2" />
                  AI Disabled
                </>
              ) : aiQuota && getRemainingCredits(aiQuota) < 100 ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Insufficient Credits
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Cards
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated Cards Preview */}
        {generatedCards.length > 0 && (
          <>
            {/* Deck Configuration */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Deck Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="deckTitle"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Deck Title *
                  </label>
                  <input
                    type="text"
                    id="deckTitle"
                    value={deckTitle}
                    onChange={(e) => setDeckTitle(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    placeholder="Enter deck title"
                  />
                </div>

                <div>
                  <label
                    htmlFor="deckDescription"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Description
                  </label>
                  <input
                    type="text"
                    id="deckDescription"
                    value={deckDescription}
                    onChange={(e) => setDeckDescription(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    placeholder="Brief description"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {deckTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700"
                    >
                      {tag}
                      <button
                        onClick={() =>
                          setDeckTags((prev) =>
                            prev.filter((_, i) => i !== index)
                          )
                        }
                        className="ml-2 text-indigo-500 hover:text-indigo-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => {
                      const newTag = prompt("Enter a new tag:");
                      if (newTag && !deckTags.includes(newTag.trim())) {
                        setDeckTags((prev) => [...prev, newTag.trim()]);
                      }
                    }}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 dark:bg-gray-700"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Tag
                  </button>
                </div>
              </div>
            </div>

            {/* Cards Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Generated Cards ({generatedCards.length})
                </h2>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {selectedCards.size} of {generatedCards.length} selected
                  </span>
                  <button
                    onClick={selectAll}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                  >
                    Select All
                  </button>
                  <button
                    onClick={selectNone}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    Select None
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {generatedCards.map((card, index) => (
                  <div
                    key={index}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedCards.has(index)
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => toggleCardSelection(index)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                              selectedCards.has(index)
                                ? "border-indigo-500 bg-indigo-500"
                                : "border-gray-300"
                            }`}
                          >
                            {selectedCards.has(index) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            QUESTION
                          </span>
                        </div>
                        <p className="text-gray-900 dark:text-white text-sm font-medium mb-3">
                          {card.front_text}
                        </p>

                        <div className="mb-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            ANSWER
                          </span>
                          <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">
                            {card.back_text}
                          </p>
                        </div>

                        {card.hint && (
                          <div className="mb-3">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              HINT
                            </span>
                            <p className="text-gray-600 dark:text-gray-400 text-sm italic mt-1">
                              {card.hint}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {card.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={saveToDeck}
                  disabled={selectedCards.size === 0}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Save {selectedCards.size} Cards to Deck
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
