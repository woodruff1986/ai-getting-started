# Références - Memory Stack

## Sources technologiques

- agentmemory: https://github.com/rohitg00/agentmemory
- token-savior: https://github.com/Mibayy/token-savior

## Principes clés retenus

1. **Mémoire persistante multi-session**
   - Capturer décisions, conventions, incidents, et changements importants.
   - Préférer une mémoire structurée plutôt qu'un long fichier contexte unique.

2. **Récupération hybride**
   - Combiner recherche lexicale + recherche sémantique.
   - Prioriser des extraits courts et citables.

3. **Progressive disclosure**
   - Couche 1: index/shortlist.
   - Couche 2: résumé.
   - Couche 3: détail complet.
   - Monter de niveau uniquement si nécessaire.

4. **Coût token**
   - Éviter lecture de fichiers complets quand un accès symbolique ou ciblé est possible.
   - Encapsuler les rappels mémoire au démarrage de session.

5. **Hygiène de mémoire**
   - Traiter contradictions.
   - Expirer les éléments obsolètes (TTL).
   - Favoriser les items à fort ROI opérationnel.

