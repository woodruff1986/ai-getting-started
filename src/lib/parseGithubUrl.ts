const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/;

export type ParsedGithubRepo = {
  owner: string;
  repo: string;
};

/** Extrait owner/repo depuis une URL ou une chaîne `owner/repo`. */
export function parseGithubRepoRef(input: string): ParsedGithubRepo | null {
  const raw = input.trim();
  if (!raw) return null;

  const short = raw.match(/^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)$/);
  if (short) {
    const owner = short[1];
    const repo = short[2].replace(/\.git$/i, "");
    if (SAFE_SEGMENT.test(owner) && SAFE_SEGMENT.test(repo)) {
      return { owner, repo };
    }
    return null;
  }

  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") {
      return null;
    }
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    let repo = parts[1];
    if (repo.endsWith(".git")) repo = repo.slice(0, -4);
    if (!SAFE_SEGMENT.test(owner) || !SAFE_SEGMENT.test(repo)) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}
