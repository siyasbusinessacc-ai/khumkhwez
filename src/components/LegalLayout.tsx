import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

type Section = { heading?: string; paragraphs?: string[]; bullets?: string[] };

interface LegalLayoutProps {
  title: string;
  updated: string;
  intro: string[];
  sections: Section[];
}

export const LegalLayout = ({ title, updated, intro, sections }: LegalLayoutProps) => (
  <div className="min-h-dvh bg-background">
    <header className="px-5 py-6 border-b border-border">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
        <Logo size={44} to="/" />
        <Link to="/app" className="text-brass text-sm font-semibold hover:underline">
          Open App
        </Link>
      </div>
    </header>

    <main className="px-5 py-10">
      <article className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-xs uppercase tracking-widest text-toast">Last updated: {updated}</p>
        </div>

        {intro.map((p, i) => (
          <p key={`intro-${i}`} className="text-sm leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}

        {sections.map((s, i) => (
          <section key={`sec-${i}`} className="flex flex-col gap-3">
            {s.heading && (
              <h2 className="font-serif text-xl text-foreground mt-4">{s.heading}</h2>
            )}
            {s.paragraphs?.map((p, j) => (
              <p key={`p-${j}`} className="text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
            {s.bullets && (
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                {s.bullets.map((b, j) => (
                  <li key={`b-${j}`} className="text-sm leading-relaxed text-muted-foreground">
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <footer className="mt-10 pt-6 border-t border-border flex flex-wrap gap-4 text-sm">
          <Link to="/terms" className="text-brass hover:underline">Terms &amp; Conditions</Link>
          <Link to="/privacy" className="text-brass hover:underline">Privacy Policy</Link>
          <Link to="/" className="text-toast hover:text-foreground transition-colors">Back to home</Link>
        </footer>
      </article>
    </main>
  </div>
);

export default LegalLayout;
