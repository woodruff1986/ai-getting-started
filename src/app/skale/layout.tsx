import type { Metadata } from "next";
import "@/styles/skale-shell.css";
import SkaleShell from "@/components/skale/SkaleShell";

export const metadata: Metadata = {
  title: "Desk Cursor",
  description:
    "Tableau de bord type agent local pour Cursor : agent avec fichiers, guide, liens utiles.",
};

export default function SkaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SkaleShell>{children}</SkaleShell>;
}
