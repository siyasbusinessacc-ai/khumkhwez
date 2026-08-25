import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import GetApp from "./pages/GetApp";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import KitchenDashboard from "./pages/KitchenDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ReferralPage from "./pages/ReferralPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const isRecoveryHash = () =>
  typeof window !== "undefined" &&
  (window.location.hash.includes("type=recovery") ||
    new URLSearchParams(window.location.search).get("type") === "recovery");

// Global guard: if Supabase drops us anywhere with a recovery hash,
// force navigation to /reset-password so the user sees the reset form.
const RecoveryRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (isRecoveryHash() && location.pathname !== "/reset-password") {
      navigate("/reset-password" + window.location.search + window.location.hash, { replace: true });
    }
  }, [location.pathname, navigate]);
  return null;
};

const Loader = () => (
  <div className="min-h-dvh bg-background flex items-center justify-center">
    <p className="text-toast">Loading...</p>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (isRecoveryHash()) return <Navigate to="/reset-password" replace />;
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/app" replace />;
  return <>{children}</>;
};

// /app — the actual student application: auth screen when logged out, dashboard when logged in.
const AppRoute = () => {
  const { user, loading } = useAuth();
  if (isRecoveryHash()) return <Navigate to="/reset-password" replace />;
  if (loading) return <Loader />;
  return user ? <Index /> : <AuthPage />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RecoveryRedirect />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/get-app" element={<GetApp />} />
            <Route path="/app" element={<AppRoute />} />
            <Route path="/auth" element={<Navigate to="/app" replace />} />
            <Route path="/auth/callback" element={<AppRoute />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/kitchen" element={<ProtectedRoute><KitchenDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/refer" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
