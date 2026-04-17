---
name: design-system-stack
description: Use when translating product intent into a consistent UI system with design tokens, reproducible visual rules, and agent-friendly implementation guidance.
---

# Design System Stack

## Objectif

Ce skill structure la génération UI autour d'un système de design lisible par agent:

- règles visuelles stables,
- tokens réutilisables,
- composants cohérents,
- prompts d'implémentation précis.

Il s'inspire de `awesome-design-md`, `ui-ux-pro-max-skill` et `ai-website-cloner-template`.

## Quand l'utiliser

Utiliser ce skill quand il faut:

- créer une UI cohérente sans Figma complet,
- reproduire un style de référence de façon fiable,
- transformer un brief produit en règles design actionnables.

Ne pas l'utiliser si la tâche est uniquement backend ou purement infra.

## Processus

1. **Définir l'intention UX**
   - Public cible, contexte d'usage, ton visuel, objectifs de conversion.

2. **Sélectionner un pattern de page**
   - Ex: hero-centric, conversion-focused, storytelling, dashboard data-dense.

3. **Fixer les fondations**
   - Palette sémantique (primary/secondary/accent/surface/text),
   - typographie (display/body/mono + hiérarchie),
   - spacing et rayon,
   - état des composants (hover/focus/disabled).

4. **Rédiger DESIGN.md projet**
   - Format clair pour agents: principes, tokens, composants, do/don't, responsive.

5. **Implémenter**
   - Mapper chaque section à des composants et classes/tokens exacts.
   - Éviter les valeurs "au feeling" sans justification design.

## Contrôle qualité UI

- [ ] Contraste minimum lisible (objectif AA).
- [ ] États focus visibles clavier.
- [ ] Responsive validé mobile/tablette/desktop.
- [ ] Transitions sobres (pas d'animation décorative gratuite).
- [ ] Cohérence typographique et espacements sur tout le flux.

## Anti-patterns

- Mélanger plusieurs styles contradictoires dans une même page.
- Utiliser des couleurs "jolies" sans rôle sémantique.
- Répliquer un site visuellement sans abstraction en design tokens.
- Implémenter des composants sans définir leurs états interactionnels.

Voir `references.md` pour les templates et critères détaillés.
