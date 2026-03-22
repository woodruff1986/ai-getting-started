import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CursorHub from "@/components/CursorHub";

export const metadata: Metadata = {
  title: "Guide Cursor — Interface conviviale",
  description:
    "Raccourcis, modes Chat / Composer / Agent et prompts copiables pour utiliser Cursor efficacement.",
};

export default function CursorPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <CursorHub />
    </main>
  );
}
