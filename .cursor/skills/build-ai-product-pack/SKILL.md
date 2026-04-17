---
name: build-ai-product-pack
description: Use when prompts mention workflow produit IA, mémoire persistante, design system/UI generation, orchestration multi-agent, sécurité, qualité rédactionnelle, ou pipeline plan-build-test-review-PR in Cursor.
---

# Build AI Product Pack

## Objectif

Ce skill orchestre un pipeline complet pour créer ou améliorer un produit assisté par IA dans Cursor, en combinant:

- mémoire persistante et navigation token-efficient,
- design system orienté génération UI,
- orchestration multi-agents,
- sécurité opérationnelle,
- qualité rédactionnelle.

## Quand l'utiliser

Utiliser ce skill quand la demande implique au moins 2 de ces thèmes:

1. mémoire inter-session / rappel de décisions,
2. génération UI cohérente (design tokens, styles, clonage),
3. pipeline autonome (plan -> build -> test -> review -> PR),
4. contraintes sécurité/compliance,
5. exigence de prose claire, concise et non "IA-générique".

Ne pas l'utiliser pour une micro-tâche locale (ex: corriger une faute dans un seul fichier).

## Sous-skills à activer

Activer les skills suivants selon le besoin:

- `memory-stack`
- `design-system-stack`
- `autonomy-orchestration-stack`
- `security-quality-stack`

## Workflow recommandé

1. **Qualifier le périmètre**
   - Identifier objectifs, contraintes, stack cible, livrables.
   - Lister ce qui doit être persistant (conventions, décisions, incidents, patterns).

2. **Installer le socle mémoire**
   - Activer `memory-stack` pour définir où et comment stocker/rappeler le contexte.

3. **Définir le socle design**
   - Activer `design-system-stack` pour standardiser style, composants, tokens.

4. **Définir l'orchestration**
   - Activer `autonomy-orchestration-stack` pour découpage des tâches et boucle autonome.

5. **Appliquer sécurité + qualité**
   - Activer `security-quality-stack` pour garde-fous sécurité et qualité de rédaction.

6. **Valider**
   - Vérifier que chaque axe (mémoire/design/orchestration/sécurité/rédaction) est couvert par des artefacts concrets.

## Checklist de sortie

- [ ] Décisions clés persistées dans la couche mémoire.
- [ ] Règles de design explicites (tokens, composants, patterns) documentées.
- [ ] Workflow d'exécution autonome défini (états, transitions, fallback).
- [ ] Contrôles sécurité et conformité explicites.
- [ ] Texte final relu contre les anti-patterns de prose IA.

## Erreurs fréquentes

- Démarrer la génération UI sans base design formalisée.
- Orchestrer des agents sans mémoire partagée ni handoff standard.
- Implémenter un pipeline autonome sans garde-fous sécurité.
- Livrer un texte "propre techniquement" mais verbeux ou stéréotypé.

