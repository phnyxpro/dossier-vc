import { describe, expect, it } from "vitest";
import { checkPassword, MIN_PASSWORD_LENGTH } from "./password";

describe("password policy", () => {
  it("rejects anything shorter than the minimum", () => {
    expect(checkPassword("Ab3$xyz").ok).toBe(false);
    expect(MIN_PASSWORD_LENGTH).toBe(12);
  });

  it("rejects a long single-class password", () => {
    expect(checkPassword("abcdefghijklmnop").ok).toBe(false);
  });

  it("rejects common passwords", () => {
    expect(checkPassword("password1234").ok).toBe(false);
    expect(checkPassword("Ventureble12").ok).toBe(false);
  });

  it("accepts a strong password", () => {
    const result = checkPassword("Harbour-Quay-7742");
    expect(result.ok).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(3);
  });
});
