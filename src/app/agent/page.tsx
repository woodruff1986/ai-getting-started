import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AgentChat from "@/components/AgentChat";

export const metadata: Metadata = {
  title: "Chat agent — Fichiers",
  description:
    "Discute avec l’agent en joignant tout type de fichier et télécharge les réponses ou tes pièces jointes.",
};

export default function AgentPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <AgentChat />
    </main>
  );
}
