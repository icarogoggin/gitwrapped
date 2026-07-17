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
