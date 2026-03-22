import dotenv from "dotenv";
import Replicate from "replicate";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
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
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN || "",
  });
  try {
    const output = await replicate.run(
      "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
      {
        input: {
          prompt,
        },
      },
    );
    return NextResponse.json(output);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
