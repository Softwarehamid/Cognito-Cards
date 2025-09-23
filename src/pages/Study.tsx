import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase, Database } from "../lib/supabase";
import { ArrowLeft, RotateCcw, Check, Shuffle, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type Flashcard = Database["public"]["Tables"]["flashcards"]["Row"];
type StudySession = Database["public"]["Tables"]["study_sessions"]["Row"];
type Review = Database["public"]["Tables"]["reviews"]["Row"];

interface StudyMode {
  id: "flip" | "mc" | "sr";
  name: string;
  description: string;
  icon: React.ReactNode;
}

const studyModes: StudyMode[] = [
  {
    id: "flip",
    name: "Flip Cards",
    description: "Classic flashcard experience",
    icon: <RotateCcw className="w-5 h-5" />,
  },
  {
    id: "mc",
    name: "Multiple Choice",
    description: "Test with 4 answer options",
    icon: <Check className="w-5 h-5" />,
  },
  {
    id: "sr",
    name: "Spaced Repetition",
    description: "Optimized review schedule",
    icon: <Brain className="w-5 h-5" />,
  },
];

export function Study() {
  const { deckId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"flip" | "mc" | "sr">("flip");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studySession, setStudySession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [deckTitle, setDeckTitle] = useState("");
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [mcOptions, setMcOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showMcResult, setShowMcResult] = useState(false);

  const currentCard = flashcards[currentIndex];
  const isComplete = currentIndex >= flashcards.length;

  useEffect(() => {
    if (deckId && user) {
      fetchDeckAndCards();
      createStudySession();
    }

    // Cleanup function
    return () => {
      // Reset states when component unmounts
      setShowAnswer(false);
      setSelectedAnswer(null);
      setShowMcResult(false);
    };
  }, [deckId, user]);

  useEffect(() => {
    if (mode === "mc" && currentCard && !showAnswer) {
      // Reset MC state first
      setSelectedAnswer(null);
      setShowMcResult(false);
      // Generate options with timeout to prevent rapid calls
      const timeoutId = setTimeout(() => {
        generateMcOptions();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [currentCard, mode, showAnswer, currentIndex]);

  const fetchDeckAndCards = async () => {
    try {
      // Fetch deck info
      const { data: deck, error: deckError } = await supabase
        .from("decks")
        .select("title, owner, is_public")
        .eq("id", deckId)
        .single();

      if (deckError) throw deckError;

      // Check access permissions
      if (deck.owner !== user?.id && !deck.is_public) {
        toast.error("You do not have access to this deck");
        navigate("/dashboard");
        return;
      }

      setDeckTitle(deck.title);

      // Fetch flashcards
      let query = supabase.from("flashcards").select("*").eq("deck_id", deckId);

      if (mode === "sr") {
        // For spaced repetition, prioritize due cards
        const today = new Date().toISOString().split("T")[0];

        const { data: dueReviews } = await supabase
          .from("reviews")
          .select("flashcard_id")
          .eq("user_id", user?.id)
          .lte("next_due_date", today);

        const dueCardIds = dueReviews?.map((r) => r.flashcard_id) || [];

        if (dueCardIds.length > 0) {
          query = query.in("id", dueCardIds);
        }
      }

      const { data: cards, error: cardsError } = await query;

      if (cardsError) throw cardsError;

      // Shuffle cards
      const shuffledCards = [...(cards || [])].sort(() => Math.random() - 0.5);
      setFlashcards(shuffledCards);
    } catch (error: any) {
      console.error("Error fetching deck:", error);
      toast.error("Failed to load deck");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const createStudySession = async () => {
    try {
      const { data, error } = await supabase
        .from("study_sessions")
        .insert({
          user_id: user?.id!,
          deck_id: parseInt(deckId!),
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      setStudySession(data);
    } catch (error) {
      console.error("Error creating study session:", error);
    }
  };

  const generateMcOptions = () => {
    if (!currentCard || !flashcards.length) {
      setMcOptions([]);
      return;
    }

    const correctAnswer = currentCard.back_text.trim();

    // Get other cards with different answers
    const otherCards = flashcards.filter(
      (card) =>
        card.id !== currentCard.id &&
        card.back_text.trim() !== correctAnswer &&
        card.back_text.trim() !== "" &&
        card.back_text.trim().length > 0
    );

    // Get unique distractors
    const uniqueAnswers = new Set();
    const distractors: string[] = [];

    // Add answers from other cards
    for (const card of otherCards) {
      const answer = card.back_text.trim();
      if (!uniqueAnswers.has(answer) && answer !== correctAnswer) {
        uniqueAnswers.add(answer);
        distractors.push(answer);
        if (distractors.length >= 3) break;
      }
    }

    // If we don't have enough distractors, create some based on the question type
    while (distractors.length < 3) {
      const questionText = currentCard.front_text.toLowerCase();
      let genericAnswer = "";

      if (
        questionText.includes("define") ||
        questionText.includes("definition")
      ) {
        genericAnswer = `A related concept or term`;
      } else if (
        questionText.includes("example") ||
        questionText.includes("give an example")
      ) {
        genericAnswer = `Another type of example`;
      } else if (
        questionText.includes("how") ||
        questionText.includes("process")
      ) {
        genericAnswer = `A different method or approach`;
      } else if (
        questionText.includes("when") ||
        questionText.includes("time")
      ) {
        genericAnswer = `At a different time period`;
      } else if (
        questionText.includes("where") ||
        questionText.includes("location")
      ) {
        genericAnswer = `In a different location`;
      } else if (
        questionText.includes("why") ||
        questionText.includes("reason")
      ) {
        genericAnswer = `For a different reason`;
      } else {
        // Generic fallbacks that are more natural
        const fallbacks = [
          "Not the correct answer",
          "This is incorrect",
          "Another possible option",
        ];
        genericAnswer = fallbacks[distractors.length % fallbacks.length];
      }

      // Ensure uniqueness
      let counter = 1;
      let finalAnswer = genericAnswer;
      while (uniqueAnswers.has(finalAnswer) || finalAnswer === correctAnswer) {
        finalAnswer = `${genericAnswer} (${counter})`;
        counter++;
      }

      uniqueAnswers.add(finalAnswer);
      distractors.push(finalAnswer);
    }

    // Shuffle all options
    const allOptions = [correctAnswer, ...distractors.slice(0, 3)].sort(
      () => Math.random() - 0.5
    );

    setMcOptions(allOptions);
  };

  const handleFlipCard = () => {
    setShowAnswer(!showAnswer);
  };

  const handleMcAnswer = (answer: string) => {
    if (selectedAnswer) return;

    setSelectedAnswer(answer);
    setShowMcResult(true);

    const isCorrect = answer === currentCard?.back_text;
    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
    }

    // Move to next card after a delay
    setTimeout(() => {
      handleNext(isCorrect);
    }, 1500);
  };

  const handleSrResponse = async (quality: 1 | 2 | 3) => {
    if (!currentCard || !user) return;

    try {
      // Get existing review or create new one
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", user.id)
        .eq("flashcard_id", currentCard.id)
        .order("reviewed_at", { ascending: false })
        .limit(1)
        .single();

      // SM-2 algorithm calculations
      const responseQuality = quality === 1 ? 1 : quality === 2 ? 3 : 5;
      let ease = existingReview?.ease || 2.5;
      let intervalDays = existingReview?.interval_days || 0;

      if (responseQuality >= 3) {
        if (intervalDays === 0) {
          intervalDays = 1;
        } else if (intervalDays === 1) {
          intervalDays = 6;
        } else {
          intervalDays = Math.round(intervalDays * ease);
        }
        setCorrectAnswers((prev) => prev + 1);
      } else {
        intervalDays = 1;
      }

      ease =
        ease +
        (0.1 - (5 - responseQuality) * (0.08 + (5 - responseQuality) * 0.02));
      ease = Math.max(ease, 1.3);

      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + intervalDays);

      // Save review
      await supabase.from("reviews").insert({
        user_id: user.id,
        flashcard_id: currentCard.id,
        response_quality: responseQuality,
        ease,
        interval_days: intervalDays,
        next_due_date: nextDueDate.toISOString().split("T")[0],
      });

      handleNext(responseQuality >= 3);
    } catch (error) {
      console.error("Error saving review:", error);
      handleNext(false);
    }
  };

  const handleNext = (wasCorrect?: boolean) => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setSelectedAnswer(null);
      setShowMcResult(false);
      setMcOptions([]);
    } else {
      // End study session
      if (studySession && wasCorrect !== undefined) {
        updateStudySession();
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowAnswer(false);
      setSelectedAnswer(null);
      setShowMcResult(false);
    }
  };

  const updateStudySession = async () => {
    if (studySession) {
      try {
        await supabase
          .from("study_sessions")
          .update({
            ended_at: new Date().toISOString(),
            total_reviewed: flashcards.length,
          })
          .eq("id", studySession.id);
      } catch (error) {
        console.error("Error updating study session:", error);
      }
    }
  };

  const finishSession = async () => {
    await updateStudySession();
    toast.success(
      `Study session completed! ${correctAnswers}/${flashcards.length} correct`
    );
    navigate("/dashboard");
  };

  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setShowAnswer(false);
    setSelectedAnswer(null);
    setShowMcResult(false);
    toast.success("Cards shuffled!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            No cards to study
          </h2>
          <p className="text-gray-600 mb-6">
            This deck doesn't have any flashcards yet.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Great job!</h2>
          <p className="text-gray-600 mb-2">You completed the study session</p>
          <p className="text-lg font-semibold text-green-600 mb-6">
            {correctAnswers}/{flashcards.length} correct answers
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Study Again
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1">
            <button
              onClick={() => navigate("/dashboard")}
              className="mr-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
                {deckTitle}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Card {currentIndex + 1} of {flashcards.length} •{" "}
                {correctAnswers} correct
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Study Mode Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {studyModes.map((studyMode) => (
                <button
                  key={studyMode.id}
                  onClick={() => setMode(studyMode.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    mode === studyMode.id
                      ? "bg-white dark:bg-gray-600 text-indigo-700 dark:text-indigo-300 shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  title={studyMode.description}
                >
                  {studyMode.icon}
                </button>
              ))}
            </div>

            <button
              onClick={shuffleCards}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              title="Shuffle cards"
            >
              <Shuffle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / flashcards.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Study Content */}
      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {mode === "flip" && (
              <motion.div
                key={`flip-${currentIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 min-h-[400px] cursor-pointer"
                onClick={handleFlipCard}
              >
                <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {showAnswer ? "Answer" : "Question"} • Click to flip
                    </div>
                    <div className="text-lg leading-relaxed text-gray-900 dark:text-white">
                      {showAnswer
                        ? currentCard?.back_text
                        : currentCard?.front_text}
                    </div>
                    {showAnswer && currentCard?.hint && (
                      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 italic">
                        Hint: {currentCard.hint}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {mode === "mc" && (
              <motion.div
                key={`mc-${currentIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                  <div className="text-center mb-8">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Question
                    </div>
                    <div className="text-lg leading-relaxed text-gray-900 dark:text-white mb-6">
                      {currentCard?.front_text}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {mcOptions.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500 dark:text-gray-400">
                          Generating options...
                        </div>
                        <button
                          onClick={() => generateMcOptions()}
                          className="mt-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm"
                        >
                          Refresh Options
                        </button>
                      </div>
                    ) : (
                      mcOptions.map((option, index) => {
                        let buttonClass =
                          "w-full p-4 text-left border-2 rounded-lg transition-all";

                        if (!showMcResult) {
                          buttonClass +=
                            " border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-900 dark:text-white";
                        } else {
                          if (option === currentCard?.back_text?.trim()) {
                            buttonClass +=
                              " border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100";
                          } else if (option === selectedAnswer) {
                            buttonClass +=
                              " border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100";
                          } else {
                            buttonClass +=
                              " border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400";
                          }
                        }

                        return (
                          <button
                            key={`${currentCard?.id}-${index}`}
                            onClick={() => handleMcAnswer(option)}
                            disabled={showMcResult}
                            className={buttonClass}
                          >
                            <div className="flex items-center">
                              <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center mr-3 text-xs font-semibold">
                                {String.fromCharCode(65 + index)}
                              </span>
                              {option}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {mode === "sr" && (
              <motion.div
                key={`sr-${currentIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 min-h-[400px] cursor-pointer">
                  <div
                    className="p-8 flex flex-col items-center justify-center min-h-[300px]"
                    onClick={handleFlipCard}
                  >
                    <div className="text-center mb-8">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {showAnswer ? "Answer" : "Question"} • Click to flip
                      </div>
                      <div className="text-lg leading-relaxed text-gray-900 dark:text-white">
                        {showAnswer
                          ? currentCard?.back_text
                          : currentCard?.front_text}
                      </div>
                      {showAnswer && currentCard?.hint && (
                        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 italic">
                          Hint: {currentCard.hint}
                        </div>
                      )}
                    </div>
                  </div>

                  {showAnswer && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                      <div className="text-center mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          How well did you know this?
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                        <button
                          onClick={() => handleSrResponse(1)}
                          className="flex-1 sm:max-w-32 px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                        >
                          Hard
                        </button>
                        <button
                          onClick={() => handleSrResponse(2)}
                          className="flex-1 sm:max-w-32 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/30 transition-colors"
                        >
                          Medium
                        </button>
                        <button
                          onClick={() => handleSrResponse(3)}
                          className="flex-1 sm:max-w-32 px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
                        >
                          Easy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Controls - Only for flip mode */}
          {mode === "flip" && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Use arrow keys or swipe to navigate
              </div>
              <button
                onClick={() => handleNext()}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
