"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Github,
  MessageCircle,
  Puzzle,
  Sparkles,
  Terminal,
} from "lucide-react";

const cards = [
  {
    title: "Agent & fichiers",
    desc: "Chat avec pièces jointes (tous types), export des réponses et de la discussion.",
    href: "/skale/chat",
    icon: MessageCircle,
    cta: "Ouvrir",
  },
  {
    title: "Guide Cursor",
    desc: "Modes Chat / Composer / Agent, raccourcis clavier, prompts prêts à copier.",
    href: "/skale/guide",
    icon: BookOpen,
    cta: "Ouvrir",
  },
  {
    title: "Agents prédéfinis",
    desc: "Personas (dev, revue, archi, debug, docs, sécurité) — choix partagé avec le chat.",
    href: "/skale/agents",
    icon: Bot,
    cta: "Configurer",
  },
  {
    title: "Skills",
    desc: "Consignes métier persistées dans le navigateur, injectées dans chaque message.",
    href: "/skale/skills",
    icon: Puzzle,
    cta: "Gérer",
  },
  {
    title: "GitHub → Cursor",
    desc: "Analyse de dépôts publics et guide d’intégration (clone, Composer, .cursor/rules).",
    href: "/skale/tech",
    icon: Github,
    cta: "Ajouter",
  },
  {
    title: "Démos du dépôt",
    desc: "Exemples Text-to-image et Q&A du template d’origine.",
    href: "/",
    icon: Sparkles,
    cta: "Voir",
  },
];

export default function SkaleDashboard() {
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="skale-animate-in p-6 lg:p-8">
      <div
        className="relative mb-8 overflow-hidden rounded-2xl border p-8"
        style={{
          borderColor: "var(--border)",
          background:
            "linear-gradient(135deg, var(--surface) 0%, var(--background) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse at top right, var(--accent-muted), transparent 65%)",
          }}
        />
        <div className="relative max-w-2xl">
          <h2
            className="text-2xl font-bold lg:text-3xl"
            style={{ color: "var(--text-primary)" }}
          >
            {greet} — prêt pour Cursor
          </h2>
          <p
            className="mt-3 text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Ce tableau regroupe une interface stable orientée éditeur : agent avec
            fichiers, guide d’usage, et accès aux démos du projet. Utilise-le en
            second écran à côté de l’IDE.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: "var(--accent-muted)",
                color: "var(--accent)",
              }}
            >
              <Terminal className="h-3 w-3" />
              Flux de travail dev
            </span>
          </div>
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.href}>
              <Link
                href={c.href}
                className="group flex h-full flex-col rounded-2xl border p-6 transition hover:shadow-md"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                }}
              >
                <Icon
                  className="h-8 w-8"
                  style={{ color: "var(--accent)" }}
                  strokeWidth={1.75}
                />
                <h3
                  className="mt-4 text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {c.title}
                </h3>
                <p
                  className="mt-2 flex-1 text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {c.desc}
                </p>
                <span
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  {c.cta}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p
        className="mt-10 max-w-2xl text-xs leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        Desk Cursor est une interface web dédiée à ton dépôt ; ce n’est pas
        l’application desktop Skales. Pour l’agent système complet (email,
        calendrier, etc.), voir le projet officiel sur GitHub.
      </p>
    </div>
  );
}
