import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase, Database } from "../lib/supabase";
import {
  ArrowLeft,
  Edit,
  Play,
  Plus,
  Trash2,
  Globe,
  Lock,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

type Deck = Database["public"]["Tables"]["decks"]["Row"];
type Flashcard = Database["public"]["Tables"]["flashcards"]["Row"];

export function DeckDetail() {
  const { deckId } = useParams<{ deckId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");
  const [newCardHint, setNewCardHint] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchDeckAndCards = useCallback(async () => {
    if (!deckId || !user?.id) return;

    try {
      // Fetch deck details
      const { data: deckData, error: deckError } = await supabase
        .from("decks")
        .select("*")
        .eq("id", deckId)
        .eq("owner", user.id)
        .single();

      if (deckError) throw deckError;
      setDeck(deckData);

      // Fetch flashcards
      const { data: cardsData, error: cardsError } = await supabase
        .from("flashcards")
        .select("*")
        .eq("deck_id", deckId)
        .order("created_at", { ascending: true });

      if (cardsError) throw cardsError;
      setFlashcards(cardsData || []);
    } catch (error: any) {
      console.error("Error fetching deck:", error);
      toast.error("Failed to load deck");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [deckId, user?.id, navigate]);

  useEffect(() => {
    fetchDeckAndCards();
  }, [fetchDeckAndCards]);

  const handleDeleteDeck = async () => {
    if (
      !deck ||
      !confirm(
        "Are you sure you want to delete this deck? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("decks")
        .delete()
        .eq("id", deck.id)
        .eq("owner", user?.id);

      if (error) throw error;

      toast.success("Deck deleted successfully");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error deleting deck:", error);
      toast.error("Failed to delete deck");
    }
  };

  const handleAddCard = async () => {
    if (!newCardFront.trim() || !newCardBack.trim()) {
      toast.error("Please fill in both front and back text");
      return;
    }

    if (!deckId) {
      toast.error("Invalid deck ID");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("flashcards")
        .insert({
          deck_id: parseInt(deckId),
          front_text: newCardFront.trim(),
          back_text: newCardBack.trim(),
          hint: newCardHint.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setFlashcards([...flashcards, data]);
      setNewCardFront("");
      setNewCardBack("");
      setNewCardHint("");
      setShowAddCardModal(false);
      toast.success("Card added successfully!");
    } catch (error: any) {
      console.error("Error adding card:", error);
      toast.error("Failed to add card");
    } finally {
      setSaving(false);
    }
  };

  const resetAddCardForm = () => {
    setNewCardFront("");
    setNewCardBack("");
    setNewCardHint("");
    setShowAddCardModal(false);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Deck not found
        </h2>
        <Link to="/dashboard" className="text-indigo-600 hover:text-indigo-500">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{deck.title}</h1>
              <div className="flex items-center text-sm text-gray-500">
                {deck.is_public ? (
                  <>
                    <Globe className="w-4 h-4 mr-1" /> Public
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-1" /> Private
                  </>
                )}
              </div>
            </div>
            {deck.description && (
              <p className="text-gray-600 mb-4">{deck.description}</p>
            )}
            {deck.tags && deck.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {deck.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {flashcards.length > 0 && (
              <Link
                to={`/study/${deck.id}`}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Play className="w-4 h-4 mr-2" />
                Study Now
              </Link>
            )}
            <button
              onClick={() => {
                /* TODO: Add edit functionality */
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleDeleteDeck}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {flashcards.length}
          </div>
          <div className="text-sm text-gray-600">Total Cards</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">0</div>
          <div className="text-sm text-gray-600">Cards Due</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">0</div>
          <div className="text-sm text-gray-600">Study Sessions</div>
        </div>
      </div>

      {/* Flashcards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Flashcards</h2>
            <button
              onClick={() => setShowAddCardModal(true)}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Card
            </button>
          </div>
        </div>

        <div className="p-6">
          {flashcards.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No cards yet
              </h3>
              <p className="text-gray-600 mb-6">
                Add your first flashcard to get started
              </p>
              <button
                onClick={() => setShowAddCardModal(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Card
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {flashcards.map((card) => (
                <div
                  key={card.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        Front
                      </div>
                      <div className="text-gray-900">
                        {card.front_text || "No content"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        Back
                      </div>
                      <div className="text-gray-900">
                        {card.back_text || "No content"}
                      </div>
                    </div>
                  </div>
                  {card.hint && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        Hint
                      </div>
                      <div className="text-gray-600 text-sm">{card.hint}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add New Card
                </h3>
                <button
                  onClick={resetAddCardForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="front-text"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Front (Question) *
                  </label>
                  <textarea
                    id="front-text"
                    value={newCardFront}
                    onChange={(e) => setNewCardFront(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter the question or front text"
                  />
                </div>

                <div>
                  <label
                    htmlFor="back-text"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Back (Answer) *
                  </label>
                  <textarea
                    id="back-text"
                    value={newCardBack}
                    onChange={(e) => setNewCardBack(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter the answer or back text"
                  />
                </div>

                <div>
                  <label
                    htmlFor="hint-text"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Hint (Optional)
                  </label>
                  <input
                    id="hint-text"
                    type="text"
                    value={newCardHint}
                    onChange={(e) => setNewCardHint(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter a hint (optional)"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={resetAddCardForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCard}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Adding..." : "Add Card"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
