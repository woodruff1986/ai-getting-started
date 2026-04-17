# Local knowledge base on external SSD

This setup lets the app index very large folders stored on an external SSD and query them through API routes.

## What is stored where

- Raw files: external SSD folder (example on Windows: `D:\Salariat - fonctionnariat`)
- Metadata index: PostgreSQL table `local_documents`
- API access:
  - `POST /api/local-knowledge/index` (index/re-index)
  - `GET /api/local-knowledge/files` (list/search)
  - `GET /api/local-knowledge/preview` (read preview)

## 1) Mount the SSD path for Linux runtime

If your app runs under WSL/Linux and source data is on Windows drive `D:`,
the folder is usually available under:

- `/mnt/d/Salariat - fonctionnariat`

Set this in env:

```bash
LOCAL_KNOWLEDGE_SOURCE_PATH="/mnt/d/Salariat - fonctionnariat"
```

If your SSD is mounted elsewhere, use that absolute Linux path.

## 2) Configure environment variables

Add to `.env.local`:

```bash
LOCAL_KNOWLEDGE_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/local_knowledge"
LOCAL_KNOWLEDGE_DB_SSL=false
LOCAL_KNOWLEDGE_SOURCE_PATH="/mnt/d/Salariat - fonctionnariat"
```

## 3) Start PostgreSQL (Docker example)

```bash
docker run --name local-knowledge-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=local_knowledge \
  -p 5432:5432 \
  -d postgres:16
```

## 4) Run initial indexing

Option A (recommended script):

```bash
npm run local-knowledge:index
```

Option B (override source path once):

```bash
npm run local-knowledge:index -- "/mnt/d/Salariat - fonctionnariat"
```

## 5) Use API routes

### Trigger indexing from API

```bash
curl -X POST http://localhost:3000/api/local-knowledge/index \
  -H "Content-Type: application/json" \
  -d '{"sourcePath":"/mnt/d/Salariat - fonctionnariat"}'
```

### List indexed files

```bash
curl "http://localhost:3000/api/local-knowledge/files?sourceRoot=/mnt/d/Salariat%20-%20fonctionnariat&limit=20&offset=0"
```

### Search indexed files

```bash
curl "http://localhost:3000/api/local-knowledge/files?sourceRoot=/mnt/d/Salariat%20-%20fonctionnariat&q=contrat"
```

### Read preview by id

```bash
curl "http://localhost:3000/api/local-knowledge/preview?id=1&sourceRoot=/mnt/d/Salariat%20-%20fonctionnariat&maxBytes=32000"
```

## Notes for very large directories

- Indexing is recursive and may take time on first run.
- Binary files are indexed by metadata/hash only.
- Text files also store a preview for full-text search.
- Re-indexing updates modified files and removes stale rows.
