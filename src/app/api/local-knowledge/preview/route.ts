import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getDefaultSourcePath } from "@/lib/localKnowledgeIndexer";
import { getIndexedFileById } from "@/lib/localKnowledgeQuery";

const DEFAULT_PREVIEW_BYTES = 32_000;

function readPreviewBytesParam(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("maxBytes");
  if (!raw) return DEFAULT_PREVIEW_BYTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PREVIEW_BYTES;
  return Math.min(parsed, 200_000);
}

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sourceRoot = req.nextUrl.searchParams.get("sourceRoot") || getDefaultSourcePath();
    const idRaw = req.nextUrl.searchParams.get("id");
    const maxBytes = readPreviewBytesParam(req);

    if (!idRaw) {
      return NextResponse.json(
        { error: "Missing required query param: id" },
        { status: 400 },
      );
    }

    const fileId = Number(idRaw);
    if (!Number.isInteger(fileId) || fileId <= 0) {
      return NextResponse.json(
        { error: "Query param id must be a positive integer." },
        { status: 400 },
      );
    }

    const file = await getIndexedFileById(fileId, sourceRoot);
    if (!file) {
      return NextResponse.json({ error: "File not found in index." }, { status: 404 });
    }

    const handle = await fs.promises.open(file.absolute_path, "r");
    try {
      const buffer = Buffer.alloc(maxBytes);
      const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
      const content = buffer.subarray(0, bytesRead).toString("utf8").replaceAll("\u0000", "");
      return NextResponse.json({
        file: {
          id: file.id,
          relativePath: file.relative_path,
          absolutePath: file.absolute_path,
          fileName: file.file_name,
          mimeType: file.mime_type,
          fileSize: Number(file.file_size),
          modifiedAt: file.modified_at,
        },
        preview: content,
        bytesRead,
      });
    } finally {
      await handle.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
