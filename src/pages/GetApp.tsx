import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isIos = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);

const GetApp = () => {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setPromptEvent(null);
      return;
    }
    setShowSteps(true);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-7">
        <Logo size={72} to="/" />

        <div className="flex flex-col gap-3">
          <h1 className="font-serif text-3xl sm:text-4xl leading-tight">
            Your meals are <span className="text-brass">waiting.</span>
          </h1>
          <p className="text-toast text-sm sm:text-base">
            Get the Maniac Lounge app to activate your pass, access your QR code, and manage your
            meals.
          </p>
        </div>

        {installed ? (
          <p className="text-brass text-sm font-semibold">
            App added. Open it from your home screen.
          </p>
        ) : (
          <button
            onClick={handleInstall}
            className="w-full bg-primary text-primary-foreground font-bold uppercase tracking-wide py-4 rounded-2xl shadow-[0_0_60px_-15px_hsl(var(--amber-glow)/0.6)] hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Install / Get the App
          </button>
        )}

        {showSteps && !promptEvent && (
          <div className="w-full bg-card ring-1 ring-border rounded-2xl p-5 text-left text-sm text-toast">
            <p className="font-semibold text-foreground mb-2">Add it in two taps:</p>
            {isIos() ? (
              <p>iPhone: Share → Add to Home Screen</p>
            ) : (
              <p>Android: Browser menu → Install App / Add to Home Screen</p>
            )}
          </div>
        )}

        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-toast text-sm">Already have the app?</p>
          <Link
            to="/app"
            className="w-full text-center bg-secondary text-foreground ring-1 ring-primary/30 font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            Open Web App
          </Link>
        </div>

        <p className="text-center text-xs text-toast pt-2">
          By continuing you agree to our{" "}
          <Link to="/terms" className="text-brass hover:underline">Terms &amp; Conditions</Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-brass hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
};

export default GetApp;
