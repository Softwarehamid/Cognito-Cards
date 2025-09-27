import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function ConfirmEmail() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        // Get the code from URL params
        const code = searchParams.get("code");
        if (!code) {
          window.location.replace("/auth/login?error=no_confirmation_code");
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Email confirmation error:", error);
          window.location.replace("/auth/login?error=confirmation_failed");
        } else {
          window.location.replace("/dashboard");
        }
      } catch (err) {
        console.error("Confirmation error:", err);
        window.location.replace("/auth/login?error=confirmation_failed");
      }
    })();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Confirming your email...</p>
      </div>
    </div>
  );
}
