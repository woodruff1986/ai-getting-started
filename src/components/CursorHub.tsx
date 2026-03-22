"use client";

import { useCallback, useState, type ReactNode } from "react";

type PromptTemplate = {
  id: string;
  title: string;
  description: string;
  text: string;
};

const MODES = [
  {
    name: "Chat",
    icon: "💬",
    summary:
      "Pose des questions sur ton code, demande des explications ou du débogage sans modifier les fichiers tout de suite.",
    tip: "Ouvre le panneau latéral, colle du contexte (@fichier) pour des réponses plus précises.",
  },
  {
    name: "Composer",
    icon: "✨",
    summary:
      "Idéal pour des changements multi-fichiers : décris la feature, laisse l’assistant proposer un diff clair.",
    tip: "Une consigne à la fois : objectif, contraintes, style de code attendu.",
  },
  {
    name: "Agent",
    icon: "🤖",
    summary:
      "Pour des tâches plus longues : exploration du dépôt, exécution de commandes, itérations jusqu’au résultat.",
    tip: "Précise les fichiers ou dossiers à ne pas toucher et ce qui doit rester inchangé.",
  },
] as const;

const SHORTCUTS = [
  {
    action: "Ouvrir le chat",
    keys: { mac: "⌘ L", win: "Ctrl + L" },
  },
  {
    action: "Composer",
    keys: { mac: "⌘ I", win: "Ctrl + I" },
  },
  {
    action: "Palette de commandes",
    keys: { mac: "⌘ ⇧ P", win: "Ctrl + Shift + P" },
  },
  {
    action: "Recherche de fichiers",
    keys: { mac: "⌘ P", win: "Ctrl + P" },
  },
] as const;

const PROMPTS: PromptTemplate[] = [
  {
    id: "explain",
    title: "Comprendre un fichier",
    description: "Vue d’ensemble rapide avant de modifier.",
    text: "Explique ce fichier comme à un·e dev qui découvre le projet : rôle, flux principal, pièges éventuels. Ne propose pas encore de refactor.",
  },
  {
    id: "bug",
    title: "Corriger un bug",
    description: "Reproduction + hypothèse + correctif minimal.",
    text: "Voici le symptôme : [décris]. Étapes pour reproduire : [liste]. Cherche la cause probable, propose le correctif le plus petit possible avec tests ou vérifs manuelles.",
  },
  {
    id: "feature",
    title: "Nouvelle fonctionnalité",
    description: "Cadrage pour éviter le hors-sujet.",
    text: "Objectif utilisateur : […]. Contraintes : [perf, accessibilité, rétrocompat…]. Fichiers probablement impactés : […]. Propose un plan en étapes puis implémente la première étape seulement.",
  },
  {
    id: "review",
    title: "Revue de code",
    description: "Sécurité, lisibilité, edge cases.",
    text: "Fais une revue de ce diff : bugs logiques, edge cases, nommage, duplication, risques sécurité/perf. Classe par gravité (bloquant / important / nit).",
  },
];

const TIPS = [
  "Mentionne @fichier ou @dossier pour ancrer la réponse dans ton code.",
  "Donne des exemples d’entrée/sortie attendus quand tu demandes une fonction.",
  "Si la réponse est trop vague, demande explicitement « montre le diff » ou « limite-toi à ce fichier ».",
  "Pour les refactors, demande d’abord un plan court validé avant le gros patch.",
  "Garde une branche Git propre : commits petits = retours plus simples avec l’IA.",
];

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-xs text-slate-200 shadow-sm">
      {children}
    </kbd>
  );
}

function CopyPromptButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={copy}
      className="mt-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/40 transition hover:from-sky-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-950"
    >
      {done ? "Copié dans le presse-papiers" : "Copier le prompt"}
    </button>
  );
}

export default function CursorHub() {
  const [platform, setPlatform] = useState<"mac" | "win">("mac");

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 pb-24 pt-24 text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgb(56 189 248 / 0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgb(167 139 250 / 0.15), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <header className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-sky-300/90">
            Guide Cursor
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Une interface simple pour mieux utiliser Cursor
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            Raccourcis, modes (Chat, Composer, Agent) et prompts prêts à coller.
            Garde cette page ouverte à côté de l’éditeur pendant que tu codes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="text-sm text-slate-500">Touches affichées pour :</span>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setPlatform("mac")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  platform === "mac"
                    ? "bg-white/15 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                macOS
              </button>
              <button
                type="button"
                onClick={() => setPlatform("win")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  platform === "win"
                    ? "bg-white/15 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Windows / Linux
              </button>
            </div>
          </div>
        </header>

        <section className="mt-20" aria-labelledby="modes-heading">
          <h2
            id="modes-heading"
            className="text-2xl font-semibold text-white"
          >
            Les trois façons de travailler
          </h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            Choisis le mode selon la taille de la tâche — pas besoin de tout
            mélanger en un seul message.
          </p>
          <ul className="mt-10 grid gap-6 sm:grid-cols-3">
            {MODES.map((mode) => (
              <li
                key={mode.name}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-sm transition hover:border-sky-400/30 hover:bg-white/[0.06]"
              >
                <span className="text-3xl" aria-hidden>
                  {mode.icon}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {mode.name}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                  {mode.summary}
                </p>
                <p className="mt-4 rounded-lg bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-200/90">
                  <span className="font-semibold text-sky-300">Astuce · </span>
                  {mode.tip}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20" aria-labelledby="shortcuts-heading">
          <h2
            id="shortcuts-heading"
            className="text-2xl font-semibold text-white"
          >
            Raccourcis utiles
          </h2>
          <p className="mt-2 text-slate-400">
            Les combinaisons peuvent varier selon ta config — vérifie dans les
            préférences Cursor si besoin.
          </p>
          <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  <th scope="col" className="px-5 py-3 font-semibold text-slate-300">
                    Action
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold text-slate-300">
                    Raccourci
                  </th>
                </tr>
              </thead>
              <tbody>
                {SHORTCUTS.map((row) => (
                  <tr
                    key={row.action}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4 text-slate-300">{row.action}</td>
                    <td className="px-5 py-4">
                      <Kbd>
                        {platform === "mac" ? row.keys.mac : row.keys.win}
                      </Kbd>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-20" aria-labelledby="prompts-heading">
          <h2
            id="prompts-heading"
            className="text-2xl font-semibold text-white"
          >
            Prompts prêts à l’emploi
          </h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            Clique sur « Copier le prompt », puis colle dans Cursor (chat ou
            composer). Adapte les parties entre crochets.
          </p>
          <ul className="mt-10 space-y-6">
            {PROMPTS.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
              >
                <h3 className="text-lg font-semibold text-white">{p.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{p.description}</p>
                <blockquote className="mt-4 rounded-xl border border-white/5 bg-black/20 p-4 font-mono text-sm leading-relaxed text-slate-300">
                  {p.text}
                </blockquote>
                <CopyPromptButton text={p.text} />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20" aria-labelledby="tips-heading">
          <h2 id="tips-heading" className="text-2xl font-semibold text-white">
            Bonnes habitudes
          </h2>
          <ul className="mt-8 space-y-3">
            {TIPS.map((tip, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-slate-300"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="pt-0.5 text-sm leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-20 border-t border-white/10 pt-10 text-center text-sm text-slate-500">
          <p>
            Documentation officielle :{" "}
            <a
              href="https://cursor.com/docs"
              className="font-medium text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              cursor.com/docs
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
