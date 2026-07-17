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
