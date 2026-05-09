export interface PasswordStrength {
  score: number; // 0-5
  label: "Too weak" | "Weak" | "Fair" | "Good" | "Strong" | "Excellent";
  errors: string[];
}

export const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "An uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "A lowercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "A number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "A special character" },
];

export function evaluatePassword(password: string): PasswordStrength {
  const failed = PASSWORD_RULES.filter((r) => !r.test(password));
  const score = PASSWORD_RULES.length - failed.length;
  const labels: PasswordStrength["label"][] = [
    "Too weak", "Too weak", "Weak", "Fair", "Good", "Strong",
  ];
  return {
    score,
    label: password.length === 0 ? "Too weak" : labels[score] ?? "Excellent",
    errors: failed.map((r) => r.label),
  };
}

export function isPasswordStrong(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}
