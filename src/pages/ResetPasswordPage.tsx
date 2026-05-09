import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { isPasswordStrong } from "@/lib/password";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Supabase auto-handles the recovery hash on load. Wait for the session.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && window.location.hash.includes("type=recovery"))) {
        setReady(true);
      } else if (session) {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      else if (!window.location.hash.includes("type=recovery")) {
        setError("This reset link is invalid or has expired. Request a new one.");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrong(password)) {
      toast({ title: "Weak password", description: "Please meet all requirements.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated", description: "You're now signed in." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-secondary text-foreground placeholder:text-muted-foreground px-4 py-3 rounded-xl ring-1 ring-border focus:ring-primary focus:outline-none transition-all text-sm";
  const btnPrimary = "w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm";

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="text-center flex flex-col items-center gap-6">
          <Logo size={200} />
          <h1 className="font-serif text-3xl text-foreground">Set a new password</h1>
        </div>

        {error ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-destructive text-center">{error}</p>
            <button onClick={() => navigate("/auth")} className={btnPrimary}>Back to sign in</button>
          </div>
        ) : !ready ? (
          <p className="text-toast text-sm text-center">Verifying reset link...</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              required
              autoFocus
            />
            <PasswordStrengthMeter password={password} />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              required
            />
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
