---
name: memory-stack
description: Use when a Cursor workflow needs persistent memory, compact context recall, and low-token codebase navigation across sessions.
---

# Memory Stack

## Objectif

Configurer une stratégie mémoire robuste dans Cursor en combinant:

- `agentmemory` pour la mémoire persistante multi-session/multi-agent,
- `token-savior` pour la navigation structurelle du code et la réduction de tokens.

## Quand l'utiliser

Utiliser ce skill quand l'une de ces situations apparaît:

- le contexte est répété entre sessions,
- les prompts deviennent longs et coûteux,
- le projet nécessite rappel de décisions techniques/historiques,
- il faut naviguer rapidement dans une grande base de code.

## Stratégie

### 1) Couches mémoire

Séparer les informations en 3 niveaux:

1. **Session**: actions en cours et hypothèses temporaires.
2. **Projet**: décisions, conventions, patterns stables.
3. **Organisation/équipe**: standards transverses, incidents récurrents, playbooks.

### 2) Contrat de rappel progressif

Toujours appliquer une récupération en 3 étapes:

1. index court (liste des éléments pertinents),
2. recherche intermédiaire (résumés ciblés),
3. chargement détaillé (uniquement pour les éléments confirmés).

Objectif: minimiser les tokens tout en conservant la précision.

### 3) Politique de persistance

Persister prioritairement:

- décisions d'architecture,
- causes racines de bugs + correctifs validés,
- conventions de code et d'intégration,
- préférences produit explicites.

Ne pas persister le bruit: logs bruts sans conclusion, pistes invalidées, sorties volatiles sans valeur future.

## Implémentation pratique

Utiliser `references.md` comme guide de configuration:

- setup MCP côté Cursor,
- règles de capture,
- règles de tri/priorisation,
- règles de nettoyage (TTL/obsolescence).

## Checklist

- [ ] Capture mémoire active et vérifiée.
- [ ] Flux de rappel progressif défini.
- [ ] Critères de "quoi mémoriser" explicites.
- [ ] Critères de purge/obsolescence explicites.
- [ ] Coût token sous contrôle sur requêtes fréquentes.

