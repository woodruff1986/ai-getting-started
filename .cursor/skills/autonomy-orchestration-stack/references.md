# Références - Autonomy Orchestration Stack

## Mission Control (Autensa) - apports clés

- Boucle autonome produit: `research -> ideation -> approve -> build -> test -> review -> PR`.
- Convoy mode: exécution parallèle de sous-tâches avec dépendances.
- Health monitoring d'agents + relance automatique.
- Checkpoints de reprise et isolation workspace (worktrees/sandboxes).
- Pilotage par statut (actif/paused/archived), budgets, et préférences utilisateur.

## Intégration recommandée dans Cursor

1. Définir un workflow d'états stable (exemple):
   - `planned`
   - `building`
   - `testing`
   - `reviewing`
   - `ready`
   - `blocked`
   - `done`

2. Définir des règles de transition:
   - `building -> testing` seulement si build local OK.
   - `testing -> reviewing` seulement si tests critiques passants.
   - `reviewing -> ready` seulement si risques majeurs traités.

3. Prévoir un mode dégradé:
   - Timeout agent.
   - Échec répété d'une étape.
   - Conflit de merge.

## Checklist de fiabilité

- [ ] Chaque tâche a un propriétaire clair.
- [ ] Chaque état possède des critères d'entrée/sortie.
- [ ] Les logs d'erreur sont exploitables.
- [ ] Les reprises après incident sont testées.
- [ ] Les coûts/tokens sont observés pendant les runs longs.

