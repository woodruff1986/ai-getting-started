"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";

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

export default function AgentChat() {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [assistantDraft, setAssistantDraft] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [dragActive, setDragActive] = useState(false);

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
  }, [attachments, input]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-slate-950 text-slate-100">
      <div className="border-b border-white/10 bg-slate-900/80 px-4 py-4 backdrop-blur sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Chat agent</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Ajoute n’importe quel type de fichier (glisser-déposer ou bouton).
              Les images et le texte sont analysés ; les PDF sont lus quand c’est
              possible ; les binaires sont signalés sans contenu brut. Télécharge
              tes pièces jointes ou la réponse depuis les boutons sous chaque
              bloc.
            </p>
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
              className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              Exporter la discussion (.md)
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {messages.length === 0 && !assistantDraft && (
            <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-slate-500">
              <p className="text-slate-400">
                Écris un message et joins des fichiers si tu veux. Raccourci
                envoi :{" "}
                <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-slate-300">
                  Ctrl
                </kbd>{" "}
                +{" "}
                <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-slate-300">
                  Entrée
                </kbd>{" "}
                ({" "}
                <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-slate-300">
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
                className={`rounded-2xl border px-4 py-4 sm:px-5 sm:py-5 ${
                  msg.role === "user"
                    ? "border-sky-500/25 bg-sky-500/5"
                    : "border-violet-500/25 bg-violet-500/5"
                }`}
              >
                <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
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
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/10"
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
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs"
                      >
                        <span className="max-w-[200px] truncate font-medium text-slate-200">
                          {a.file.name}
                        </span>
                        <span className="text-slate-500">
                          {a.file.type || "type inconnu"} ·{" "}
                          {formatBytes(a.file.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            downloadBlob(a.file, a.file.name || "fichier")
                          }
                          className="ml-1 text-sky-400 hover:text-sky-300"
                        >
                          Télécharger
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                  {msg.content}
                </p>
              </article>
            ))}

            {assistantDraft !== null && (
              <article className="rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-4 sm:px-5 sm:py-5">
                <header className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
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
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/10"
                    >
                      Télécharger le brouillon
                    </button>
                  )}
                </header>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                  {assistantDraft || (
                    <span className="inline-flex items-center gap-2 text-slate-500">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
                      Réflexion…
                    </span>
                  )}
                </p>
              </article>
            )}

          </div>
        </div>

        <div className="border-t border-white/10 bg-slate-900/90 px-4 py-4 backdrop-blur sm:px-8">
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
              className={`rounded-2xl border-2 border-dashed transition ${
                dragActive
                  ? "border-sky-400 bg-sky-500/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {attachments.length > 0 && (
                <ul className="flex flex-wrap gap-2 border-b border-white/10 p-3">
                  {attachments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 rounded-lg bg-black/40 px-3 py-2 text-xs"
                    >
                      <span className="max-w-[180px] truncate text-slate-200">
                        {a.file.name}
                      </span>
                      <span className="text-slate-500">
                        {formatBytes(a.file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          downloadBlob(a.file, a.file.name || "fichier")
                        }
                        className="text-sky-400 hover:text-sky-300"
                      >
                        Télécharger
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAttachment(a.id)}
                        className="text-slate-500 hover:text-rose-400"
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
                  className="w-full resize-none rounded-xl border-0 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500"
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
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50"
                  >
                    Joindre des fichiers
                  </button>
                  <button
                    type="button"
                    onClick={() => void send()}
                    disabled={
                      isSending || (!input.trim() && attachments.length === 0)
                    }
                    className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/30 hover:from-sky-400 hover:to-violet-500 disabled:opacity-40"
                  >
                    {isSending ? "Envoi…" : "Envoyer"}
                  </button>
                  <span className="text-xs text-slate-500">
                    Jusqu’à 25 fichiers, 20 Mo chacun · tous types acceptés
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
