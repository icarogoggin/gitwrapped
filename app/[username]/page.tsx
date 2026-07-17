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
