import { Link } from "react-router-dom";
import logoImage from "@/assets/maniac-lounge-logo.png";

interface LogoProps {
  className?: string;
  size?: number;
  variant?: "full" | "symbol";
}

export const Logo = ({ className = "", size = 48, variant = "full" }: LogoProps) => {
  const width = variant === "symbol" ? size * 1.6 : size * 2.2;

  return (
    <Link to="/" className="inline-block transition-transform active:scale-95">
      <img
        src={logoImage}
        alt="Maniac Lounge"
        className={`object-contain h-auto max-w-full drop-shadow-[0_0_18px_hsl(var(--amber-glow)/0.35)] ${className}`}
        style={{ width }}
      />
    </Link>
  );
};
