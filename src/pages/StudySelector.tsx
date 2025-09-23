import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase, Database } from "../lib/supabase";
import { BookOpen, Play, Clock, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";

type Deck = Database["public"]["Tables"]["decks"]["Row"] & {
  flashcard_count?: number;
  due_cards?: number;
};

export function StudySelector() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

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

      const decksWithStats =
        data?.map((deck) => ({
          ...deck,
          flashcard_count: deck.flashcards?.[0]?.count || 0,
          due_cards: Math.floor(Math.random() * 10), // Placeholder - you'd calculate actual due cards
        })) || [];

      setDecks(decksWithStats);
    } catch (error: any) {
      console.error("Error fetching decks:", error);
      toast.error("Failed to load decks");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-48 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Study Decks</h1>
        <p className="text-gray-600 mt-1">Choose a deck to start studying</p>
      </div>

      {decks.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No decks yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first deck to start studying
          </p>
          <Link
            to="/dashboard/new-deck"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Create Your First Deck
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {deck.title}
                  </h3>
                  {deck.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {deck.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center">
                  <BookOpen className="w-4 h-4 mr-1" />
                  {deck.flashcard_count} cards
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {deck.due_cards || 0} due
                </div>
              </div>

              {deck.tags && deck.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {deck.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {deck.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{deck.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Link
                  to={`/study/${deck.id}`}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Study Now
                </Link>
                <Link
                  to={`/dashboard/deck/${deck.id}`}
                  className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
