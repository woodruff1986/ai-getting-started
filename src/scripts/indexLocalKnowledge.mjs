import { createHash } from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Pool } = pg;

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

function getPool() {
  const connectionString = process.env.LOCAL_KNOWLEDGE_DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing env var LOCAL_KNOWLEDGE_DATABASE_URL.");
  }
  return new Pool({
    connectionString,
    ssl: process.env.LOCAL_KNOWLEDGE_DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
}

async function ensureSchema(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS local_documents (
      id BIGSERIAL PRIMARY KEY,
      relative_path TEXT NOT NULL,
      absolute_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      extension TEXT,
      mime_type TEXT,
      file_size BIGINT NOT NULL,
      content_hash TEXT NOT NULL,
      modified_at TIMESTAMPTZ NOT NULL,
      indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      content_preview TEXT,
      source_root TEXT NOT NULL
    );
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_local_documents_source_relative_unique
      ON local_documents (source_root, relative_path);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_local_documents_modified_at
      ON local_documents (modified_at DESC);
  `);
}

function guessMimeType(ext) {
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

async function hashFile(absolutePath) {
  const hash = createHash("sha256");
  const stream = fs.createReadStream(absolutePath);
  return await new Promise((resolve, reject) => {
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function previewTextContent(absolutePath) {
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

async function walkFiles(rootPath) {
  const queue = [rootPath];
  const files = [];

  while (queue.length > 0) {
    const current = queue.pop();
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

async function main() {
  const sourcePathArg = process.argv[2];
  const sourceRoot = path.resolve(
    sourcePathArg || process.env.LOCAL_KNOWLEDGE_SOURCE_PATH || "/mnt/d/Salariat - fonctionnariat",
  );
  const stats = await fs.promises.stat(sourceRoot);
  if (!stats.isDirectory()) {
    throw new Error(`Source path is not a directory: ${sourceRoot}`);
  }

  const db = getPool();
  await ensureSchema(db);

  const files = await walkFiles(sourceRoot);
  const existingRows = await db.query(
    "SELECT relative_path FROM local_documents WHERE source_root = $1",
    [sourceRoot],
  );
  const existingPaths = new Set(existingRows.rows.map((r) => r.relative_path));
  const indexedPaths = new Set();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    for (const absolutePath of files) {
      const fileStats = await fs.promises.stat(absolutePath);
      const ext = path.extname(absolutePath).toLowerCase();
      const relativePath = path.relative(sourceRoot, absolutePath);
      const contentHash = await hashFile(absolutePath);
      const contentPreview = await previewTextContent(absolutePath);
      indexedPaths.add(relativePath);

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
          relativePath,
          absolutePath,
          path.basename(absolutePath),
          ext || null,
          guessMimeType(ext),
          fileStats.size,
          contentHash,
          fileStats.mtime,
          contentPreview,
          sourceRoot,
        ],
      );
    }

    const stalePaths = [...existingPaths].filter((p) => !indexedPaths.has(p));
    if (stalePaths.length > 0) {
      await client.query(
        "DELETE FROM local_documents WHERE source_root = $1 AND relative_path = ANY($2::text[])",
        [sourceRoot, stalePaths],
      );
    }

    await client.query("COMMIT");
    console.log(
      `Indexed ${files.length} files from ${sourceRoot}. Removed ${stalePaths.length} stale records.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await db.end();
  }
}

main().catch((error) => {
  console.error("Indexing failed:", error);
  process.exit(1);
});
