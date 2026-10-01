# Plan canonique de livraison — M01 à M13

État observé le 25 septembre 2026. Ce document résume le plan maître fourni pour la livraison du 4 octobre; il ne réécrit ni les ActionCards ni les anciens registres. Un statut « rapporté » provient d’un reçu ou d’un relais d’agent; « observé » renvoie à une lecture ou vérification directe; « bloqué » indique une preuve manquante ou une dépendance externe.

| Lot | Objet | Statut actuel | Preuve / limite |
|---|---|---|---|
| M01 | Conservation, vérité, sauvegarde, inventaire | livré / observé | Sauvegarde Orbit 118 fichiers; ancien reçu G0; correspondance 88/92 non retrouvée dans l’audit courant. |
| M02 | Environnement autonome | partiel / rapporté | `.venv` Python 3.10.11, opérateurs 0.1.0 observés; source env inchangée; install et isolation à documenter davantage. |
| M03 | Contrats et Bake-In | partiel / observé | Contrats, gates et rétention présents; neuf réponses mémoire et intégration complète non démontrées. |
| M04 | Sanity et preuves | bloqué externe | HTTP 200 Sanity mais `documentCount: 0`; corpus/import idempotent et Knowledge Base non démontrés. |
| M05 | Recherche et persistance | partiel / rapporté | Broker/routes SQLite et budgets existent; parcours complet question→preuves non démontré. |
| M06 | Connexions fournisseurs | bloqué externe | cPanel UAPI HTTP 403; découverte Codex seulement; aucune invocation live des trois fournisseurs établie. |
| M07 | Interface et physique | partiel / rapporté | Terra rapporte UI/localStorage et tests; routes SQLite non branchées UI; parcours public complet non démontré. |
| M08 | CCP et WebMCP | partiel / rapporté | WebMCP enregistré; pas d’invocation agent; handoffs et six directions non démontrés. |
| M09 | Sécurité et intégration | partiel / observé | Reçus de tests/policy et sauvegardes présents; audit complet adversarial et install propre restant. |
| M10 | SecuredMe et déploiement | bloqué externe | UAPI 403; HTTPS, SSH/SFTP, paquet et rollback non vérifiés. |
| M11 | Documentation | en attente / autorisé après stabilisation | Ce guide et le handoff éditorial existent; README/HUMAN explicitement différés. |
| M12 | Revue et soumission | non commencé | Version candidate et dossier DEV non établis. |
| M13 | Relais éditorial | livré / observé | 5 fichiers de métadonnées/handoff, Google Doc créé et readback match rapporté; compilation narrative à faire avec Jean-Sébastien. |

## Correspondance aux anciens plans

Le plan maître demande de conserver les identifiants des plans 88 et 92 et de corriger leur statut selon les preuves. L’audit courant a retrouvé le reçu A88 et des références générales à 92 ActionCards dans les dossiers, mais aucune table source permettant d’associer honnêtement chaque ancien identifiant à M01–M13. La correspondance est donc **non établie**, volontairement laissée ouverte. Aucun mapping numérique n’est inventé ici.

Les cinq angles restent séparés de NASA : ADK/agents, Synthia/handoffs, CCP/mémoire/coût, compagnons éducatifs, synthèse professionnelle; la recherche NASA/satellite/AZo demeure un corpus de préparation et de recherche, pas une fonctionnalité Orbit acquise.
