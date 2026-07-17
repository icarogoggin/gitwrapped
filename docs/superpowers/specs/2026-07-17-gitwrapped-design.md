# GitWrapped — Design Spec

**Data:** 2026-07-17
**Autor:** Ícaro Goggin
**Status:** Aprovado (aguardando revisão do spec)

## 1. Visão geral

GitWrapped é uma ferramenta web viral: o usuário cola um username público do GitHub
e recebe um "retrospecto do ano em código" no estilo *Spotify Wrapped* — um **story
animado** de 5 slides no site + um **card PNG baixável** para compartilhar no LinkedIn/X.

O motor viral é o compartilhamento: o card também é a **OG image** do link, então o
preview no LinkedIn já mostra o retrospecto, gerando alcance orgânico.

## 2. Objetivos e não-objetivos

**Objetivos (MVP):**
- Input de username → story animado + card baixável.
- Zero cadastro. Qualquer username público funciona.
- Card serve de OG image (preview rico ao compartilhar).
- Código isolado e testável (`lib/github`, `lib/personality`).

**Não-objetivos (YAGNI — fora do MVP):**
- Login/OAuth, banco de dados, contas.
- Histórico multi-ano (só o ano corrente; `?year=` fica fácil de adicionar depois).
- Night-owl exato de ano cheio (usa aproximação por eventos recentes).
- Personalidade gerada por LLM (MVP é baseado em regra; plugável depois).

## 3. Stack

- **Next.js (App Router) + TypeScript** — full-stack, deploy Vercel.
- **@vercel/og (Satori)** — geração do card PNG / OG image server-side.
- **Framer Motion** — transições animadas dos slides.
- **Tailwind CSS** — estilo (gradientes vibrantes, tipografia grande).
- **GitHub API** — GraphQL (contribuições, linguagens) + REST (eventos recentes).
- Token do GitHub server-side (via env `GITHUB_TOKEN`; localmente pode reusar `gh auth token`).

## 4. Arquitetura

```
/                       landing: input username → navega para /[username]
/[username]             story animado (5 slides) + botões Baixar / Compartilhar
app/api/wrapped/[u]     server: GraphQL+REST → agrega WrappedData (cacheado)
app/api/og/[u]          @vercel/og → PNG (card baixável + OG image do unfurl)
lib/github.ts           fetch + agregação → WrappedData (unidade isolada, testável)
lib/personality.ts      WrappedData → { label, emoji } via regra (isolada, testável)
lib/cache.ts            cache in-memory por username (TTL 6–24h)
```

**Fluxo de dados:**
`username` → `lib/github.getWrapped(u, year)` (busca GraphQL+REST, agrega, cacheia) →
`WrappedData` → página `/[username]` renderiza os slides; `/api/og/[u]` desenha o card.

### Contrato `WrappedData`
```ts
type WrappedData = {
  username: string;
  year: number;
  avatarUrl: string;
  languages: { name: string; pct: number; color: string }[]; // top 5
  totalContributions: number;
  longestStreakDays: number;
  busiestWeekday: string;   // ex.: "Quarta"
  busiestMonth: string;     // ex.: "Março"
  nightOwl: {               // aproximado, eventos recentes
    vibe: "madrugada" | "manhã" | "tarde" | "noite";
    approx: true;
  };
  personality: { label: string; emoji: string };
  generatedAt: string;      // ISO
};
```

## 5. Fontes de dados (detalhe)

- **Contribuições + streak + dia/mês de pico** — GraphQL
  `user.contributionsCollection(from, to).contributionCalendar`:
  - `totalContributions` → total do ano.
  - `weeks[].contributionDays[]` (data + count) → maior sequência de dias com count>0
    (streak); soma por `weekday` → dia mais ativo; soma por mês → mês mais ativo.
- **Top linguagens** — GraphQL `user.repositories(ownerAffiliations: OWNER, isFork: false,
  first: 100).nodes.languages(first: 10) { edges { size, node { name, color } } }`.
  Agrega `size` (bytes) por linguagem → top 5 em %. Filtra repos com `pushedAt` no ano.
- **Night-owl (vibe)** — REST `/users/{u}/events/public` (últimos ~300 eventos/90 dias) →
  histograma da hora dos `PushEvent` → faixa dominante (madrugada 0-6, manhã 6-12,
  tarde 12-18, noite 18-24). Rotulado como **aproximado**.

## 6. Slides (story) + card

1. **Intro** — "Teu {year} em código, @{user}" (fade/scale in).
2. **Top linguagens** — donut + %.
3. **Contribuições + streak** — total do ano + maior sequência.
4. **Dia/mês de pico** — "Você commita mais nas {weekday} de {vibe}".
5. **Personalidade dev** — `{emoji} {label}` + botões **Baixar card** e **Compartilhar
   no LinkedIn**.

**Card (PNG)** — resumo de tudo num só quadro (avatar, top linguagem, total, streak,
personalidade), 1200×630 (OG ratio).

## 7. Personalidade (regra — `lib/personality.ts`)

Deriva `{label, emoji}` de sinais de `WrappedData`. Exemplos de regras (ordem de
prioridade, primeira que casar):
- streak ≥ 100 → "🔥 Máquina de Streak"
- nightOwl.vibe === "madrugada" → "🦉 Night Owl"
- languages[0].pct ≥ 70 → "🎯 Especialista {lang}"
- languages.length ≥ 5 → "🐙 Poliglota"
- busiestWeekday é sábado/domingo → "🏖️ Weekend Warrior"
- fallback → "🚀 Builder Consistente"

Cada label combina com um sufixo de arquétipo quando aplicável (ex.: "Night Owl
Arquiteto"). Determinística e testável.

## 8. Cache e rate-limit

- `lib/cache.ts`: Map in-memory `username:year → { data, expiresAt }`, TTL 12h.
- Protege o rate-limit (5000 req/h com token) e acelera reacessos/virais.
- Em produção Vercel, trocar por Vercel KV é trivial (mesma interface).

## 9. Tratamento de erro

- Username inexistente / sem atividade no ano → tela amigável ("Sem dados de {year}
  para @{user}") em vez de erro cru.
- Falha/limite da API do GitHub → mensagem clara + retry; nunca vaza token.
- `/api/og` com username inválido → card genérico de erro (não quebra o unfurl).

## 10. Testes

- `lib/github`: testes de **agregação** com fixtures de resposta GraphQL/REST
  (streak, top linguagens, dia/mês). Sem chamada de rede real (mock do fetch).
- `lib/personality`: tabela de casos entrada→label cobrindo cada regra.
- Ferramenta: Vitest.

## 11. Deploy

- Vercel. Env: `GITHUB_TOKEN` (PAT com escopo público / read). Sem segredo no client.
- OG image via `/api/og/[u]` referenciada nas meta tags de `/[username]`.
