import { checkPassword, MIN_PASSWORD_LENGTH, STRENGTH_LABEL } from "@/lib/password";

export function PasswordMeter({ password }: { password: string }) {
  const { score, problems } = checkPassword(password);
  const tone =
    score <= 1 ? "bg-destructive" : score === 2 ? "bg-warning" : score === 3 ? "bg-primary" : "bg-success";

  return (
    <div className="space-y-2">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${password && i < score ? tone : "bg-border"}`}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {password
          ? `${STRENGTH_LABEL[score]}. ${problems[0] ?? "This password meets our requirements."}`
          : `At least ${MIN_PASSWORD_LENGTH} characters, mixing letters with numbers or symbols.`}
      </p>
    </div>
  );
}
