import dotenv from "dotenv";
import { StreamingTextResponse } from "ai";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createArcjet, enforceArcjet } from "@/lib/arcjetHelpers";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { fileToContentParts } from "@/lib/agentFiles";
import { parseSkillsFormField } from "@/lib/agentChatSkills";
import { getDeskAgentById } from "@/lib/deskAgents";
import { resolveDeskChatModelForRequest } from "@/lib/deskChatModels";
import { parseClientApiKeysField } from "@/lib/parseClientApiKeys";
import { flattenUserContentParts } from "@/lib/flattenUserContentParts";

dotenv.config({ path: `.env.local` });

export const runtime = "nodejs";

const MAX_FILES = 25;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const aj = createArcjet(20);

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocked = await enforceArcjet(aj, request, user.id);
  if (blocked) return blocked;

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

  const clientKeys = parseClientApiKeysField(formData.get("apiKeys"));
  const modelIdRaw = formData.get("modelId");
  const modelResolved = resolveDeskChatModelForRequest(
    typeof modelIdRaw === "string" ? modelIdRaw : null,
    clientKeys,
  );
  if (!modelResolved.ok) {
    return NextResponse.json({ error: modelResolved.error }, { status: 400 });
  }

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

  if (modelResolved.provider !== "openai" && files.length > 0) {
    return NextResponse.json(
      {
        error:
          "Pièces jointes : utilise un modèle OpenAI (ex. Composer 2 / GPT-4o) ou retire les fichiers pour Claude ou Gemini.",
      },
      { status: 400 },
    );
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

  const encoder = new TextEncoder();

  if (modelResolved.provider === "openai") {
    const openai = new OpenAI({ apiKey: modelResolved.apiKey });

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

    const completion = await openai.chat.completions.create({
      model: modelResolved.apiModel,
      stream: true,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ],
    });

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

  const { text: flatUser, hadNonText } = flattenUserContentParts(userContent);
  if (hadNonText) {
    return NextResponse.json(
      {
        error:
          "Contenu non texte détecté — avec ce fournisseur, envoie un message texte uniquement.",
      },
      { status: 400 },
    );
  }

  if (modelResolved.provider === "anthropic") {
    const anthropic = new Anthropic({ apiKey: modelResolved.apiKey });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const res = await anthropic.messages.create({
            model: modelResolved.apiModel,
            max_tokens: 4096,
            system: systemContent,
            messages: [{ role: "user", content: flatUser }],
            stream: true,
          });

          for await (const event of res) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (e) {
          console.error(e);
          controller.enqueue(
            encoder.encode(
              "\n\n[Erreur Anthropic — vérifie la clé API et le modèle.]",
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new StreamingTextResponse(stream);
  }

  if (modelResolved.provider === "google") {
    const genAI = new GoogleGenerativeAI(modelResolved.apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model: modelResolved.apiModel,
      systemInstruction: systemContent,
    });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const result = await geminiModel.generateContentStream({
            contents: [{ role: "user", parts: [{ text: flatUser }] }],
          });

          for await (const chunk of result.stream) {
            const t = chunk.text();
            if (t) controller.enqueue(encoder.encode(t));
          }
        } catch (e) {
          console.error(e);
          controller.enqueue(
            encoder.encode(
              "\n\n[Erreur Google AI — vérifie la clé et le nom du modèle.]",
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new StreamingTextResponse(stream);
  }

  return NextResponse.json({ error: "Fournisseur inconnu." }, { status: 500 });
}
