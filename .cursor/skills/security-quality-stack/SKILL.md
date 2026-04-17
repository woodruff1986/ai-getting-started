---
name: security-quality-stack
description: Use when a task needs practical cybersecurity guardrails and strong anti-slop writing quality in AI-generated outputs.
---

# Security + Quality Stack

## Objectif

Fournir un cadre combinant:

- bonnes pratiques cybersécurité orientées action,
- revue de risques avant exécution,
- nettoyage de prose pour éviter le style IA stéréotypé.

## Quand l'utiliser

Utiliser ce skill quand la demande inclut au moins un des éléments:

- script/outillage de sécurité, investigation, hardening, détection,
- workflow autonome qui touche secrets, accès, données sensibles,
- besoin explicite de texte plus direct, plus humain, moins "slop".

## Cadre d'application

### 1) Sécurité: cadrage minimum avant action

- Définir le périmètre autorisé (environnement, cible, droits).
- Identifier les actifs sensibles (secrets, données perso, clés API).
- Bloquer d'emblée tout usage ambigu ou non autorisé.

### 2) Sécurité: exécution contrôlée

- Préférer des étapes vérifiables et réversibles.
- Journaliser les actions critiques (quoi, quand, pourquoi).
- Vérifier la cohérence des résultats avant de conclure.

### 3) Qualité rédactionnelle: anti-slop

Réécrire pour:

- supprimer les ouvertures creuses ("Voici", "Plongeons dans"),
- éviter les oppositions artificielles ("ce n'est pas X, c'est Y"),
- réduire adverbes et jargon gonflé,
- privilégier phrases courtes, verbes actifs, preuves concrètes.

## Checklist

- [ ] Périmètre et autorisations explicités.
- [ ] Risques principaux listés et mitigations associées.
- [ ] Actions sensibles limitées au strict nécessaire.
- [ ] Résultats vérifiés avec éléments concrets (logs, tests, traces).
- [ ] Texte final nettoyé des patterns "AI tell".

## Références

Voir `references.md` pour:

- mapping avec la bibliothèque Anthropic-Cybersecurity-Skills,
- patterns anti-slop inspirés de stop-slop.

