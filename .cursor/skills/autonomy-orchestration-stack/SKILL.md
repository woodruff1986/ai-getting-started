---
name: autonomy-orchestration-stack
description: Use when prompts mention workflow autonome, multi-agent, orchestration, plan-build-test-review-PR, convoy, dispatch, backlog automation, ou pipeline de livraison continue avec checkpoints et reprise.
---

# Autonomy Orchestration Stack

## Objectif

Structurer une exécution autonome fiable: de l'idée jusqu'à la PR, avec découpage, états, contrôle qualité, et reprise après incident.

Inspiré de patterns proches de mission-control (pipeline autonome + supervision + feedback loops).

## Quand l'utiliser

Utiliser ce skill quand tu dois:

- transformer des idées en tâches exécutables,
- distribuer du travail à des agents/sous-agents,
- piloter un flux `plan -> build -> test -> review -> PR`,
- gérer des échecs partiels (retry, fallback, pause, reprise).

## Workflow

1. **Ingress (entrée de demande)**
   - Convertir la demande en spécification concise:
     - objectif,
     - contraintes,
     - critères d'acceptation.

2. **Découpage**
   - Décomposer en sous-tâches indépendantes.
   - Déclarer les dépendances (DAG simple).
   - Assigner un "done state" clair pour chaque sous-tâche.

3. **Dispatch**
   - Envoyer les sous-tâches à des agents spécialisés.
   - Inclure contexte minimum: entrées, sorties attendues, fichiers cibles.

4. **Exécution contrôlée**
   - Capturer statut: `queued`, `in_progress`, `blocked`, `testing`, `review`, `done`.
   - Appliquer checkpoints:
     - après implémentation,
     - après tests,
     - après review.

5. **Validation**
   - Exiger test/lint/typecheck (selon projet).
   - Exiger revue des risques (régression, sécurité, performance).

6. **Sortie**
   - Générer commit(s) logiques.
   - Générer/mettre à jour PR.
   - Produire un résumé exécutable (ce qui change, comment vérifier).

## Modèle d'état minimal

```txt
INBOX -> PLANNING -> ASSIGNED -> IN_PROGRESS -> TESTING -> REVIEW -> DONE
                              \-> BLOCKED -----------^
```

Règles:

- pas de passage en `DONE` sans validation.
- `BLOCKED` doit contenir cause + prochaine action.
- chaque transition doit laisser une trace exploitable.

## Checklist

- [ ] Spécification initiale explicite (objectif/contraintes/acceptance).
- [ ] Sous-tâches découplées et dépendances connues.
- [ ] Statuts et transitions observables.
- [ ] Checkpoints définis et appliqués.
- [ ] Vérifications automatiques exécutées.
- [ ] PR créée/mise à jour avec résumé clair.

## Erreurs fréquentes

- Dispatcher sans contrat d'interface entre tâches.
- Avancer vers review sans tests minimaux.
- Mélanger plusieurs changements non liés dans un seul commit.
- Oublier la stratégie de reprise (retry/pause/replan).

