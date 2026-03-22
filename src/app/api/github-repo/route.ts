import dotenv from "dotenv";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createArcjet, enforceArcjet } from "@/lib/arcjetHelpers";
import { parseGithubRepoRef } from "@/lib/parseGithubUrl";
import type { GithubRepoMeta } from "@/lib/cursorIntegrationBundle";

dotenv.config({ path: `.env.local` });

export const runtime = "nodejs";

const aj = createArcjet(30);

async function ghFetch(path: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "CursorDeskApp/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return fetch(`https://api.github.com${path}`, { headers });
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocked = await enforceArcjet(aj, request, user.id);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get("url") ?? "";
  const parsed = parseGithubRepoRef(urlParam);
  if (!parsed) {
    return NextResponse.json(
      { error: "URL GitHub invalide (attendu : https://github.com/owner/repo ou owner/repo)." },
      { status: 400 },
    );
  }

  const { owner, repo } = parsed;
  const repoRes = await ghFetch(`/repos/${owner}/${repo}`);
  if (repoRes.status === 404) {
    return NextResponse.json({ error: "Dépôt introuvable ou privé (sans token)." }, { status: 404 });
  }
  if (!repoRes.ok) {
    return NextResponse.json(
      { error: `GitHub API : ${repoRes.status}` },
      { status: 502 },
    );
  }

  const data = (await repoRes.json()) as {
    full_name?: string;
    description?: string | null;
    html_url?: string;
    clone_url?: string;
    default_branch?: string;
    topics?: string[];
    license?: { spdx_id?: string | null } | null;
  };

  const defaultBranch = data.default_branch ?? "main";
  let hasPackageJson = false;
  let packageName: string | null = null;

  const pkgRes = await ghFetch(
    `/repos/${owner}/${repo}/contents/package.json?ref=${encodeURIComponent(defaultBranch)}`,
  );
  if (pkgRes.ok) {
    const pkgJson = (await pkgRes.json()) as {
      content?: string;
      encoding?: string;
    };
    if (pkgJson.encoding === "base64" && pkgJson.content) {
      try {
        const decoded = Buffer.from(pkgJson.content, "base64").toString("utf8");
        const pkg = JSON.parse(decoded) as { name?: string };
        hasPackageJson = true;
        packageName = typeof pkg.name === "string" ? pkg.name : null;
      } catch {
        hasPackageJson = true;
      }
    }
  }

  const meta: GithubRepoMeta = {
    fullName: data.full_name ?? `${owner}/${repo}`,
    description: data.description ?? null,
    htmlUrl: data.html_url ?? `https://github.com/${owner}/${repo}`,
    cloneUrl: data.clone_url ?? `https://github.com/${owner}/${repo}.git`,
    defaultBranch,
    topics: Array.isArray(data.topics) ? data.topics : [],
    license: data.license?.spdx_id && data.license.spdx_id !== "NOASSERTION"
      ? data.license.spdx_id
      : null,
    hasPackageJson,
    packageName,
  };

  return NextResponse.json(meta);
}
