import { ensureLocalKnowledgeSchema, getLocalKnowledgePool } from "@/lib/localKnowledgeDb";

export type ListFilesOptions = {
  sourceRoot: string;
  limit?: number;
  offset?: number;
};

export type SearchFilesOptions = {
  sourceRoot: string;
  query: string;
  limit?: number;
  offset?: number;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

function normalizeLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(limit, MAX_LIMIT));
}

function normalizeOffset(offset?: number) {
  if (!offset || Number.isNaN(offset)) return 0;
  return Math.max(0, offset);
}

export async function listIndexedFiles(options: ListFilesOptions) {
  await ensureLocalKnowledgeSchema();
  const db = getLocalKnowledgePool();
  const limit = normalizeLimit(options.limit);
  const offset = normalizeOffset(options.offset);

  const result = await db.query(
    `
      SELECT
        id,
        relative_path,
        absolute_path,
        file_name,
        extension,
        mime_type,
        file_size,
        modified_at,
        indexed_at
      FROM local_documents
      WHERE source_root = $1
      ORDER BY modified_at DESC
      LIMIT $2 OFFSET $3
    `,
    [options.sourceRoot, limit, offset],
  );

  const countResult = await db.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM local_documents WHERE source_root = $1",
    [options.sourceRoot],
  );

  return {
    files: result.rows,
    total: Number(countResult.rows[0]?.count || "0"),
    limit,
    offset,
  };
}

export async function searchIndexedFiles(options: SearchFilesOptions) {
  await ensureLocalKnowledgeSchema();
  const db = getLocalKnowledgePool();
  const limit = normalizeLimit(options.limit);
  const offset = normalizeOffset(options.offset);

  const term = options.query.trim();
  if (!term) {
    return {
      files: [],
      total: 0,
      limit,
      offset,
    };
  }

  const wildcardTerm = `%${term}%`;
  const textQuery = term
    .split(/\s+/)
    .filter(Boolean)
    .join(" & ");

  const result = await db.query(
    `
      SELECT
        id,
        relative_path,
        absolute_path,
        file_name,
        extension,
        mime_type,
        file_size,
        modified_at,
        indexed_at,
        content_preview
      FROM local_documents
      WHERE source_root = $1
        AND (
          file_name ILIKE $2
          OR relative_path ILIKE $2
          OR to_tsvector('simple', COALESCE(content_preview, '')) @@ to_tsquery('simple', $3)
        )
      ORDER BY modified_at DESC
      LIMIT $4 OFFSET $5
    `,
    [options.sourceRoot, wildcardTerm, textQuery || term, limit, offset],
  );

  const countResult = await db.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM local_documents
      WHERE source_root = $1
        AND (
          file_name ILIKE $2
          OR relative_path ILIKE $2
          OR to_tsvector('simple', COALESCE(content_preview, '')) @@ to_tsquery('simple', $3)
        )
    `,
    [options.sourceRoot, wildcardTerm, textQuery || term],
  );

  return {
    files: result.rows,
    total: Number(countResult.rows[0]?.count || "0"),
    limit,
    offset,
  };
}

export async function getIndexedFileById(fileId: number, sourceRoot: string) {
  await ensureLocalKnowledgeSchema();
  const db = getLocalKnowledgePool();
  const result = await db.query(
    `
      SELECT
        id,
        relative_path,
        absolute_path,
        file_name,
        extension,
        mime_type,
        file_size,
        modified_at,
        indexed_at,
        content_preview
      FROM local_documents
      WHERE id = $1 AND source_root = $2
      LIMIT 1
    `,
    [fileId, sourceRoot],
  );

  return result.rows[0] || null;
}
