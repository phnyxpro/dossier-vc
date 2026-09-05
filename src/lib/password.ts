export const MIN_PASSWORD_LENGTH = 12;

const COMMON = [
  "password",
  "passw0rd",
  "123456",
  "12345678",
  "123456789",
  "qwerty",
  "letmein",
  "welcome",
  "iloveyou",
  "admin",
  "dossier",
  "ventureble",
  "trinidad",
  "caribbean",
  "abc123",
  "monkey",
  "dragon",
  "football",
  "sunshine",
  "princess",
];

export type PasswordCheck = {
  ok: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  problems: string[];
};

export function checkPassword(password: string): PasswordCheck {
  const problems: string[] = [];
  const lower = password.toLowerCase();

  if (password.length < MIN_PASSWORD_LENGTH) {
    problems.push(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) {
    problems.push("Mix upper and lower case letters, numbers or symbols.");
  }

  const stripped = lower.replace(/[^a-z0-9]/g, "");
  if (COMMON.some((word) => stripped === word || (stripped.includes(word) && stripped.length <= word.length + 3))) {
    problems.push("This is too close to a commonly used password.");
  }

  if (/^(.)\1+$/.test(password) || /^(0123456789|abcdefghij)/.test(lower)) {
    problems.push("Avoid repeated characters or simple sequences.");
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (classes >= 3) score += 1;
  if (password.length >= 16 && classes >= 3) score += 1;
  if (problems.length > 0) score = Math.min(score, 2);

  return { ok: problems.length === 0 && password.length > 0, score: score as 0 | 1 | 2 | 3 | 4, problems };
}

export const STRENGTH_LABEL = ["Very weak", "Weak", "Fair", "Strong", "Very strong"] as const;
