import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { DarkModeProvider } from "./hooks/useDarkMode";

import { Home } from "./pages/Home";
import { AuthLayout } from "./pages/auth/AuthLayout";
import { Login } from "./pages/auth/Login";
import { SignUp } from "./pages/auth/SignUp";
import { ResetPassword } from "./pages/auth/ResetPassword";
import { UpdatePassword } from "./pages/auth/UpdatePassword";
import { ConfirmEmail } from "./pages/auth/ConfirmEmail";
import { Dashboard } from "./pages/Dashboard";
import { Study } from "./pages/Study";
import { StudySelector } from "./pages/StudySelector";
import { NewDeck } from "./pages/NewDeck";
import { DeckDetail } from "./pages/DeckDetail";
import { AiGenerate } from "./pages/AiGenerate";
import { Settings } from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <DarkModeProvider>
        <AuthProvider>
          <div className="App">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />

              {/* Auth routes */}
              <Route path="/auth" element={<AuthLayout />}>
                <Route path="login" element={<Login />} />
                <Route path="signup" element={<SignUp />} />
                <Route path="reset-password" element={<ResetPassword />} />
                <Route path="confirm" element={<ConfirmEmail />} />
              </Route>

              {/* Password reset route (outside auth layout) */}
              <Route path="/update-password" element={<UpdatePassword />} />

              {/* Protected routes */}
              <Route
                path="/dashboard/*"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="new-deck" element={<NewDeck />} />
                <Route path="deck/:deckId" element={<DeckDetail />} />
              </Route>

              <Route
                path="/study"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<StudySelector />} />
              </Route>

              <Route
                path="/study/:deckId"
                element={
                  <ProtectedRoute>
                    <Study />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/generate"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AiGenerate />} />
              </Route>

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Settings />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#363636",
                  color: "#fff",
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: "#10b981",
                    secondary: "#fff",
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: "#ef4444",
                    secondary: "#fff",
                  },
                },
              }}
            />
          </div>
        </AuthProvider>
      </DarkModeProvider>
    </BrowserRouter>
  );
}

export default App;
