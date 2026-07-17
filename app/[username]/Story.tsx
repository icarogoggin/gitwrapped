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
