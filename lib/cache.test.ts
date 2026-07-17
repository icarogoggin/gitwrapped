import { describe, it, expect, vi } from "vitest";
import { getCached, setCached } from "@/lib/cache";

describe("cache", () => {
  it("guarda e devolve dentro do TTL", () => {
    setCached("k", { a: 1 }, 1000);
    expect(getCached<{ a: number }>("k")).toEqual({ a: 1 });
  });
  it("expira depois do TTL", () => {
    vi.useFakeTimers();
    setCached("k2", 42, 1000);
    vi.advanceTimersByTime(1500);
    expect(getCached("k2")).toBeNull();
    vi.useRealTimers();
  });
  it("chave inexistente => null", () => {
    expect(getCached("nope")).toBeNull();
  });
});
