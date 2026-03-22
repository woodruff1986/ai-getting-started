import arcjet, { shield, fixedWindow, detectBot } from "@arcjet/next";
import { NextResponse } from "next/server";

/**
 * Sans ARCJET_KEY (ex. dev local), retourne null et les routes continuent sans Arcjet.
 */
export function createArcjet(maxPerWindow: number) {
  const key = process.env.ARCJET_KEY?.trim();
  if (!key) return null;
  return arcjet({
    key,
    rules: [
      shield({ mode: "LIVE" }),
      fixedWindow({
        mode: "LIVE",
        characteristics: ["userId"],
        window: "60s",
        max: maxPerWindow,
      }),
      detectBot({
        mode: "LIVE",
        block: ["AUTOMATED"],
      }),
    ],
  });
}

export type ArcjetInstance = NonNullable<ReturnType<typeof createArcjet>>;

export async function enforceArcjet(
  aj: ArcjetInstance | null,
  request: Request,
  userId: string,
): Promise<NextResponse | null> {
  if (!aj) return null;
  const decision = await aj.protect(request, { userId });
  if (!decision.isDenied()) return null;
  if (decision.reason.isRateLimit()) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }
  if (decision.reason.isBot()) {
    return NextResponse.json({ error: "Bots are not allowed" }, { status: 403 });
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
