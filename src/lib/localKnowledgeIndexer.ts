import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { ensureLocalKnowledgeSchema, getLocalKnowledgePool } from "@/lib/localKnowledgeDb";

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".json",
  ".log",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".java",
  ".go",
  ".rb",
  ".sql",
  ".yaml",
  ".yml",
  ".xml",
  ".html",
  ".css",
]);

const DEFAULT_MAX_PREVIEW_BYTES = 20_000;

type IndexedFile = {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  extension: string;
  mimeType: string | null;
  fileSize: number;
  modifiedAt: Date;
  contentHash: string;
  contentPreview: string | null;
};

function guessMimeType(ext: string): string | null {
  switch (ext) {
    case ".txt":
    case ".log":
    case ".md":
    case ".markdown":
      return "text/plain";
    case ".csv":
      return "text/csv";
    case ".json":
      return "application/json";
    case ".html":
      return "text/html";
    case ".xml":
      return "application/xml";
    case ".ts":
    case ".tsx":
    case ".js":
    case ".jsx":
      return "application/javascript";
    case ".py":
      return "text/x-python";
    case ".css":
      return "text/css";
    case ".yaml":
    case ".yml":
      return "application/yaml";
    case ".sql":
      return "application/sql";
    default:
      return null;
  }
}

async function hashFile(absolutePath: string): Promise<string> {
  const hash = createHash("sha256");
  const stream = fs.createReadStream(absolutePath);
  return await new Promise((resolve, reject) => {
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function previewTextContent(absolutePath: string): Promise<string | null> {
  const ext = path.extname(absolutePath).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) {
    return null;
  }

  const handle = await fs.promises.open(absolutePath, "r");
  try {
    const buffer = Buffer.alloc(DEFAULT_MAX_PREVIEW_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, DEFAULT_MAX_PREVIEW_BYTES, 0);
    const raw = buffer.subarray(0, bytesRead).toString("utf8");
    return raw.replaceAll("\u0000", "").trim() || null;
  } finally {
    await handle.close();
  }
}

async function walkFiles(rootPath: string): Promise<string[]> {
  const queue = [rootPath];
  const files: string[] = [];

  while (queue.length > 0) {
    const current = queue.pop()!;
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") {
        continue;
      }
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  return files;
}

export function getDefaultSourcePath() {
  return (
    process.env.LOCAL_KNOWLEDGE_SOURCE_PATH ||
    "/mnt/d/Salariat - fonctionnariat"
  );
}

export async function indexLocalKnowledgeDirectory(sourcePath?: string) {
  const sourceRoot = path.resolve(sourcePath || getDefaultSourcePath());
  const stats = await fs.promises.stat(sourceRoot);
  if (!stats.isDirectory()) {
    throw new Error(`Source path is not a directory: ${sourceRoot}`);
  }

  await ensureLocalKnowledgeSchema();
  const db = getLocalKnowledgePool();
  const absoluteFiles = await walkFiles(sourceRoot);
  const indexedFiles: IndexedFile[] = [];

  for (const absolutePath of absoluteFiles) {
    const fileStats = await fs.promises.stat(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    const relativePath = path.relative(sourceRoot, absolutePath);
    const contentHash = await hashFile(absolutePath);
    const contentPreview = await previewTextContent(absolutePath);

    indexedFiles.push({
      absolutePath,
      relativePath,
      fileName: path.basename(absolutePath),
      extension: ext,
      mimeType: guessMimeType(ext),
      fileSize: fileStats.size,
      modifiedAt: fileStats.mtime,
      contentHash,
      contentPreview,
    });
  }

  const existingRows = await db.query<{ relative_path: string }>(
    "SELECT relative_path FROM local_documents WHERE source_root = $1",
    [sourceRoot],
  );

  const indexedPathSet = new Set(indexedFiles.map((item) => item.relativePath));
  const stalePaths = existingRows.rows
    .map((row) => row.relative_path)
    .filter((p) => !indexedPathSet.has(p));

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    for (const file of indexedFiles) {
      await client.query(
        `
          INSERT INTO local_documents (
            relative_path,
            absolute_path,
            file_name,
            extension,
            mime_type,
            file_size,
            content_hash,
            modified_at,
            indexed_at,
            content_preview,
            source_root
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,$10)
          ON CONFLICT (source_root, relative_path) DO UPDATE SET
            absolute_path = EXCLUDED.absolute_path,
            file_name = EXCLUDED.file_name,
            extension = EXCLUDED.extension,
            mime_type = EXCLUDED.mime_type,
            file_size = EXCLUDED.file_size,
            content_hash = EXCLUDED.content_hash,
            modified_at = EXCLUDED.modified_at,
            indexed_at = NOW(),
            content_preview = EXCLUDED.content_preview,
            source_root = EXCLUDED.source_root
        `,
        [
          file.relativePath,
          file.absolutePath,
          file.fileName,
          file.extension || null,
          file.mimeType,
          file.fileSize,
          file.contentHash,
          file.modifiedAt,
          file.contentPreview,
          sourceRoot,
        ],
      );
    }

    if (stalePaths.length > 0) {
      await client.query(
        "DELETE FROM local_documents WHERE source_root = $1 AND relative_path = ANY($2::text[])",
        [sourceRoot, stalePaths],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return {
    sourceRoot,
    indexedCount: indexedFiles.length,
    removedCount: stalePaths.length,
  };
}
