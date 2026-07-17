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
