import { describe, it, expect } from "vitest";
import { derivePersonality } from "@/lib/personality";
import type { WrappedData } from "@/lib/types";

const base: WrappedData = {
  username: "u", year: 2026, avatarUrl: "",
  languages: [{ name: "TypeScript", pct: 50, color: "#3178c6" }],
  totalContributions: 100, longestStreakDays: 10,
  busiestWeekday: "Quarta", busiestMonth: "Março",
  nightOwl: { vibe: "tarde", approx: true },
  personality: { label: "", emoji: "" }, generatedAt: "",
};

describe("derivePersonality", () => {
  it("streak >= 100 => Máquina de Streak", () => {
    const p = derivePersonality({ ...base, longestStreakDays: 120 });
    expect(p.emoji).toBe("🔥");
    expect(p.label).toContain("Streak");
  });
  it("vibe madrugada => Night Owl", () => {
    const p = derivePersonality({ ...base, nightOwl: { vibe: "madrugada", approx: true } });
    expect(p.label).toContain("Night Owl");
  });
  it("linguagem dominante >= 70% => Especialista", () => {
    const p = derivePersonality({ ...base, languages: [{ name: "Go", pct: 80, color: "#00ADD8" }] });
    expect(p.label).toContain("Go");
  });
  it(">= 5 linguagens => Poliglota", () => {
    const langs = ["a","b","c","d","e"].map((n,i)=>({name:n,pct:20-i,color:"#000"}));
    const p = derivePersonality({ ...base, languages: langs });
    expect(p.label).toContain("Poliglota");
  });
  it("fim de semana => Weekend Warrior", () => {
    const p = derivePersonality({ ...base, busiestWeekday: "Sábado" });
    expect(p.label).toContain("Weekend");
  });
  it("fallback => Builder Consistente", () => {
    const p = derivePersonality(base);
    expect(p.label).toContain("Builder");
  });
});
