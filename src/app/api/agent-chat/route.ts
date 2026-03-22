import dotenv from "dotenv";
import { StreamingTextResponse } from "ai";
import { currentUser } from "@clerk/nextjs/server";
import arcjet, { shield, fixedWindow, detectBot } from "@arcjet/next";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { fileToContentParts } from "@/lib/agentFiles";
import { parseSkillsFormField } from "@/lib/agentChatSkills";
import { getDeskAgentById } from "@/lib/deskAgents";

dotenv.config({ path: `.env.local` });

export const runtime = "nodejs";

const MAX_FILES = 25;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: "LIVE" }),
    fixedWindow({
      mode: "LIVE",
      characteristics: ["userId"],
      window: "60s",
      max: 20,
    }),
    detectBot({
      mode: "LIVE",
      block: ["AUTOMATED"],
    }),
  ],
});

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decision = await aj.protect(request, { userId: user.id });
  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    }
    if (decision.reason.isBot()) {
      return NextResponse.json({ error: "Bots are not allowed" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Content-Type multipart/form-data requis." },
      { status: 400 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête trop volumineux ou invalide." },
      { status: 413 },
    );
  }

  const promptRaw = formData.get("prompt");
  const prompt = typeof promptRaw === "string" ? promptRaw.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "Le message est vide." }, { status: 400 });
  }

  const agentIdRaw = formData.get("agentId");
  const agentId =
    typeof agentIdRaw === "string" && agentIdRaw.trim() ? agentIdRaw.trim() : "dev";
  const agent = getDeskAgentById(agentId);
  const skillsBlock = parseSkillsFormField(formData.get("skills"));

  const fileEntries = formData.getAll("files");
  const files: File[] = [];
  for (const entry of fileEntries) {
    if (entry instanceof File && entry.size > 0) {
      files.push(entry);
    }
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_FILES} fichiers par envoi.` },
      { status: 400 },
    );
  }

  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux : ${f.name} (max 20 Mo).` },
        { status: 400 },
      );
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY manquant côté serveur." },
      { status: 500 },
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const userContent: ChatCompletionContentPart[] = [
    {
      type: "text",
      text:
        `Message utilisateur :\n\n${prompt}\n\n` +
        (files.length
          ? `Pièces jointes (${files.length}) : ${files.map((f) => f.name).join(", ")}`
          : ""),
    },
  ];

  for (const file of files) {
    const parts = await fileToContentParts(file);
    userContent.push(...parts);
  }

  const baseSystem =
    "Tu es un assistant de développement. Tu réponds en français lorsque l'utilisateur écrit en français. " +
    "Les utilisateurs peuvent joindre des fichiers (texte, code, images, PDF, binaires). " +
    "Pour les binaires non décodés, indique qu'il faut une autre représentation si une analyse fine est nécessaire.";

  let systemContent =
    `${baseSystem}\n\n## Persona actif : ${agent.label}\n${agent.system}${skillsBlock}`;
  const MAX_SYSTEM = 16_000;
  if (systemContent.length > MAX_SYSTEM) {
    systemContent =
      systemContent.slice(0, MAX_SYSTEM) +
      "\n\n[Instructions système tronquées — raccourcis les skills ou le persona.]";
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    stream: true,
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: systemContent,
      },
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (e) {
        console.error(e);
        controller.enqueue(
          encoder.encode("\n\n[Erreur pendant la génération du flux.]"),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new StreamingTextResponse(stream);
}
