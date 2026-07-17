import { describe, it, expect, vi, beforeEach } from "vitest";

const graphqlResp = {
  data: {
    user: {
      avatarUrl: "https://avatar/u.png",
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: 3,
          weeks: [{ contributionDays: [
            { date: "2026-01-07", contributionCount: 5 },
            { date: "2026-01-08", contributionCount: 0 },
            { date: "2026-03-04", contributionCount: 4 },
          ]}],
        },
      },
      repositories: { nodes: [
        { pushedAt: "2026-05-01T00:00:00Z", languages: { edges: [
          { size: 900, node: { name: "TypeScript", color: "#3178c6" } },
          { size: 100, node: { name: "CSS", color: "#563d7c" } },
        ] } },
        { pushedAt: "2025-06-01T00:00:00Z", languages: { edges: [
          { size: 5000, node: { name: "COBOL", color: "#000" } },
        ] } },
      ] },
    },
  },
};
const restEvents = [
  { type: "PushEvent", created_at: "2026-05-01T03:00:00Z" },
  { type: "PushEvent", created_at: "2026-05-01T02:00:00Z" },
  { type: "WatchEvent", created_at: "2026-05-01T14:00:00Z" },
];

beforeEach(() => vi.resetAllMocks());

describe("getWrapped", () => {
  it("agrega GraphQL + REST em WrappedData", async () => {
    process.env.GITHUB_TOKEN = "x";
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/graphql")) return { ok: true, json: async () => graphqlResp } as Response;
      return { ok: true, json: async () => restEvents } as Response;
    }));
    const { getWrapped } = await import("@/lib/github");
    const d = await getWrapped("icarogoggin", 2026);
    expect(d.username).toBe("icarogoggin");
    expect(d.totalContributions).toBe(3);
    expect(d.languages[0].name).toBe("TypeScript");
    expect(d.languages.some(l => l.name === "COBOL")).toBe(false); // repo de 2025 fica fora do ano-alvo
    expect(d.busiestWeekday).toBe("Quarta");
    expect(d.nightOwl.vibe).toBe("madrugada"); // 2 pushes de madrugada
    expect(d.personality.label).toBeTruthy();
  });

  it("usuário inexistente => NOT_FOUND", async () => {
    process.env.GITHUB_TOKEN = "x";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ data: { user: null } }) } as Response)));
    const { getWrapped } = await import("@/lib/github");
    await expect(getWrapped("ghost", 2026)).rejects.toThrow("NOT_FOUND");
  });
});
