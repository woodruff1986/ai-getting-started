# Références - Design System Stack

## Inspirations principales

- awesome-design-md: DESIGN.md comme contrat de design lisible par agent.
- ui-ux-pro-max-skill: recommandations style/couleurs/typo par domaine + checklist UX.
- ai-website-cloner-template: pipeline de clonage structuré (reconnaissance, specs, build parallèle, QA visuelle).

## Contrat minimal DESIGN.md conseillé

1. Atmosphère visuelle
2. Palette (rôles sémantiques)
3. Typographie (hiérarchie)
4. Composants (états inclus)
5. Layout + spacing scale
6. Responsive behavior
7. Do/Don't

## Prompt court réutilisable

```
Lis DESIGN.md à la racine.
Constrains la génération UI à ses tokens, composants et règles responsive.
Si une valeur manque, propose une extension minimale compatible, sans casser le style existant.
```

## Critères de qualité UI

- Cohérence inter-pages (tokens stables).
- Accessibilité de base (contraste, focus visible, navigation clavier).
- Interactions prévisibles (hover/focus/disabled).
- Éviter les effets décoratifs non justifiés.

