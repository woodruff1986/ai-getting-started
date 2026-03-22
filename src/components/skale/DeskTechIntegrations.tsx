"use client";

import { useCallback, useEffect, useState } from "react";
import type { GithubRepoMeta } from "@/lib/cursorIntegrationBundle";
import { buildCursorIntegrationBundle } from "@/lib/cursorIntegrationBundle";
import { parseGithubRepoRef } from "@/lib/parseGithubUrl";
import { DESK_TECH_STORAGE_KEY } from "@/lib/deskSkillsTypes";
import { Copy, Check, Trash2, RefreshCw, ExternalLink } from "lucide-react";

type TechEntry = {
  id: string;
  url: string;
  fullName: string;
  bundle: string;
  fetchedAt: string;
};

export default function DeskTechIntegrations() {
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TechEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DESK_TECH_STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) setEntries(p.filter((x: TechEntry) => x.id && x.bundle));
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const persist = useCallback(
    (update: TechEntry[] | ((prev: TechEntry[]) => TechEntry[])) => {
      setEntries((prev) => {
        const next = typeof update === "function" ? update(prev) : update;
        try {
          localStorage.setItem(DESK_TECH_STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  const fetchAndAdd = useCallback(async () => {
    const parsed = parseGithubRepoRef(urlInput);
    if (!parsed) {
      setError("URL invalide (ex. https://github.com/facebook/react ou facebook/react).");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/github-repo?url=${encodeURIComponent(urlInput.trim())}`,
      );
      const data = (await res.json().catch(() => null)) as
        | GithubRepoMeta
        | { error?: string }
        | null;
      if (!res.ok) {
        setError(
          (data && "error" in data && data.error) ||
            `Erreur ${res.status}`,
        );
        return;
      }
      if (!data || !("fullName" in data)) {
        setError("Réponse inattendue.");
        return;
      }
      const meta = data as GithubRepoMeta;
      const bundle = buildCursorIntegrationBundle(parsed, meta);
      const entry: TechEntry = {
        id: crypto.randomUUID(),
        url: urlInput.trim(),
        fullName: meta.fullName,
        bundle,
        fetchedAt: new Date().toISOString(),
      };
      persist((prev) => [
        entry,
        ...prev.filter((e) => e.fullName !== meta.fullName),
      ]);
      setUrlInput("");
    } catch {
      setError("Réseau ou parsing impossible.");
    } finally {
      setLoading(false);
    }
  }, [urlInput, persist]);

  const copyBundle = useCallback((id: string, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const remove = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((e) => e.id !== id));
    },
    [persist],
  );

  const refreshEntry = useCallback(
    async (e: TechEntry) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/github-repo?url=${encodeURIComponent(e.url)}`,
        );
        const data = (await res.json().catch(() => null)) as
          | GithubRepoMeta
          | { error?: string }
          | null;
        if (!res.ok) {
          setError(
            (data && "error" in data && data.error) || `Erreur ${res.status}`,
          );
          return;
        }
        if (!data || !("fullName" in data)) return;
        const meta = data as GithubRepoMeta;
        const ref = parseGithubRepoRef(e.url);
        if (!ref) return;
        const bundle = buildCursorIntegrationBundle(ref, meta);
        persist((prev) =>
          prev.map((x) =>
            x.id === e.id
              ? {
                  ...x,
                  bundle,
                  fetchedAt: new Date().toISOString(),
                  fullName: meta.fullName,
                }
              : x,
          ),
        );
      } catch {
        setError("Échec du rafraîchissement.");
      } finally {
        setLoading(false);
      }
    },
    [persist],
  );

  if (!ready) {
    return (
      <p className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>
        Chargement…
      </p>
    );
  }

  return (
    <div className="skale-animate-in space-y-6 p-6 lg:p-8">
      <div>
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Intégrations GitHub → Cursor
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Colle un lien de dépôt public : on récupère les métadonnées (API
          GitHub) et on génère un guide : clone, sous-module, prompt Composer,
          suggestion de règles Cursor. Optionnel :{" "}
          <code className="text-xs">GITHUB_TOKEN</code> côté serveur pour limites
          API plus hautes.
        </p>
      </div>

      <div
        className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://github.com/vercel/next.js ou vercel/next.js"
          className="min-w-0 flex-1 rounded-xl border-0 px-3 py-2.5 text-sm outline-none ring-1 ring-[var(--border)] focus:ring-2 focus:ring-[var(--ring)]"
          style={{
            background: "var(--background)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="button"
          onClick={() => void fetchAndAdd()}
          disabled={loading || !urlInput.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : null}
          Analyser & enregistrer
        </button>
      </div>

      {error && (
        <p className="text-sm text-rose-500" role="alert">
          {error}
        </p>
      )}

      <ul className="space-y-4">
        {entries.length === 0 && (
          <li
            className="rounded-xl border border-dashed p-6 text-center text-sm"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-muted)",
            }}
          >
            Aucune techno enregistrée. Ajoute un dépôt pour générer le pack
            d’intégration Cursor.
          </li>
        )}
        {entries.map((e) => (
          <li
            key={e.id}
            className="overflow-hidden rounded-2xl border"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
              <div>
                <a
                  href={`https://github.com/${e.fullName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold hover:underline"
                  style={{ color: "var(--accent)" }}
                >
                  {e.fullName}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  MAJ {new Date(e.fetchedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyBundle(e.id, e.bundle)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {copiedId === e.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedId === e.id ? "Copié" : "Copier le guide"}
                </button>
                <button
                  type="button"
                  onClick={() => void refreshEntry(e)}
                  disabled={loading}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Rafraîchir
                </button>
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  className="rounded-lg p-1.5 text-rose-500"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <pre
              className="max-h-72 overflow-auto p-4 text-xs leading-relaxed"
              style={{
                color: "var(--text-secondary)",
                background: "var(--background)",
              }}
            >
              {e.bundle}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
