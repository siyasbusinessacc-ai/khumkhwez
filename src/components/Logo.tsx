import logoSrc from "@/assets/khumkhwez-logo.png";

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo = ({ className = "", size = 48 }: LogoProps) => (
  <img
    src={logoSrc}
    alt="Khumkhwez Dine & Shisha House"
    width={size}
    height={size}
    className={`object-contain drop-shadow-[0_0_18px_hsl(var(--amber-glow)/0.35)] ${className}`}
    style={{ width: size, height: size }}
  />
);
