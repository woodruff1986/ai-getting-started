# AI Getting Started

## Overview

Single Next.js 14 application (App Router) combining two AI demo features:
1. **Text-to-Image** — Uses Replicate API (Stable Diffusion)
2. **Q&A on Documents (RAG)** — Uses OpenAI + Pinecone (or Supabase pgvector)

Authentication via Clerk; rate limiting via Arcjet.

## Cursor Cloud specific instructions

### Running the dev server

```bash
npm run dev
```

The server runs on port 3000. Clerk auth middleware intercepts all routes — without valid `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`, every page returns HTTP 500 with "Publishable key not valid". This is expected behavior, not a build/code error.

### Required environment variables

Copy `.env.local.example` to `.env.local` and fill in real values. At minimum for the app to serve pages:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` (required for any page to load)
- `OPENAI_API_KEY` (for Q&A feature)
- `PINECONE_API_KEY` / `PINECONE_INDEX` (for Q&A vector store)

Optional:
- `REPLICATE_API_TOKEN` (text-to-image feature only)
- `ARCJET_KEY` (rate limiting)
- `SUPABASE_URL` / `SUPABASE_PRIVATE_KEY` (alternative to Pinecone)

### Lint, build, test

- Lint: `npm run lint`
- Build: `npm run build`
- Dev: `npm run dev`

No automated test suite exists in this project.

### Key gotchas

- `hnswlib-node` is a native dependency compiled during `npm install`. If you see build errors, ensure `python3`, `make`, and `g++` are available.
- The project uses `package-lock.json` (npm). Do not mix with yarn/pnpm.
- Node.js 20 LTS is the recommended runtime (per Dockerfile).
