import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import mealChicken from "@/assets/meal-chicken-pap.jpg";
import mealBoerewors from "@/assets/meal-boerewors.jpg";
import mealSpecial from "@/assets/meal-chefs-special.jpg";

const MEALS = [
  {
    img: mealChicken,
    title: "The Flame-Grilled Quarter Chicken & Pap",
    body: "Juicy quarter chicken leg or breast, flame-grilled to a smoky char, served with steaming hot pap, spicy chakalaka and a generous ladle of gravy.",
  },
  {
    img: mealBoerewors,
    title: "The Boerewors Feast & Sides",
    body: "Thick, coarsely spiced South African boerewors off the grill with savoury pap, tangy tomato relish and a fresh crunchy salad on the side.",
  },
  {
    img: mealSpecial,
    title: "The Daily Chef's Special",
    body: "Rotating hearty stews, roasts and home-cooked comfort meals — slow-cooked, heavy on the portions, built to keep you full all day.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Lock in your plan",
    body: "Select the Weekday VIP, Weekend Relax or Full Lounge Pass and secure one of the capped intake spots.",
  },
  {
    n: "02",
    title: "Choose your style",
    body: "Fetch it hot from 34 Beit Street, New Doornfontein, Johannesburg, or get it delivered straight to your door or res.",
  },
  {
    n: "03",
    title: "Flash your QR code",
    body: "Show your permanent QR pass at pickup or delivery, get verified in a second, and eat like a boss.",
  },
];

const PLANS = [
  {
    name: "Weekday VIP Pass",
    price: "R700",
    period: "/ month",
    features: ["Every single weekday (Monday to Friday)", "Choice of Pickup or Res Delivery", "Heavy portions, cooked fresh daily"],
    badge: "Few Spots Left",
    cta: "Claim Weekday Pass",
    featured: false,
  },
  {
    name: "Full Lounge Pass",
    price: "R1000",
    period: "/ month",
    features: ["Complete 30-day coverage (Weekdays + Weekends)", "Priority kitchen fulfillment", "Pickup or delivery, every single day"],
    badge: "Selling Fast",
    tag: "Most Popular · Best Value",
    cta: "Lock In Full Access (R1000)",
    featured: true,
  },
  {
    name: "Weekend Relax Pass",
    price: "R350",
    period: "/ month",
    features: ["Friday, Saturday and Sunday coverage", "Perfect for weekend cravings", "Zero cooking, zero cleaning"],
    cta: "Claim Weekend Pass",
    featured: false,
  },
];

const Landing = () => {
  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Announcement bar */}
      <div className="bg-destructive/90 border-b border-primary/40 overflow-hidden">
        <p className="animate-pulse text-center text-[11px] sm:text-sm font-semibold tracking-wide text-destructive-foreground px-4 py-2.5">
          <span className="text-brass">⚡ FIRST INTAKE CAPPED AT 50 SPOTS PER PLAN</span> — Kitchen Capacity Limited. Once filled, doors close until next month!
        </p>
      </div>

      {/* Nav */}
      <header className="flex items-center justify-between px-5 sm:px-8 py-4 max-w-6xl mx-auto">
        <Logo size={44} to="/" />
        <div className="flex items-center gap-4">
          <Link
            to="/app"
            className="text-sm font-medium text-toast hover:text-brass transition-colors"
          >
            Login
          </Link>
          <Link
            to="/get-app"
            className="text-sm font-semibold bg-secondary text-foreground ring-1 ring-primary/30 px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            Open Web App
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pt-8 pb-16 sm:pt-14 sm:pb-24">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 size-[28rem] rounded-full bg-amber-dim blur-[120px] opacity-25" />
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <h1 className="font-serif text-4xl sm:text-6xl font-semibold leading-[1.05] tracking-tight">
            Never Cook, Never Clean,{" "}
            <span className="text-brass">Never Go Hungry.</span>
          </h1>
          <p className="text-toast text-base sm:text-lg max-w-2xl">
            Proper home-cooked meals every single day. Fetch it hot down the road OR get it delivered
            straight to your door/res. Zero stress.
          </p>
          <button
            onClick={scrollToPricing}
            className="mt-1 bg-primary text-primary-foreground font-bold uppercase tracking-wide px-8 py-4 rounded-2xl shadow-[0_0_60px_-15px_hsl(var(--amber-glow)/0.6)] hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Claim Your Spot Before It's Full
          </button>

          {/* Live counter */}
          <div className="mt-4 inline-flex flex-wrap justify-center items-center gap-2 bg-card ring-1 ring-primary/30 rounded-2xl px-5 py-3">
            <span className="animate-pulse text-lg leading-none">🔥</span>
            <p className="text-sm text-foreground">
              Only <span className="font-bold text-brass">12 Weekday Spots</span> &{" "}
              <span className="font-bold text-brass">7 Full Lounge Passes</span> remaining for this
              intake.
            </p>
          </div>
        </div>
      </section>

      {/* Food gallery */}
      <section className="px-5 py-14 sm:py-20 bg-card/40 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl text-center">
            Real Food. Heavy Portions. Proper Taste.
          </h2>
          <div className="grid sm:grid-cols-3 gap-5 mt-10">
            {MEALS.map((m) => (
              <article
                key={m.title}
                className="bg-card rounded-3xl overflow-hidden ring-1 ring-border hover:ring-primary/40 transition-all"
              >
                <img
                  src={m.img}
                  alt={m.title}
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-5">
                  <h3 className="font-serif text-xl text-brass leading-snug">{m.title}</h3>
                  <p className="text-toast text-sm mt-2">{m.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-14 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl text-center">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-5 mt-10">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-card rounded-3xl p-6 ring-1 ring-border">
                <span className="font-serif text-4xl text-primary/60">{s.n}</span>
                <h3 className="font-serif text-xl mt-3">{s.title}</h3>
                <p className="text-toast text-sm mt-2">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-5 py-14 sm:py-20 bg-card/40 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl text-center">Choose Your Pass</h2>
          <p className="text-toast text-center text-sm mt-2">
            Capped intake — 50 spots per plan, then the doors close.
          </p>
          <div className="grid md:grid-cols-3 gap-5 mt-10 items-start">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`relative bg-card rounded-3xl p-6 flex flex-col gap-4 ring-1 ${
                  p.featured
                    ? "ring-2 ring-primary shadow-[0_0_70px_-20px_hsl(var(--amber-glow)/0.5)] md:-mt-4 md:order-2"
                    : "ring-border"
                } ${p.name.startsWith("Weekday") ? "md:order-1" : ""} ${
                  p.name.startsWith("Weekend") ? "md:order-3" : ""
                }`}
              >
                {p.tag && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    {p.tag}
                  </span>
                )}
                <div>
                  <h3 className="font-serif text-2xl uppercase tracking-wide">{p.name}</h3>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="font-serif text-4xl text-brass tabular-nums">{p.price}</span>
                    <span className="text-toast text-sm mb-1">{p.period}</span>
                  </div>
                </div>
                {p.badge && (
                  <span className="self-start bg-destructive/25 text-destructive-foreground ring-1 ring-destructive/50 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    {p.badge}
                  </span>
                )}
                <ul className="flex flex-col gap-2 text-sm text-toast">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-brass">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/get-app"
                  className={`mt-auto text-center font-bold py-3.5 rounded-xl transition-opacity hover:opacity-90 ${
                    p.featured
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground ring-1 ring-primary/30"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOMO */}
      <section className="px-5 py-14 sm:py-20">
        <div className="max-w-3xl mx-auto bg-card rounded-3xl p-7 sm:p-10 ring-1 ring-destructive/40 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl">
            ⚠️ Why We Strictly Cap Student Registrations
          </h2>
          <p className="text-toast mt-4 leading-relaxed">
            We prioritize quality and huge portions over volume. To guarantee the kitchen cooks fresh,
            high-quality meals every single day without delays, we cannot accept everyone. Once these
            intake spots are gone, you will be placed on a waitlist for next month at higher rates.
          </p>
          <Link
            to="/get-app"
            className="inline-block mt-7 bg-primary text-primary-foreground font-bold uppercase tracking-wide px-7 py-3.5 rounded-2xl hover:opacity-90 transition-opacity"
          >
            Secure My Spot Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 py-10 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <Logo size={40} to="/" />
          <div className="text-center sm:text-right">
            <p className="text-toast text-sm">
              Already a member?{" "}
              <Link to="/app" className="text-brass font-semibold hover:underline">
                Open Web App
              </Link>
            </p>
            <p className="text-toast/80 text-xs mt-1">34 Beit Street, New Doornfontein, Johannesburg</p>
          </div>
          <p className="text-toast text-sm tracking-wide">maniaclounge.co.za</p>
        </div>
        <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-border flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-toast">
          <Link to="/terms" className="hover:text-brass transition-colors">Terms &amp; Conditions</Link>
          <Link to="/privacy" className="hover:text-brass transition-colors">Privacy Policy</Link>
          <span>© {new Date().getFullYear()} Maniac Lounge</span>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
