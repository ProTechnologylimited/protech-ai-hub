import { describe, expect, it } from "vitest";
import { createThrottle } from "@/lib/throttle";

describe("throttle", () => {
  it("allows up to the limit per window, then blocks, then recovers", () => {
    let now = 0;
    const allow = createThrottle(60_000, () => now);
    expect(allow("u", 2)).toBe(true);
    expect(allow("u", 2)).toBe(true);
    expect(allow("u", 2)).toBe(false);
    now = 61_000;
    expect(allow("u", 2)).toBe(true);
  });

  it("tracks users independently", () => {
    const allow = createThrottle(60_000, () => 0);
    expect(allow("a", 1)).toBe(true);
    expect(allow("b", 1)).toBe(true);
    expect(allow("a", 1)).toBe(false);
  });
});
