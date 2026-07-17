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
