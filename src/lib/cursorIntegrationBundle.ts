import type { ParsedGithubRepo } from "./parseGithubUrl";

export type GithubRepoMeta = {
  fullName: string;
  description: string | null;
  htmlUrl: string;
  cloneUrl: string;
  defaultBranch: string;
  topics: string[];
  license: string | null;
  hasPackageJson: boolean;
  packageName: string | null;
};

export function buildCursorIntegrationBundle(
  ref: ParsedGithubRepo,
  meta: GithubRepoMeta,
): string {
  const name = meta.fullName;
  const topics =
    meta.topics.length > 0
      ? meta.topics.slice(0, 12).map((t) => `\`${t}\``).join(", ")
      : "_aucun topic GitHub_";

  const pkgHint = meta.hasPackageJson
    ? meta.packageName
      ? `Le dépôt contient un \`package.json\` (nom probable : \`${meta.packageName}\`).`
      : "Le dépôt contient un `package.json`."
    : "Pas de `package.json` à la racine détecté via l’API (vérifie les sous-dossiers).";

  return `# Intégrer **${name}** dans ton projet + Cursor

## Dépôt
- **URL** : ${meta.htmlUrl}
- **Branche par défaut** : \`${meta.defaultBranch}\`
- **Licence** : ${meta.license ?? "_non indiquée_"}
- **Topics** : ${topics}
- ${pkgHint}
${meta.description ? `\n> ${meta.description}\n` : ""}

## 1. Récupérer le code (au choix)

\`\`\`bash
git clone ${meta.cloneUrl} vendor/${ref.repo}
\`\`\`

Ou sous-module :

\`\`\`bash
git submodule add ${meta.htmlUrl}.git libs/${ref.repo}
\`\`\`

## 2. Prompt pour Cursor — Composer (⌘I / Ctrl+I)

Colle ceci en adaptant les chemins :

\`\`\`text
Tu intègres la librairie / le code du dépôt ${name} (${meta.htmlUrl}) dans ce repo.

1) Parcours la structure clé (README, package.json ou équivalent, points d’entrée).
2) Propose où placer le code (dossier, alias, config bundler).
3) Liste les étapes concrètes : dépendances à installer, fichiers à créer ou modifier, exports.
4) Respecte le style et les patterns déjà présents dans le projet.
5) Si quelque chose manque (types, build), indique-le et propose un plan minimal.

Ne télécharge rien depuis Internet sans que je le valide ; base-toi sur ce que tu vois dans le workspace une fois le dépôt cloné ou ajouté.
\`\`\`

## 3. Règles Cursor (optionnel)

Crée ou complète \`.cursor/rules\` avec une règle du type :

\`\`\`md
## ${ref.repo}
- Préfixe / chemin : \`vendor/${ref.repo}/\` ou \`libs/${ref.repo}/\`
- Référence upstream : ${meta.htmlUrl}
- Préférer les mises à jour via git / sous-module ; documenter la version suivie.
\`\`\`

## 4. Vérifications

- Build / tests du monorepo après ajout.
- Mettre à jour le README avec la dépendance et la licence (${meta.license ?? "à vérifier"}).
`;
}
