import { evaluatePassword, PASSWORD_RULES } from "@/lib/password";

export const PasswordStrengthMeter = ({ password }: { password: string }) => {
  const { score, label } = evaluatePassword(password);
  const colors = [
    "bg-destructive", "bg-destructive", "bg-orange-500",
    "bg-yellow-500", "bg-emerald-500", "bg-emerald-400",
  ];
  const barColor = colors[score] ?? "bg-emerald-400";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < score ? barColor : "bg-secondary"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-toast">Password strength</span>
        <span className="text-foreground font-medium">{label}</span>
      </div>
      <ul className="grid grid-cols-1 gap-1 text-[11px] text-toast">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.label} className="flex items-center gap-1.5">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  ok ? "bg-emerald-500" : "bg-border"
                }`}
              />
              <span className={ok ? "text-foreground" : ""}>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
