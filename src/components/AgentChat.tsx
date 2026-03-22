"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import clsx from "clsx";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useDeskSkills } from "@/hooks/useDeskSkills";
import { DESK_AGENTS, DEFAULT_DESK_AGENT_ID } from "@/lib/deskAgents";
import {
  DEFAULT_DESK_CHAT_MODEL_ID,
  getDeskChatModelLabel,
  getEnabledDeskChatModels,
} from "@/lib/deskChatModels";
import {
  DESK_AGENT_STORAGE_KEY,
  DESK_CHAT_MODEL_STORAGE_KEY,
} from "@/lib/deskSkillsTypes";
import DeskModelPickerModal from "@/components/skale/DeskModelPickerModal";

type AttachedFile = {
  id: string;
  file: File;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  files?: AttachedFile[];
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadText(content: string, filename: string) {
  downloadBlob(
    new Blob([content], { type: "text/plain;charset=utf-8" }),
    filename,
  );
}

export default function AgentChat({ embedded = false }: { embedded?: boolean }) {
  const inputId = useId();
  const agentSelectId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { skills, ready: skillsReady } = useDeskSkills();
  const [agentId, setAgentId] = useState(DEFAULT_DESK_AGENT_ID);
  const [modelId, setModelId] = useState(DEFAULT_DESK_CHAT_MODEL_ID);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [assistantDraft, setAssistantDraft] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(DESK_AGENT_STORAGE_KEY);
      if (s && DESK_AGENTS.some((a) => a.id === s)) setAgentId(s);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DESK_AGENT_STORAGE_KEY, agentId);
    } catch {
      /* ignore */
    }
  }, [agentId]);

  useEffect(() => {
    try {
      const s = localStorage.getItem(DESK_CHAT_MODEL_STORAGE_KEY);
      if (
        s &&
        getEnabledDeskChatModels().some((m) => m.id === s)
      ) {
        setModelId(s);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DESK_CHAT_MODEL_STORAGE_KEY, modelId);
    } catch {
      /* ignore */
    }
  }, [modelId]);

  const addFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list);
    setAttachments((prev) => {
      const next = [...prev];
      for (const file of arr) {
        if (file.size === 0) continue;
        next.push({ id: crypto.randomUUID(), file });
      }
      return next;
    });
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files?.length) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    const userFiles = attachments.map((a) => ({ ...a }));
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text || "(Fichiers uniquement)",
      files: userFiles.length ? userFiles : undefined,
    };

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setAttachments([]);
    setAssistantDraft("");
    setIsSending(true);

    const fd = new FormData();
    fd.append("prompt", userMsg.content);
    fd.append("agentId", agentId);
    fd.append("modelId", modelId);
    fd.append(
      "skills",
      JSON.stringify(
        skillsReady
          ? skills.map((s) => ({
              name: s.name,
              instruction: s.instruction,
            }))
          : [],
      ),
    );
    for (const { file } of userFiles) {
      fd.append("files", file, file.name);
    }

    try {
      const res = await fetch("/api/agent-chat", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setAssistantDraft(null);
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Erreur (${res.status}) : ${err?.error || "requête refusée"}`,
          },
        ]);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setAssistantDraft(null);
        return;
      }

      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setAssistantDraft(full);
      }

      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: full },
      ]);
      setAssistantDraft(null);
    } catch {
      setAssistantDraft(null);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Erreur réseau ou coupure du flux. Vérifie ta connexion et réessaie.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [attachments, input, agentId, modelId, skills, skillsReady]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div
      className={clsx(
        "flex flex-col",
        embedded
          ? "min-h-0 flex-1 bg-[var(--background)] text-[color:var(--text-primary)]"
          : "min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100",
      )}
    >
      <div
        className={clsx(
          "border-b px-4 py-4 sm:px-8",
          embedded
            ? "border-[var(--border)] bg-[var(--surface)]"
            : "border-white/10 bg-slate-900/80 backdrop-blur",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {!embedded && (
              <h1 className="text-xl font-semibold text-white">Chat agent</h1>
            )}
            {embedded ? (
              <p className="max-w-3xl text-xs text-[color:var(--text-secondary)]">
                Fichiers illimités en type · 25 max · 20 Mo chacun · télécharge
                pièces et réponses ci-dessous.
              </p>
            ) : (
              <p className="mt-1 max-w-3xl text-sm text-slate-400">
                Ajoute n’importe quel type de fichier (glisser-déposer ou bouton).
                Les images et le texte sont analysés ; les PDF sont lus quand c’est
                possible ; les binaires sont signalés sans contenu brut. Télécharge
                tes pièces jointes ou la réponse depuis les boutons sous chaque
                bloc.
              </p>
            )}
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                let md = "";
                for (const m of messages) {
                  md += `## ${m.role === "user" ? "Toi" : "Agent"}\n\n`;
                  if (m.files?.length) {
                    md +=
                      "**Fichiers :** " +
                      m.files.map((a) => a.file.name).join(", ") +
                      "\n\n";
                  }
                  md += m.content + "\n\n";
                }
                downloadText(`conversation-${Date.now()}.md`, md);
              }}
              className={clsx(
                "shrink-0 rounded-xl border px-4 py-2 text-sm font-medium",
                embedded
                  ? "border-[var(--border)] bg-[var(--surface-light)] text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
                  : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10",
              )}
            >
              Exporter la discussion (.md)
            </button>
          )}
        </div>
      </div>

      <div
        className={clsx(
          "flex flex-wrap items-center gap-3 border-b px-4 py-2.5 sm:px-8",
          embedded
            ? "border-[var(--border)] bg-[var(--surface-light)]"
            : "border-white/10 bg-slate-900/50",
        )}
      >
        <label
          htmlFor={agentSelectId}
          className={clsx(
            "text-xs font-medium uppercase tracking-wide",
            embedded ? "text-[color:var(--text-muted)]" : "text-slate-500",
          )}
        >
          Agent
        </label>
        <select
          id={agentSelectId}
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className={clsx(
            "max-w-[min(100%,220px)] rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2",
            embedded
              ? "border-[var(--border)] bg-[var(--background)] text-[color:var(--text-primary)] focus:ring-[var(--ring)]"
              : "border-white/15 bg-black/30 text-white focus:ring-sky-500",
          )}
        >
          {DESK_AGENTS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <span
          className={clsx(
            "hidden h-4 w-px shrink-0 sm:block",
            embedded ? "bg-[var(--border)]" : "bg-white/15",
          )}
          aria-hidden
        />
        <span
          className={clsx(
            "text-xs font-medium uppercase tracking-wide",
            embedded ? "text-[color:var(--text-muted)]" : "text-slate-500",
          )}
        >
          Modèle
        </span>
        <button
          type="button"
          onClick={() => setModelPickerOpen(true)}
          className={clsx(
            "inline-flex max-w-full items-center gap-1.5 rounded-lg border px-3 py-1.5 text-left text-sm font-medium transition",
            embedded
              ? "border-[var(--border)] bg-[var(--background)] text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
              : "border-white/15 bg-black/30 text-white hover:bg-black/40",
          )}
        >
          <Sparkles
            className={clsx(
              "h-3.5 w-3.5 shrink-0",
              embedded ? "text-[var(--accent)]" : "text-sky-400",
            )}
          />
          <span className="truncate">{getDeskChatModelLabel(modelId)}</span>
        </button>
        <span
          className={clsx(
            "text-xs",
            embedded ? "text-[color:var(--text-muted)]" : "text-slate-500",
          )}
        >
          {skillsReady
            ? skills.length > 0
              ? `${skills.length} skill(s) actif(s)`
              : "Aucun skill"
            : "Skills…"}
        </span>
        {skillsReady && skills.length === 0 && (
          <Link
            href="/skale/skills"
            className={
              embedded
                ? "text-xs font-medium text-[var(--accent)] hover:underline"
                : "text-xs font-medium text-sky-400 hover:text-sky-300"
            }
          >
            Ajouter des skills
          </Link>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {messages.length === 0 && !assistantDraft && (
            <div
              className={clsx(
                "mx-auto max-w-3xl rounded-2xl border border-dashed p-8 text-center",
                embedded
                  ? "border-[var(--border)] bg-[var(--surface)] text-[color:var(--text-muted)]"
                  : "border-white/15 bg-white/[0.02] text-slate-500",
              )}
            >
              <p
                className={
                  embedded
                    ? "text-[color:var(--text-secondary)]"
                    : "text-slate-400"
                }
              >
                Écris un message et joins des fichiers si tu veux. Raccourci
                envoi :{" "}
                <kbd
                  className={clsx(
                    "rounded border px-1.5 py-0.5 font-mono text-xs",
                    embedded
                      ? "border-[var(--border)] bg-[var(--surface-light)] text-[color:var(--text-secondary)]"
                      : "border-white/20 bg-white/5 text-slate-300",
                  )}
                >
                  Ctrl
                </kbd>{" "}
                +{" "}
                <kbd
                  className={clsx(
                    "rounded border px-1.5 py-0.5 font-mono text-xs",
                    embedded
                      ? "border-[var(--border)] bg-[var(--surface-light)] text-[color:var(--text-secondary)]"
                      : "border-white/20 bg-white/5 text-slate-300",
                  )}
                >
                  Entrée
                </kbd>{" "}
                ({" "}
                <kbd
                  className={clsx(
                    "rounded border px-1.5 py-0.5 font-mono text-xs",
                    embedded
                      ? "border-[var(--border)] bg-[var(--surface-light)] text-[color:var(--text-secondary)]"
                      : "border-white/20 bg-white/5 text-slate-300",
                  )}
                >
                  ⌘
                </kbd>{" "}
                + Entrée sur Mac).
              </p>
            </div>
          )}

          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.map((msg) => (
              <article
                key={msg.id}
                className={clsx(
                  "rounded-2xl border px-4 py-4 sm:px-5 sm:py-5",
                  embedded
                    ? msg.role === "user"
                      ? "border-[var(--accent)]/30 bg-[var(--accent-muted)]"
                      : "border-[var(--border)] bg-[var(--surface)]"
                    : msg.role === "user"
                      ? "border-sky-500/25 bg-sky-500/5"
                      : "border-violet-500/25 bg-violet-500/5",
                )}
              >
                <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={clsx(
                      "text-xs font-semibold uppercase tracking-wide",
                      embedded
                        ? "text-[color:var(--text-muted)]"
                        : "text-slate-400",
                    )}
                  >
                    {msg.role === "user" ? "Toi" : "Agent"}
                  </span>
                  {msg.role === "assistant" && msg.content && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadText(
                          `reponse-agent-${msg.id.slice(0, 8)}.txt`,
                          msg.content,
                        )
                      }
                      className={clsx(
                        "rounded-lg border px-3 py-1 text-xs font-medium",
                        embedded
                          ? "border-[var(--border)] bg-[var(--surface-light)] text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
                          : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10",
                      )}
                    >
                      Télécharger la réponse (.txt)
                    </button>
                  )}
                </header>

                {msg.files && msg.files.length > 0 && (
                  <ul className="mb-3 flex flex-wrap gap-2">
                    {msg.files.map((a) => (
                      <li
                        key={a.id}
                        className={clsx(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                          embedded
                            ? "border-[var(--border)] bg-[var(--surface-light)]"
                            : "border-white/10 bg-black/30",
                        )}
                      >
                        <span
                          className={clsx(
                            "max-w-[200px] truncate font-medium",
                            embedded
                              ? "text-[color:var(--text-primary)]"
                              : "text-slate-200",
                          )}
                        >
                          {a.file.name}
                        </span>
                        <span
                          className={
                            embedded
                              ? "text-[color:var(--text-muted)]"
                              : "text-slate-500"
                          }
                        >
                          {a.file.type || "type inconnu"} ·{" "}
                          {formatBytes(a.file.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            downloadBlob(a.file, a.file.name || "fichier")
                          }
                          className={
                            embedded
                              ? "ml-1 text-[var(--accent)] hover:text-[var(--accent-hover)]"
                              : "ml-1 text-sky-400 hover:text-sky-300"
                          }
                        >
                          Télécharger
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <p
                  className={clsx(
                    "whitespace-pre-wrap text-sm leading-relaxed",
                    embedded
                      ? "text-[color:var(--text-primary)]"
                      : "text-slate-200",
                  )}
                >
                  {msg.content}
                </p>
              </article>
            ))}

            {assistantDraft !== null && (
              <article
                className={clsx(
                  "rounded-2xl border px-4 py-4 sm:px-5 sm:py-5",
                  embedded
                    ? "border-[var(--accent)]/35 bg-[var(--accent-muted)]"
                    : "border-violet-500/30 bg-violet-500/10",
                )}
              >
                <header className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={clsx(
                      "text-xs font-semibold uppercase tracking-wide",
                      embedded
                        ? "text-[color:var(--text-muted)]"
                        : "text-slate-400",
                    )}
                  >
                    Agent
                  </span>
                  {assistantDraft && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadText(
                          "reponse-agent-en-cours.txt",
                          assistantDraft,
                        )
                      }
                      className={clsx(
                        "rounded-lg border px-3 py-1 text-xs font-medium",
                        embedded
                          ? "border-[var(--border)] bg-[var(--surface-light)] text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
                          : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10",
                      )}
                    >
                      Télécharger le brouillon
                    </button>
                  )}
                </header>
                <p
                  className={clsx(
                    "whitespace-pre-wrap text-sm leading-relaxed",
                    embedded
                      ? "text-[color:var(--text-primary)]"
                      : "text-slate-200",
                  )}
                >
                  {assistantDraft || (
                    <span
                      className={clsx(
                        "inline-flex items-center gap-2",
                        embedded
                          ? "text-[color:var(--text-muted)]"
                          : "text-slate-500",
                      )}
                    >
                      <span
                        className={clsx(
                          "h-2 w-2 animate-pulse rounded-full",
                          embedded ? "bg-[var(--accent)]" : "bg-violet-400",
                        )}
                      />
                      Réflexion…
                    </span>
                  )}
                </p>
              </article>
            )}

          </div>
        </div>

        <div
          className={clsx(
            "border-t px-4 py-4 sm:px-8",
            embedded
              ? "border-[var(--border)] bg-[var(--surface)]"
              : "border-white/10 bg-slate-900/90 backdrop-blur",
          )}
        >
          <div className="mx-auto max-w-3xl">
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                if (e.currentTarget === e.target) setDragActive(false);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className={clsx(
                "rounded-2xl border-2 border-dashed transition",
                dragActive
                  ? embedded
                    ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                    : "border-sky-400 bg-sky-500/10"
                  : embedded
                    ? "border-[var(--border)] bg-[var(--surface-light)]"
                    : "border-white/10 bg-white/[0.03]",
              )}
            >
              {attachments.length > 0 && (
                <ul
                  className={clsx(
                    "flex flex-wrap gap-2 border-b p-3",
                    embedded
                      ? "border-[var(--border)]"
                      : "border-white/10",
                  )}
                >
                  {attachments.map((a) => (
                    <li
                      key={a.id}
                      className={clsx(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
                        embedded
                          ? "bg-[var(--background)]"
                          : "bg-black/40",
                      )}
                    >
                      <span
                        className={
                          embedded
                            ? "max-w-[180px] truncate text-[color:var(--text-primary)]"
                            : "max-w-[180px] truncate text-slate-200"
                        }
                      >
                        {a.file.name}
                      </span>
                      <span
                        className={
                          embedded
                            ? "text-[color:var(--text-muted)]"
                            : "text-slate-500"
                        }
                      >
                        {formatBytes(a.file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          downloadBlob(a.file, a.file.name || "fichier")
                        }
                        className={
                          embedded
                            ? "text-[var(--accent)] hover:text-[var(--accent-hover)]"
                            : "text-sky-400 hover:text-sky-300"
                        }
                      >
                        Télécharger
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAttachment(a.id)}
                        className={
                          embedded
                            ? "text-[color:var(--text-muted)] hover:text-rose-500"
                            : "text-slate-500 hover:text-rose-400"
                        }
                        aria-label={`Retirer ${a.file.name}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="p-3 sm:p-4">
                <label htmlFor={inputId} className="sr-only">
                  Message
                </label>
                <textarea
                  id={inputId}
                  rows={3}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Pose ta question ou décris ce que tu veux faire avec les fichiers…"
                  className={clsx(
                    "w-full resize-none rounded-xl border-0 px-4 py-3 text-sm focus:ring-2",
                    embedded
                      ? "bg-[var(--background)] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:ring-[var(--ring)]"
                      : "bg-black/30 text-white placeholder:text-slate-500 focus:ring-sky-500",
                  )}
                  disabled={isSending}
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept="*/*"
                    onChange={(e) => {
                      if (e.target.files?.length) addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending}
                    className={clsx(
                      "rounded-xl border px-4 py-2.5 text-sm font-medium disabled:opacity-50",
                      embedded
                        ? "border-[var(--border)] bg-[var(--surface-light)] text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
                        : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10",
                    )}
                  >
                    Joindre des fichiers
                  </button>
                  <button
                    type="button"
                    onClick={() => void send()}
                    disabled={
                      isSending || (!input.trim() && attachments.length === 0)
                    }
                    className={clsx(
                      "rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40",
                      embedded
                        ? "bg-[var(--accent)] shadow-md hover:bg-[var(--accent-hover)]"
                        : "bg-gradient-to-r from-sky-500 to-violet-600 shadow-lg shadow-sky-900/30 hover:from-sky-400 hover:to-violet-500",
                    )}
                  >
                    {isSending ? "Envoi…" : "Envoyer"}
                  </button>
                  <span
                    className={
                      embedded
                        ? "text-xs text-[color:var(--text-muted)]"
                        : "text-xs text-slate-500"
                    }
                  >
                    Jusqu’à 25 fichiers, 20 Mo chacun · tous types acceptés
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DeskModelPickerModal
        open={modelPickerOpen}
        onClose={() => setModelPickerOpen(false)}
        value={modelId}
        onSelect={setModelId}
        embedded={embedded}
      />
    </div>
  );
}
