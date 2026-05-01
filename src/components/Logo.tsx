import { Link } from "react-router-dom";
import logoWithText from "@/assets/khumkhwez-logo.png";
import logoSymbol from "@/assets/logo-symbol.png";

interface LogoProps {
  className?: string;
  size?: number;
  variant?: "full" | "symbol";
}

export const Logo = ({ className = "", size = 48, variant = "full" }: LogoProps) => (
  <Link to="/" className="inline-block transition-transform active:scale-95">
    <img
      src={variant === "full" ? logoWithText : logoSymbol}
      alt="Khumkhwez Dine & Shisha House"
      width={size}
      height={size}
      className={`object-contain drop-shadow-[0_0_18px_hsl(var(--amber-glow)/0.35)] ${className}`}
      style={{ width: size, height: size }}
    />
  </Link>
);
