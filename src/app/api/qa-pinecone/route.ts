import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
import { VectorDBQAChain } from "langchain/chains";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { StreamingTextResponse, LangChainStream } from "ai";
import { CallbackManager } from "langchain/callbacks";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createArcjet, enforceArcjet } from "@/lib/arcjetHelpers";

dotenv.config({ path: `.env.local` });

const aj = createArcjet(10);

export async function POST(request: Request) {
  // Get the current user from Clerk
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocked = await enforceArcjet(aj, request, user.id);
  if (blocked) return blocked;

  const { prompt } = await request.json();
  const client = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || "",
  });
  const pineconeIndex = client.Index(process.env.PINECONE_INDEX || "");

  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY }),
    { pineconeIndex },
  );

  const { stream, handlers } = LangChainStream();
  const model = new OpenAI({
    streaming: true,
    modelName: "gpt-3.5-turbo-16k",
    openAIApiKey: process.env.OPENAI_API_KEY,
    callbackManager: CallbackManager.fromHandlers(handlers),
  });

  const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
    k: 1,
    returnSourceDocuments: true,
  });
  chain.call({ query: prompt }).catch(console.error);

  return new StreamingTextResponse(stream);
}
