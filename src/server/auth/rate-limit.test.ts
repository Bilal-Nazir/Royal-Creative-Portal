import { afterAll, afterEach, describe, expect, it } from "vitest";
import { checkRateLimit } from "./rate-limit";
import { getRedis } from "../db/redis";

afterEach(async () => {
  await getRedis().flushdb();
});

afterAll(async () => {
  await getRedis().quit();
});

describe("checkRateLimit", () => {
  it("allows the first 5 attempts, blocks the 6th", async () => {
    for (let i = 1; i <= 5; i++) {
      const result = await checkRateLimit("test-action", "a@example.com", "1.2.3.4");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - i);
    }
    const sixth = await checkRateLimit("test-action", "a@example.com", "1.2.3.4");
    expect(sixth.allowed).toBe(false);
    expect(sixth.remaining).toBe(0);
  });

  it("is keyed by action+email+ip — a different email isn't affected by another email's attempts", async () => {
    for (let i = 0; i < 5; i++) await checkRateLimit("test-action", "blocked@example.com", "1.2.3.4");
    expect((await checkRateLimit("test-action", "blocked@example.com", "1.2.3.4")).allowed).toBe(false);

    const otherEmail = await checkRateLimit("test-action", "fresh@example.com", "1.2.3.4");
    expect(otherEmail.allowed).toBe(true);
  });

  it("is keyed by action — the same email+ip under a different action has its own counter", async () => {
    for (let i = 0; i < 5; i++) await checkRateLimit("sign-in", "shared@example.com", "9.9.9.9");
    expect((await checkRateLimit("sign-in", "shared@example.com", "9.9.9.9")).allowed).toBe(false);

    const differentAction = await checkRateLimit("forgot-password", "shared@example.com", "9.9.9.9");
    expect(differentAction.allowed).toBe(true);
  });

  it("email matching is case-insensitive", async () => {
    for (let i = 0; i < 5; i++) await checkRateLimit("test-action", "Mixed@Example.com", "5.5.5.5");
    const result = await checkRateLimit("test-action", "mixed@example.com", "5.5.5.5");
    expect(result.allowed).toBe(false);
  });
});
