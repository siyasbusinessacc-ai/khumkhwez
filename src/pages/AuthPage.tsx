import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { isPasswordStrong } from "@/lib/password";

const REF_KEY = "khumkhwez_pending_ref";

const AuthPage = () => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fromUrl = searchParams.get("ref");
    if (fromUrl) {
      setReferralCode(fromUrl.toUpperCase());
      localStorage.setItem(REF_KEY, fromUrl.toUpperCase());
      setMode("signup");
    } else {
      const stored = localStorage.getItem(REF_KEY);
      if (stored) setReferralCode(stored);
    }
  }, [searchParams]);

  const tryRedeemPendingReferral = async () => {
    const stored = localStorage.getItem(REF_KEY) || referralCode;
    if (!stored) return;
    const { data, error } = await supabase.rpc("redeem_referral_code", { _code: stored });
    if (error) {
      console.warn("Referral redeem error:", error.message);
      return;
    }
    const result = data as { ok: boolean; reason?: string } | null;
    if (result?.ok) {
      toast({ title: "Referral applied", description: "Thanks for joining via a friend!" });
    }
    localStorage.removeItem(REF_KEY);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We sent you a link to reset your password.",
        });
        setMode("login");
        return;
      }

      if (!password.trim()) return;

      if (mode === "signup") {
        if (!isPasswordStrong(password)) {
          toast({
            title: "Weak password",
            description: "Please meet all the password requirements.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        const refCode = (referralCode || localStorage.getItem(REF_KEY) || "").trim().toUpperCase();
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: refCode ? { referral_code: refCode } : undefined,
          },
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "Confirm your email — you'll be signed in automatically.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        await tryRedeemPendingReferral();
        navigate("/");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-secondary text-foreground placeholder:text-muted-foreground px-4 py-3 rounded-xl ring-1 ring-border focus:ring-primary focus:outline-none transition-all text-sm";
  const btnPrimary = "w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm";

  const ctaLabel =
    mode === "login" ? "Sign In" :
    mode === "signup" ? "Create Account" :
    "Send reset link";

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="text-center flex flex-col items-center gap-6">
          <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-foreground">
            Welcome to...
          </h1>
          <Logo size={280} className="mt-2" />

          {referralCode && mode === "signup" && (
            <div className="mt-2 px-3 py-1.5 rounded-full bg-secondary ring-1 ring-primary/40">
              <span className="text-xs text-brass tracking-wider uppercase">Referral: {referralCode}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
            autoComplete="email"
          />

          {mode !== "forgot" && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              minLength={mode === "signup" ? 8 : 6}
              required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          )}

          {mode === "signup" && password.length > 0 && (
            <PasswordStrengthMeter password={password} />
          )}

          {mode === "login" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-xs text-toast hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? "Please wait..." : ctaLabel}
          </button>

          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-toast text-sm hover:text-foreground transition-colors"
            >
              ← Back to sign in
            </button>
          )}
        </form>

        {mode !== "forgot" && (
          <p className="text-center text-sm text-toast">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-primary font-medium hover:underline"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
