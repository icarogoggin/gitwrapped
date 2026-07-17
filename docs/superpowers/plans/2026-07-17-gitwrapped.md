# GitWrapped Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ferramenta web que recebe um username público do GitHub e devolve um "retrospecto do ano em código" — story animado de 5 slides + card PNG baixável (também OG image).

**Architecture:** Next.js App Router (TS). Lógica pura isolada em `lib/` (agregação, personalidade, cache), testada com Vitest sem rede. Rotas server (`/api/wrapped`, `/api/og`) buscam GitHub GraphQL+REST com token server-side. UI: landing + página de story (Framer Motion).

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, `next/og` (ImageResponse nativo), Vitest. GitHub GraphQL + REST via `fetch` (sem octokit).

## Global Constraints

- Node ≥ 20 (ambiente tem v24).
- **NUNCA** incluir `Co-Authored-By` (nem variantes) em mensagens de commit.
- Apenas dados **públicos** do GitHub. Token só server-side (env `GITHUB_TOKEN`); nunca exposto ao client.
- Ano-alvo default = ano corrente (2026). `?year=` fica preparado mas não é requisito do MVP.
- Sem login, sem banco, sem contas.
- Todo texto de UI em pt-BR.

---

### Task 1: Scaffold Next.js + Tailwind + Vitest

**Files:**
- Create: projeto inteiro via `create-next-app` na pasta atual `github-wrapped/`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Test: `lib/__tests__/smoke.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: projeto Next rodando; `npm test` executa Vitest.

- [ ] **Step 1: Gerar o app Next dentro da pasta**

Run (a pasta `github-wrapped/` já existe com `.git` e `docs/`; gerar sem sobrescrever):
```bash
npx create-next-app@latest . --ts --tailwind --app --eslint --src-dir=false --import-alias "@/*" --no-turbopack --use-npm
```
Se perguntar sobre arquivos existentes, manter `docs/`, `.git`, `.gitignore`.

- [ ] **Step 2: Instalar deps de runtime e teste**

Run:
```bash
npm install framer-motion
npm install -D vitest
```
(`ImageResponse` vem de `next/og`, não precisa `@vercel/og`.)

- [ ] **Step 3: Criar `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["lib/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 4: Adicionar script de teste ao `package.json`**

Em `"scripts"`, adicionar: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 5: Criar `.env.example`**

```
# Personal Access Token com acesso a dados públicos (public_repo/read).
# Local: pode gerar com `gh auth token`.
GITHUB_TOKEN=
```

- [ ] **Step 6: Escrever smoke test `lib/__tests__/smoke.test.ts`**

```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => {
  it("roda o vitest", () => { expect(1 + 1).toBe(2); });
});
```

- [ ] **Step 7: Rodar teste e verificar que passa**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + Vitest"
```

---

### Task 2: Tipos + Personalidade (lógica pura, TDD)

**Files:**
- Create: `lib/types.ts`
- Create: `lib/personality.ts`
- Test: `lib/personality.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type WrappedData` (ver Step 1) — usado por todas as tasks seguintes.
  - `derivePersonality(d: WrappedData): { label: string; emoji: string }`.

- [ ] **Step 1: Criar `lib/types.ts`**

```ts
export type Language = { name: string; pct: number; color: string };
export type NightOwl = {
  vibe: "madrugada" | "manhã" | "tarde" | "noite";
  approx: true;
};
export type Personality = { label: string; emoji: string };

export type WrappedData = {
  username: string;
  year: number;
  avatarUrl: string;
  languages: Language[];        // top 5, ordenado desc por pct
  totalContributions: number;
  longestStreakDays: number;
  busiestWeekday: string;       // "Domingo".."Sábado"
  busiestMonth: string;         // "Janeiro".."Dezembro"
  nightOwl: NightOwl;
  personality: Personality;
  generatedAt: string;          // ISO
};
```

- [ ] **Step 2: Escrever teste `lib/personality.test.ts` (falhando)**

```ts
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
```

- [ ] **Step 3: Rodar teste e verificar que falha**

Run: `npm test`
Expected: FAIL — `derivePersonality` não existe.

- [ ] **Step 4: Implementar `lib/personality.ts`**

```ts
import type { WrappedData, Personality } from "@/lib/types";

// Regras em ordem de prioridade; primeira que casar vence.
export function derivePersonality(d: WrappedData): Personality {
  const top = d.languages[0];
  if (d.longestStreakDays >= 100) return { emoji: "🔥", label: "Máquina de Streak" };
  if (d.nightOwl.vibe === "madrugada") return { emoji: "🦉", label: "Night Owl Arquiteto" };
  if (top && top.pct >= 70) return { emoji: "🎯", label: `Especialista ${top.name}` };
  if (d.languages.length >= 5) return { emoji: "🐙", label: "Poliglota" };
  if (d.busiestWeekday === "Sábado" || d.busiestWeekday === "Domingo")
    return { emoji: "🏖️", label: "Weekend Warrior" };
  return { emoji: "🚀", label: "Builder Consistente" };
}
```

- [ ] **Step 5: Rodar teste e verificar que passa**

Run: `npm test`
Expected: PASS (6 casos de personality + smoke).

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/personality.ts lib/personality.test.ts
git commit -m "feat: tipos WrappedData + regras de personalidade dev"
```

---

### Task 3: Agregação GitHub (funções puras, TDD com fixtures)

**Files:**
- Create: `lib/aggregate.ts`
- Test: `lib/aggregate.test.ts`

**Interfaces:**
- Consumes: `WrappedData` (parcial) de `lib/types`.
- Produces:
  - `longestStreak(days: {date: string; count: number}[]): number`
  - `busiestWeekday(days): string` e `busiestMonth(days): string`
  - `topLanguages(edges: {size:number; name:string; color:string}[]): Language[]`
  - `nightOwlVibe(hours: number[]): NightOwl`
  - Tipo `ContribDay = { date: string; count: number }` exportado.

- [ ] **Step 1: Escrever teste `lib/aggregate.test.ts` (falhando)**

```ts
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
```

- [ ] **Step 2: Rodar teste e verificar que falha**

Run: `npm test`
Expected: FAIL — funções de `lib/aggregate` não existem.

- [ ] **Step 3: Implementar `lib/aggregate.ts`**

```ts
import type { Language, NightOwl } from "@/lib/types";

export type ContribDay = { date: string; count: number };

const WEEKDAYS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export function longestStreak(days: ContribDay[]): number {
  let best = 0, cur = 0;
  for (const d of days) {
    if (d.count > 0) { cur += 1; best = Math.max(best, cur); }
    else cur = 0;
  }
  return best;
}

function argmaxLabel(days: ContribDay[], keyOf: (d: Date) => number, labels: string[]): string {
  const totals = new Array(labels.length).fill(0);
  for (const d of days) totals[keyOf(new Date(d.date + "T00:00:00"))] += d.count;
  let bi = 0;
  for (let i = 1; i < totals.length; i++) if (totals[i] > totals[bi]) bi = i;
  return labels[bi];
}

export function busiestWeekday(days: ContribDay[]): string {
  return argmaxLabel(days, (d) => d.getDay(), WEEKDAYS);
}
export function busiestMonth(days: ContribDay[]): string {
  return argmaxLabel(days, (d) => d.getMonth(), MONTHS);
}

export function topLanguages(
  edges: { size: number; name: string; color: string }[]
): Language[] {
  const byName = new Map<string, { size: number; color: string }>();
  let total = 0;
  for (const e of edges) {
    total += e.size;
    const prev = byName.get(e.name);
    byName.set(e.name, { size: (prev?.size ?? 0) + e.size, color: e.color });
  }
  if (total === 0) return [];
  return [...byName.entries()]
    .map(([name, v]) => ({ name, color: v.color, pct: Math.round((v.size / total) * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);
}

export function nightOwlVibe(hours: number[]): NightOwl {
  if (hours.length === 0) return { vibe: "tarde", approx: true };
  const buckets = { madrugada: 0, manhã: 0, tarde: 0, noite: 0 };
  for (const h of hours) {
    if (h < 6) buckets.madrugada++;
    else if (h < 12) buckets.manhã++;
    else if (h < 18) buckets.tarde++;
    else buckets.noite++;
  }
  const vibe = (Object.keys(buckets) as (keyof typeof buckets)[])
    .reduce((a, b) => (buckets[b] > buckets[a] ? b : a));
  return { vibe, approx: true };
}
```

- [ ] **Step 4: Rodar teste e verificar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/aggregate.ts lib/aggregate.test.ts
git commit -m "feat: agregação de streak, dia/mês, linguagens e night-owl"
```

---

### Task 4: Cache in-memory com TTL (TDD)

**Files:**
- Create: `lib/cache.ts`
- Test: `lib/cache.test.ts`

**Interfaces:**
- Produces: `getCached<T>(key: string): T | null`, `setCached<T>(key: string, val: T, ttlMs: number): void`.

- [ ] **Step 1: Escrever teste `lib/cache.test.ts` (falhando)**

```ts
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
```

- [ ] **Step 2: Rodar teste e verificar que falha**

Run: `npm test`
Expected: FAIL — `lib/cache` não existe.

- [ ] **Step 3: Implementar `lib/cache.ts`**

```ts
type Entry = { value: unknown; expiresAt: number };
const store = new Map<string, Entry>();

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function getCached<T>(key: string): T | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { store.delete(key); return null; }
  return e.value as T;
}
```

- [ ] **Step 4: Rodar teste e verificar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/cache.ts lib/cache.test.ts
git commit -m "feat: cache in-memory com TTL"
```

---

### Task 5: Camada de fetch GitHub → getWrapped (TDD com fetch mockado)

**Files:**
- Create: `lib/github.ts`
- Test: `lib/github.test.ts`

**Interfaces:**
- Consumes: `topLanguages/longestStreak/busiestWeekday/busiestMonth/nightOwlVibe` (Task 3), `derivePersonality` (Task 2), cache (Task 4).
- Produces: `getWrapped(username: string, year?: number): Promise<WrappedData>`.
  - Lança `Error("NOT_FOUND")` se usuário não existir; `Error("NO_DATA")` se sem contribuições no ano.

- [ ] **Step 1: Escrever teste `lib/github.test.ts` (falhando)**

```ts
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
```

- [ ] **Step 2: Rodar teste e verificar que falha**

Run: `npm test`
Expected: FAIL — `getWrapped` não existe.

- [ ] **Step 3: Implementar `lib/github.ts`**

```ts
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
    .filter(r => r.pushedAt && new Date(r.pushedAt).getUTCFullYear() >= year - 1)
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
```

- [ ] **Step 4: Rodar teste e verificar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/github.ts lib/github.test.ts
git commit -m "feat: getWrapped (GraphQL + REST → WrappedData) com cache"
```

---

### Task 6: Rota API `/api/wrapped/[username]`

**Files:**
- Create: `app/api/wrapped/[username]/route.ts`

**Interfaces:**
- Consumes: `getWrapped` (Task 5).
- Produces: `GET /api/wrapped/:username?year=` → `200 WrappedData` | `404 {error:"NOT_FOUND"|"NO_DATA"}` | `500 {error}`.

- [ ] **Step 1: Implementar a rota**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getWrapped } from "@/lib/github";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;
  try {
    const data = await getWrapped(username, year);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const status = msg === "NOT_FOUND" || msg === "NO_DATA" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
```

- [ ] **Step 2: Verificação manual (precisa de token)**

Run:
```bash
GITHUB_TOKEN=$(gh auth token) npm run dev
```
Em outro terminal:
```bash
curl -s "http://localhost:3000/api/wrapped/icarogoggin" | head -c 400
```
Expected: JSON com `username`, `totalContributions`, `languages`, `personality`.

- [ ] **Step 3: Commit**

```bash
git add app/api/wrapped
git commit -m "feat: rota /api/wrapped/[username]"
```

---

### Task 7: Card PNG + OG image `/api/og/[username]`

**Files:**
- Create: `app/api/og/[username]/route.tsx`

**Interfaces:**
- Consumes: `getWrapped` (Task 5).
- Produces: `GET /api/og/:username` → `image/png` 1200×630 com resumo. Erro → card genérico (status 200, nunca quebra unfurl).

- [ ] **Step 1: Implementar a rota de imagem**

```tsx
import { ImageResponse } from "next/og";
import { getWrapped } from "@/lib/github";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  let d;
  try { d = await getWrapped(username); } catch { d = null; }

  const bg = "linear-gradient(135deg,#7c3aed 0%,#db2777 100%)";
  if (!d) {
    return new ImageResponse(
      (<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: bg, color: "white", fontSize: 48 }}>GitWrapped</div>),
      { width: 1200, height: 630 }
    );
  }
  const top = d.languages[0];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: bg, color: "white", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <img src={d.avatarUrl} width={96} height={96} style={{ borderRadius: 48 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 40, fontWeight: 700 }}>@{d.username}</span>
            <span style={{ fontSize: 28, opacity: 0.85 }}>Retrospecto {d.year} em código</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 48, marginTop: 56 }}>
          <Stat label="Contribuições" value={String(d.totalContributions)} />
          <Stat label="Maior streak" value={`${d.longestStreakDays} dias`} />
          <Stat label="Top linguagem" value={top ? `${top.name} ${top.pct}%` : "—"} />
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 44, fontWeight: 700 }}>
          {d.personality.emoji} {d.personality.label}
        </div>
        <div style={{ display: "flex", fontSize: 22, opacity: 0.7, marginTop: 12 }}>gitwrapped</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 52, fontWeight: 800 }}>{value}</span>
      <span style={{ fontSize: 24, opacity: 0.8 }}>{label}</span>
    </div>
  );
}
```

- [ ] **Step 2: Verificação manual**

Com o dev server rodando (com token): abrir `http://localhost:3000/api/og/icarogoggin` no navegador.
Expected: PNG 1200×630 com avatar, 3 stats e personalidade.

- [ ] **Step 3: Commit**

```bash
git add app/api/og
git commit -m "feat: card PNG / OG image em /api/og/[username]"
```

---

### Task 8: Página de story `/[username]` (slides + OG meta + botões)

**Files:**
- Create: `app/[username]/page.tsx` (server component: fetch + metadata)
- Create: `app/[username]/Story.tsx` (client: slides Framer Motion + botões)

**Interfaces:**
- Consumes: `getWrapped` (Task 5), `WrappedData` (Task 2).
- Produces: rota renderizada `/[username]` com `<Story data=... />` e `generateMetadata` apontando OG para `/api/og/[username]`.

- [ ] **Step 1: Implementar `app/[username]/Story.tsx` (client)**

```tsx
"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { WrappedData } from "@/lib/types";

export default function Story({ data }: { data: WrappedData }) {
  const [i, setI] = useState(0);
  const slides = buildSlides(data);
  const last = i === slides.length - 1;
  const next = () => !last && setI(i + 1);
  const ogUrl = `/api/og/${data.username}`;
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const share = () =>
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`, "_blank");

  return (
    <div onClick={next} style={{ cursor: last ? "default" : "pointer" }}
      className="min-h-screen w-full flex items-center justify-center text-white select-none"
      >
      <AnimatePresence mode="wait">
        <motion.div key={i}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4 }}
          className={`min-h-screen w-full flex flex-col items-center justify-center gap-6 px-8 ${slides[i].bg}`}
        >
          {slides[i].content}
          {last && (
            <div className="flex gap-4 mt-8" onClick={(e) => e.stopPropagation()}>
              <a href={ogUrl} download={`gitwrapped-${data.username}.png`}
                 className="px-6 py-3 rounded-full bg-white text-black font-semibold">Baixar card</a>
              <button onClick={share}
                 className="px-6 py-3 rounded-full border border-white font-semibold">Compartilhar no LinkedIn</button>
            </div>
          )}
          {!last && <span className="mt-8 text-sm opacity-70">toque para continuar →</span>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function buildSlides(d: WrappedData) {
  const big = "text-6xl font-extrabold text-center";
  return [
    { bg: "bg-gradient-to-br from-violet-600 to-fuchsia-600",
      content: <h1 className={big}>Teu {d.year} em código,<br/>@{d.username}</h1> },
    { bg: "bg-gradient-to-br from-sky-500 to-indigo-600",
      content: <div className="text-center">
        <p className="text-2xl mb-4 opacity-80">Top linguagens</p>
        {d.languages.map(l => <p key={l.name} className="text-4xl font-bold">{l.name} · {l.pct}%</p>)}
      </div> },
    { bg: "bg-gradient-to-br from-emerald-500 to-teal-600",
      content: <div className="text-center">
        <p className={big}>{d.totalContributions}</p>
        <p className="text-2xl opacity-80">contribuições · maior streak de {d.longestStreakDays} dias</p>
      </div> },
    { bg: "bg-gradient-to-br from-amber-500 to-orange-600",
      content: <p className="text-4xl font-bold text-center">
        Você commita mais nas<br/>{d.busiestWeekday}s de {d.nightOwl.vibe}</p> },
    { bg: "bg-gradient-to-br from-pink-600 to-rose-700",
      content: <div className="text-center">
        <p className="text-2xl opacity-80 mb-2">Sua personalidade dev</p>
        <p className="text-6xl font-extrabold">{d.personality.emoji} {d.personality.label}</p>
      </div> },
  ];
}
```

- [ ] **Step 2: Implementar `app/[username]/page.tsx` (server)**

```tsx
import type { Metadata } from "next";
import { getWrapped } from "@/lib/github";
import Story from "./Story";

export const runtime = "nodejs";

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> }
): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `GitWrapped — @${username}`,
    openGraph: { images: [`/api/og/${username}`] },
    twitter: { card: "summary_large_image", images: [`/api/og/${username}`] },
  };
}

export default async function Page(
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  let data;
  try { data = await getWrapped(username); }
  catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white text-center px-8">
        <p className="text-2xl">
          {msg === "NOT_FOUND" ? `Não achei o usuário @${username}.`
           : msg === "NO_DATA" ? `Sem dados deste ano para @${username}.`
           : "Deu ruim ao buscar no GitHub. Tenta de novo."}
        </p>
      </main>
    );
  }
  return <Story data={data} />;
}
```

- [ ] **Step 3: Verificação manual**

Com dev server (com token): abrir `http://localhost:3000/icarogoggin`.
Expected: 5 slides animados, botões Baixar/Compartilhar no último; usuário inválido mostra mensagem amigável.

- [ ] **Step 4: Commit**

```bash
git add app/[username]
git commit -m "feat: página de story com 5 slides + OG meta + botões"
```

---

### Task 9: Landing `/` + layout

**Files:**
- Modify: `app/page.tsx` (substituir o boilerplate)
- Modify: `app/layout.tsx` (título/lang pt-BR)

**Interfaces:**
- Consumes: rota `/[username]`.
- Produces: home com input → navega para `/{username}`.

- [ ] **Step 1: Implementar `app/page.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const [u, setU] = useState("");
  const router = useRouter();
  const go = (e: React.FormEvent) => { e.preventDefault(); if (u.trim()) router.push(`/${u.trim().replace(/^@/, "")}`); };
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-violet-700 to-fuchsia-700 text-white px-8">
      <h1 className="text-5xl md:text-7xl font-extrabold text-center">GitWrapped</h1>
      <p className="text-xl opacity-80 text-center">Teu ano de código, no estilo Wrapped. Cola teu usuário do GitHub.</p>
      <form onSubmit={go} className="flex gap-3 w-full max-w-md">
        <input value={u} onChange={(e) => setU(e.target.value)} placeholder="seu-usuario"
          className="flex-1 px-5 py-3 rounded-full text-black text-lg outline-none" />
        <button className="px-6 py-3 rounded-full bg-white text-black font-semibold">Ver</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Ajustar `app/layout.tsx`**

Trocar `lang="en"` por `lang="pt-BR"` e o metadata title para `"GitWrapped"`, description `"Teu ano de código no estilo Wrapped."`.

- [ ] **Step 3: Verificação manual**

Abrir `http://localhost:3000/` → digitar `icarogoggin` → Ver → deve navegar pro story.
Expected: fluxo completo funciona.

- [ ] **Step 4: Rodar toda a suíte + build**

Run:
```bash
npm test && npm run build
```
Expected: testes PASS; build sem erro.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: landing com input de username"
```

---

## Deploy (pós-MVP, manual)

1. Push do repo pro GitHub (`gh repo create icarogoggin/gitwrapped --public --source=. --push`).
2. Importar na Vercel; setar env `GITHUB_TOKEN` (PAT com escopo público).
3. Testar OG unfurl postando `https://<deploy>/icarogoggin` no LinkedIn.
