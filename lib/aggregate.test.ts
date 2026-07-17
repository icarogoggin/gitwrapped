import { describe, it, expect } from "vitest";
import { longestStreak, busiestWeekday, busiestMonth, topLanguages, nightOwlVibe } from "@/lib/aggregate";

describe("longestStreak", () => {
  it("conta a maior sequência de dias com count>0", () => {
    const days = [
      { date: "2026-01-01", count: 1 },
      { date: "2026-01-02", count: 3 },
      { date: "2026-01-03", count: 0 },
      { date: "2026-01-04", count: 2 },
      { date: "2026-01-05", count: 2 },
      { date: "2026-01-06", count: 5 },
    ];
    expect(longestStreak(days)).toBe(3);
  });
  it("zero contribuições => 0", () => {
    expect(longestStreak([{ date: "2026-01-01", count: 0 }])).toBe(0);
  });
});

describe("busiest", () => {
  const days = [
    { date: "2026-01-07", count: 5 }, // quarta
    { date: "2026-03-04", count: 9 }, // quarta, março
    { date: "2026-01-05", count: 1 }, // segunda
  ];
  it("dia da semana com mais contribuições", () => {
    expect(busiestWeekday(days)).toBe("Quarta");
  });
  it("mês com mais contribuições", () => {
    expect(busiestMonth(days)).toBe("Março");
  });
});

describe("topLanguages", () => {
  it("agrega bytes e devolve top 5 em % desc", () => {
    const edges = [
      { size: 800, name: "TypeScript", color: "#3178c6" },
      { size: 200, name: "CSS", color: "#563d7c" },
      { size: 800, name: "TypeScript", color: "#3178c6" },
    ];
    const r = topLanguages(edges);
    expect(r[0]).toMatchObject({ name: "TypeScript", pct: 89 });
    expect(r[1]).toMatchObject({ name: "CSS", pct: 11 });
  });
});

describe("nightOwlVibe", () => {
  it("faixa de horário dominante", () => {
    expect(nightOwlVibe([1, 2, 3, 2]).vibe).toBe("madrugada");
    expect(nightOwlVibe([9, 10, 11]).vibe).toBe("manhã");
    expect(nightOwlVibe([]).vibe).toBe("tarde"); // fallback
  });
});
