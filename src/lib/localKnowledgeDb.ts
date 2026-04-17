import { Pool } from "pg";

let pool: Pool | null = null;

export function getLocalKnowledgePool() {
  if (pool) return pool;

  const connectionString = process.env.LOCAL_KNOWLEDGE_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Expected env var LOCAL_KNOWLEDGE_DATABASE_URL for local knowledge database access.",
    );
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.LOCAL_KNOWLEDGE_DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  return pool;
}

export async function ensureLocalKnowledgeSchema() {
  const db = getLocalKnowledgePool();

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
    CREATE INDEX IF NOT EXISTS idx_local_documents_file_name
      ON local_documents (file_name);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_local_documents_modified_at
      ON local_documents (modified_at DESC);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_local_documents_relative_path
      ON local_documents (relative_path);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_local_documents_content_preview_fts
      ON local_documents USING GIN (to_tsvector('simple', COALESCE(content_preview, '')));
  `);
}
