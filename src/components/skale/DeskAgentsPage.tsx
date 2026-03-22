"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_DESK_AGENT_ID,
  DESK_AGENTS,
  type DeskAgent,
} from "@/lib/deskAgents";
import { DESK_AGENT_STORAGE_KEY } from "@/lib/deskSkillsTypes";
import { Check } from "lucide-react";

export default function DeskAgentsPage() {
  const [currentId, setCurrentId] = useState(DEFAULT_DESK_AGENT_ID);

  useEffect(() => {
    try {
      const s = localStorage.getItem(DESK_AGENT_STORAGE_KEY);
      if (s && DESK_AGENTS.some((a) => a.id === s)) setCurrentId(s);
    } catch {
      /* ignore */
    }
  }, []);

  const choose = useCallback((a: DeskAgent) => {
    setCurrentId(a.id);
    try {
      localStorage.setItem(DESK_AGENT_STORAGE_KEY, a.id);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="skale-animate-in space-y-6 p-6 lg:p-8">
      <div>
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Agents prédéfinis
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Le persona choisi est injecté côté serveur (whitelist) dans le chat
          agent. Tu peux changer à tout moment ; la sélection par défaut est
          partagée avec la page « Agent & fichiers ».
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {DESK_AGENTS.map((a) => {
          const active = a.id === currentId;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => choose(a)}
                className="flex h-full w-full flex-col rounded-2xl border p-5 text-left transition hover:shadow-md"
                style={{
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  background: "var(--surface)",
                  boxShadow: active
                    ? "0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)"
                    : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className="font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {a.label}
                  </h3>
                  {active && (
                    <span
                      className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        background: "var(--accent-muted)",
                        color: "var(--accent)",
                      }}
                    >
                      <Check className="h-3 w-3" />
                      Défaut
                    </span>
                  )}
                </div>
                <p
                  className="mt-2 flex-1 text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {a.description}
                </p>
                <p
                  className="mt-3 line-clamp-3 text-xs leading-relaxed opacity-80"
                  style={{ color: "var(--text-muted)" }}
                >
                  {a.system}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
