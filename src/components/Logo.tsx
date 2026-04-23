import logoSrc from "@/assets/khumkhwez-logo.jpeg";

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo = ({ className = "", size = 40 }: LogoProps) => (
  <img
    src={logoSrc}
    alt="Khumkhwez Dine & Shisha House"
    width={size}
    height={size}
    className={`rounded-xl object-cover ring-1 ring-border ${className}`}
  />
);
