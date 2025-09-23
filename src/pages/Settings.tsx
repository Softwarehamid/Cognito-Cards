import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useDarkMode } from "../hooks/useDarkMode";
import { supabase } from "../lib/supabase";
import {
  AIQuota,
  UserSettings,
  getRemainingCredits,
  getUsagePercentage,
  formatTokens,
} from "../lib/aiQuota";
import {
  User,
  Sun,
  Moon,
  Download,
  Trash2,
  Save,
  Sparkles,
  BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";

export function Settings() {
  const { user, signOut } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // AI Settings state
  const [aiSettings, setAiSettings] = useState<UserSettings | null>(null);
  const [aiQuota, setAiQuota] = useState<AIQuota | null>(null);
  const [aiSettingsLoading, setAiSettingsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchAISettings();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setDisplayName(data.display_name || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: displayName.trim(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAISettings = async () => {
    if (!user) return;

    try {
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
    }
  };

  const updateAISettings = async (enabled: boolean) => {
    if (!user) return;

    setAiSettingsLoading(true);
    try {
      // Update user settings
      const { error: settingsError } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          ai_generation_enabled: enabled,
          notifications_enabled: aiSettings?.notifications_enabled ?? true,
        });

      if (settingsError) throw settingsError;

      // Update AI quota enabled status
      const { error: quotaError } = await supabase.from("ai_quotas").upsert({
        user_id: user.id,
        ai_enabled: enabled,
        credits_tokens: aiQuota?.credits_tokens ?? 20000,
        used_tokens: aiQuota?.used_tokens ?? 0,
      });

      if (quotaError) throw quotaError;

      // Refresh data
      await fetchAISettings();

      toast.success(
        enabled ? "AI generation enabled!" : "AI generation disabled"
      );
    } catch (error: any) {
      console.error("Error updating AI settings:", error);
      toast.error("Failed to update AI settings");
    } finally {
      setAiSettingsLoading(false);
    }
  };

  const exportData = async () => {
    if (!user) return;

    try {
      toast.loading("Exporting data...", { id: "export" });

      // Fetch all user data
      const [decksRes, sessionsRes, reviewsRes] = await Promise.all([
        supabase
          .from("decks")
          .select(
            `
          *,
          flashcards(*)
        `
          )
          .eq("owner", user.id),
        supabase.from("study_sessions").select("*").eq("user_id", user.id),
        supabase.from("reviews").select("*").eq("user_id", user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          display_name: displayName,
        },
        decks: decksRes.data || [],
        study_sessions: sessionsRes.data || [],
        reviews: reviewsRes.data || [],
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cognito-cards-export-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully", { id: "export" });
    } catch (error: any) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data", { id: "export" });
    }
  };

  const deleteAccount = async () => {
    if (!user || deleteConfirm !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    const confirmed = window.confirm(
      "Are you absolutely sure? This action cannot be undone. All your decks, flashcards, and progress will be permanently deleted."
    );

    if (!confirmed) return;

    try {
      toast.loading("Deleting account...", { id: "delete" });

      // Delete all user data (cascading deletes should handle most of this)
      await supabase.from("profiles").delete().eq("id", user.id);

      // Sign out the user
      await signOut();

      toast.success("Account deleted successfully", { id: "delete" });
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account", { id: "delete" });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-6">
            <User className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Profile
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={user?.email || ""}
                disabled
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Email cannot be changed
              </p>
            </div>

            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Display Name
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your display name"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={updateProfile}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? "Updating..." : "Update Profile"}
              </button>
            </div>
          </div>
        </div>

        {/* AI Generation Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-6">
            <Sparkles className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              AI Generation
            </h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Enable AI Generation
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Allow AI-powered flashcard generation from your content
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiSettings?.ai_generation_enabled ?? false}
                  onChange={(e) => updateAISettings(e.target.checked)}
                  disabled={aiSettingsLoading}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* AI Quota Display */}
            {aiQuota && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center mb-4">
                  <BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Usage & Quota
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>Tokens Used</span>
                      <span>
                        {formatTokens(aiQuota.used_tokens)} /{" "}
                        {formatTokens(aiQuota.credits_tokens)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          getUsagePercentage(aiQuota) > 80
                            ? "bg-red-500"
                            : getUsagePercentage(aiQuota) > 60
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            getUsagePercentage(aiQuota),
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="font-medium text-gray-900">Remaining</div>
                      <div className="text-green-600">
                        {formatTokens(getRemainingCredits(aiQuota))} tokens
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        Resets
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {new Date(aiQuota.period_start).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )}{" "}
                        + 30 days
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status and Help */}
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {aiSettings?.ai_generation_enabled ? (
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  ) : (
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900">
                    {aiSettings?.ai_generation_enabled
                      ? "AI generation is enabled"
                      : "AI generation is disabled"}
                  </p>
                  <p className="text-sm text-purple-700 mt-1">
                    {aiSettings?.ai_generation_enabled
                      ? "You can generate flashcards from text, files, and URLs using AI."
                      : "Enable to unlock AI-powered flashcard generation. You start with 20,000 free tokens!"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-6">
            <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Appearance
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Dark Mode
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Switch between light and dark theme
                </p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={toggleDarkMode}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors ${
                    isDarkMode ? "bg-indigo-600" : "bg-gray-300"
                  }`}
                ></label>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <Download className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Data Management
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Export your flashcard data or delete your account
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Export all your decks, flashcards, and study progress as a JSON
                file
              </p>
              <button
                onClick={exportData}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
          <div className="flex items-center mb-6">
            <Trash2 className="w-5 h-5 text-red-600 mr-2" />
            <h2 className="text-xl font-semibold text-red-900">Danger Zone</h2>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-red-900 mb-2">Delete Account</h3>
              <p className="text-sm text-red-700 mb-4">
                Once you delete your account, there is no going back. Please be
                certain.
              </p>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="deleteConfirm"
                    className="block text-sm font-medium text-red-700 mb-1"
                  >
                    Type "DELETE" to confirm:
                  </label>
                  <input
                    type="text"
                    id="deleteConfirm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="w-full max-w-xs p-2 border border-red-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="DELETE"
                  />
                </div>

                <button
                  onClick={deleteAccount}
                  disabled={deleteConfirm !== "DELETE"}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
