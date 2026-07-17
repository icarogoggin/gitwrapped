import type { WrappedData } from "@/lib/types";
import { topLanguages, longestStreak, busiestWeekday, busiestMonth, nightOwlVibe, type ContribDay } from "@/lib/aggregate";
import { derivePersonality } from "@/lib/personality";
import { getCached, setCached } from "@/lib/cache";

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12h

const QUERY = `query($login:String!,$from:DateTime!,$to:DateTime!){
  user(login:$login){
    avatarUrl
    contributionsCollection(from:$from,to:$to){
      contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } }
    }
    repositories(ownerAffiliations:OWNER,isFork:false,first:100,orderBy:{field:PUSHED_AT,direction:DESC}){
      nodes{ pushedAt languages(first:10){ edges{ size node{ name color } } } }
    }
  }
}`;

function token(): string {
  const t = process.env.GITHUB_TOKEN;
  if (!t) throw new Error("NO_TOKEN");
  return t;
}

async function graphql(login: string, year: number) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: {
      login, from: `${year}-01-01T00:00:00Z`, to: `${year}-12-31T23:59:59Z`,
    }}),
  });
  if (!res.ok) throw new Error("GH_API");
  const json = await res.json();
  return json.data?.user ?? null;
}

async function recentPushHours(login: string): Promise<number[]> {
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}/events/public?per_page=100`, {
    headers: { Authorization: `bearer ${token()}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return [];
  const events = (await res.json()) as { type: string; created_at: string }[];
  return events.filter(e => e.type === "PushEvent").map(e => new Date(e.created_at).getUTCHours());
}

export async function getWrapped(username: string, year = new Date().getUTCFullYear()): Promise<WrappedData> {
  const login = username.trim().replace(/^@/, "");
  const key = `${login.toLowerCase()}:${year}`;
  const cached = getCached<WrappedData>(key);
  if (cached) return cached;

  const user = await graphql(login, year);
  if (!user) throw new Error("NOT_FOUND");

  const cal = user.contributionsCollection.contributionCalendar;
  const days: ContribDay[] = cal.weeks.flatMap((w: any) =>
    w.contributionDays.map((d: any) => ({ date: d.date, count: d.contributionCount }))
  );
  if (cal.totalContributions === 0) throw new Error("NO_DATA");

  const edges = (user.repositories.nodes as any[])
    .filter(r => r.pushedAt && new Date(r.pushedAt).getUTCFullYear() === year)
    .flatMap(r => r.languages.edges.map((e: any) => ({ size: e.size, name: e.node.name, color: e.node.color })));

  const hours = await recentPushHours(login);

  const partial = {
    username: login, year, avatarUrl: user.avatarUrl,
    languages: topLanguages(edges),
    totalContributions: cal.totalContributions,
    longestStreakDays: longestStreak(days),
    busiestWeekday: busiestWeekday(days),
    busiestMonth: busiestMonth(days),
    nightOwl: nightOwlVibe(hours),
  };
  const data: WrappedData = {
    ...partial,
    personality: derivePersonality({ ...partial, personality: { label: "", emoji: "" }, generatedAt: "" }),
    generatedAt: new Date().toISOString(),
  };
  setCached(key, data, CACHE_TTL);
  return data;
}
