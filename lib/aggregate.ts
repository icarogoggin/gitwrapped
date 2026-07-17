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
