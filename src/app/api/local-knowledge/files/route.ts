import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getDefaultSourcePath } from "@/lib/localKnowledgeIndexer";
import { listIndexedFiles, searchIndexedFiles } from "@/lib/localKnowledgeQuery";

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const sourceRoot = url.searchParams.get("sourceRoot") || getDefaultSourcePath();
    const q = url.searchParams.get("q") || "";
    const limit = parseNumber(url.searchParams.get("limit"));
    const offset = parseNumber(url.searchParams.get("offset"));

    const result = q.trim()
      ? await searchIndexedFiles({ sourceRoot, query: q, limit, offset })
      : await listIndexedFiles({ sourceRoot, limit, offset });

    return NextResponse.json({
      sourceRoot,
      query: q || null,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to list indexed files.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
