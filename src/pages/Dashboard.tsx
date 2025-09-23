import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase, Database } from "../lib/supabase";
import {
  Plus,
  Search,
  BookOpen,
  Users,
  Target,
  TrendingUp,
  Edit,
  Play,
  Lock,
  Globe,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

type Deck = Database["public"]["Tables"]["decks"]["Row"] & {
  flashcard_count?: number;
  due_count?: number;
};

export function Dashboard() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalDecks: 0,
    totalCards: 0,
    todayReviews: 0,
    dueCards: 0,
    studyStreak: 1,
  });

  const allTags = [...new Set(decks.flatMap((deck) => deck.tags))].filter(
    Boolean
  );

  const filteredDecks = decks.filter((deck) => {
    const matchesSearch =
      deck.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deck.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => deck.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  const fetchDecks = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("decks")
        .select(
          `
          *,
          flashcards(count)
        `
        )
        .eq("owner", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Get today's date for due card calculation
      const today = new Date().toISOString().split("T")[0];

      // Get all due reviews for this user
      const { data: dueReviews } = await supabase
        .from("reviews")
        .select(
          `
          flashcard_id,
          flashcards!inner(deck_id)
        `
        )
        .eq("user_id", user.id)
        .lte("next_due_date", today);

      // Group due cards by deck
      const dueCardsByDeck = (dueReviews || []).reduce(
        (acc: Record<string, number>, review: any) => {
          const deckId = review.flashcards?.deck_id;
          if (deckId) {
            acc[deckId] = (acc[deckId] || 0) + 1;
          }
          return acc;
        },
        {}
      );

      const decksWithCount = (data || []).map((deck) => ({
        ...deck,
        flashcard_count: deck.flashcards?.[0]?.count || 0,
        due_count: dueCardsByDeck[deck.id] || 0,
      }));

      setDecks(decksWithCount);
    } catch (error: any) {
      console.error("Error fetching decks:", error);
      toast.error("Failed to load decks");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get total decks and cards
      const { data: deckData } = await supabase
        .from("decks")
        .select("id, flashcards(count)")
        .eq("owner", user.id);

      const totalDecks = deckData?.length || 0;
      const totalCards =
        deckData?.reduce(
          (sum, deck) => sum + (deck.flashcards?.[0]?.count || 0),
          0
        ) || 0;

      // Get today's reviews
      const today = new Date().toISOString().split("T")[0];
      const { data: reviewData } = await supabase
        .from("reviews")
        .select("id")
        .eq("user_id", user.id)
        .gte("reviewed_at", `${today}T00:00:00`)
        .lt("reviewed_at", `${today}T23:59:59`);

      const todayReviews = reviewData?.length || 0;

      // Get due cards count
      const { data: dueReviews } = await supabase
        .from("reviews")
        .select("id")
        .eq("user_id", user.id)
        .lte("next_due_date", today);

      const dueCards = dueReviews?.length || 0;

      setStats({
        totalDecks,
        totalCards,
        todayReviews,
        dueCards,
        studyStreak: 1, // Simplified for now
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDecks();
    fetchStats();
  }, [fetchDecks, fetchStats]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (loading) {
    return (
      <div className="p-8 bg-white dark:bg-gray-900 min-h-screen">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your flashcard decks and track your progress
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/generate"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            AI Generate
          </Link>
          <Link
            to="/dashboard/new-deck"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Deck
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Decks
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalDecks}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Cards
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalCards}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Today's Reviews
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.todayReviews}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cards Due
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.dueCards}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* My Decks Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              My Decks
            </h2>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search decks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 text-xs rounded-full border ${
                      selectedTags.includes(tag)
                        ? "bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300"
                        : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    } transition-colors`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {filteredDecks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {decks.length === 0 ? "No decks yet" : "No decks found"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {decks.length === 0
                  ? "Create your first deck to get started with flashcard learning, or use AI to generate one automatically!"
                  : "Try adjusting your search or filter criteria"}
              </p>
              {decks.length === 0 && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/dashboard/new-deck"
                    className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Deck
                  </Link>
                  <Link
                    to="/generate"
                    className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate with AI
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDecks.map((deck) => (
                <div
                  key={deck.id}
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate flex-1">
                      {deck.title}
                    </h3>
                    <div className="ml-2 flex items-center">
                      {deck.is_public ? (
                        <Globe className="w-4 h-4 text-green-600" />
                      ) : (
                        <Lock className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {deck.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {deck.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-4">
                    {deck.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {deck.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                        +{deck.tags.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>{deck.flashcard_count} cards</span>
                      {deck.due_count !== undefined && deck.due_count > 0 && (
                        <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
                          {deck.due_count} due
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link
                        to={`/study/${deck.id}`}
                        className="inline-flex items-center px-3 py-1.5 text-sm bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Study
                      </Link>
                      <Link
                        to={`/dashboard/deck/${deck.id}`}
                        className="inline-flex items-center px-3 py-1.5 text-sm bg-indigo-600 dark:bg-indigo-700 text-white rounded hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
