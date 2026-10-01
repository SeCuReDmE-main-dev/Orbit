# Orbit — premier lot de 50 références méthodologiques

**État de la sélection :** 50 références classées et accompagnées de 50 questions de test. Cette phrase décrivait le travail de recherche avant l'import. L'[import contrôlé de 50 fiches](sanity-ingestion-2026-09-27/README.md) a ensuite été exécuté; son reçu indique le statut du nouveau build.

Ce lot prépare la qualité du deep research du compagnon Orbit pour DEV/Sanity. Il ne constitue pas un corpus scientifique NASA, une implémentation du moteur, ni une preuve que le système est devenu expert. La préparation NASA reste un projet distinct.

| Fonction | Références |
|---|---:|
| Clarification et planification | 8 |
| Recherche et couverture | 8 |
| Lecture et extraction documentaire | 8 |
| Qualité des preuves, biais et provenance | 10 |
| Synthèse, citations et rapports | 8 |
| Évaluation, reprise et handoff | 8 |

## Ce que cette sélection doit améliorer

1. Clarifier une question, ses interprétations et son périmètre avant de remplir un plan. Les 9 axes d’Orbit sont une structure de travail, pas une preuve de couverture exhaustive.
2. Diversifier requêtes et pistes bibliographiques, conserver le journal des recherches et dédupliquer. Trente URL ne garantissent ni trente preuves indépendantes ni une lecture effective.
3. Lire une structure documentaire : texte, tables, citations, OCR et limites de parsing doivent rester distingués.
4. Construire une réponse depuis des passages probants; conserver désaccords, résultats manquants, versions et incertitude.
5. Reprendre une recherche en conservant décisions, preuves, permissions, compteurs et prochaine action; contrôler ce qui est retrouvé après compaction.

## Méthode et limites de vérification

- Exa a servi à découvrir puis extraire des passages des sources sélectionnées. Coding Research a guidé la priorité aux originaux, à la documentation officielle et aux limites explicites.
- Les 50 références ont une identité et du contenu consulté; la portée précise est indiquée dans chaque fiche. Une notice/résumé ne vaut pas lecture intégrale du PDF.
- Les 50 URL sont uniques et aucune ne double une URL du manifeste des 25 pages approuvées. La comparaison s’appuie sur ce manifeste local, sans réinventorier Sanity pendant cette recherche.
- ReAct, STORM, ALCE et PROV-DM avaient déjà été envisagés dans la recherche antérieure; ils ne font pas partie des 25 URL finalement retenues. Ils ne sont pas présentés comme nouvelles découvertes.
- Les trois chapitres de qualité des preuves de Cochrane, ainsi que les autres références cliniques de planification/recherche, fournissent des méthodes transférables à adapter. Orbit ne devient pas un outil de revue clinique certifié.
- La date de FAIR indiquée dans les résultats Exa était incohérente : la date éditeur du 15 mars 2016 a été retenue. AgentDojo était inaccessible via la page OpenReview; son document original arXiv a été consulté.
- Remote Desktop Commander signale The_Monad hors ligne. Les outils de recherche et les fichiers locaux ont suffi; aucune opération distante n’est revendiquée.

## Admission, droits et intégration

La présence publique d’un document ou d’un PDF ne donne pas automatiquement le droit de le recopier. Le registre sépare la référence utile (`admission`) de la copie/importation du texte (`fulltext_import_gate`). Les licences non vérifiées restent en attente pour le texte intégral. Les conditions d’attribution et les éléments tiers restent à vérifier même pour une licence ouverte.

Les droits d’un logiciel ne valent pas nécessairement pour ses poids, ses jeux de données ou l’article qui le décrit. Les fiches de ce dossier sont des notes originales avec liens; elles ne contiennent pas de copies intégrales des publications.

Il n’est pas nécessaire de convertir toutes les pages web en PDF. Choisir la représentation réellement extractible et autorisée; conserver version, origine et lien canonique. Ce catalogue de 50 références ne promet pas 50 emplacements Website supplémentaires : la capacité de chaque type de source et celle du plan doivent être vérifiées avant ingestion.

## Validation d’Orbit à effectuer ensuite

1. Figer un petit jeu de questions inédites couvrant les six fonctions, avec réponses ou critères évalués humainement. Ne pas le confondre avec les 50 questions dérivées de ce corpus.
2. Mesurer la référence actuelle puis la même configuration avec le corpus : mêmes tâches, fournisseur/modèle, outils et budgets. Répéter les cas où le modèle est variable.
3. Mesurer support des affirmations par citations, couverture et indépendance des sources, traitement des contradictions, abstention appropriée, résistance aux instructions injectées, reprise après interruption et coût/temps.
4. Vérifier séparément importation, extraction non vide, build réussi, récupération par le client et utilisation pertinente dans la réponse. Aucune de ces étapes ne prouve automatiquement la suivante.
5. Enrichir avec le second lot de 50 seulement à partir des erreurs observées. Remplacer une source redondante ou faible est préférable à remplir un quota.

Aucun test de comportement d’Orbit n’a été exécuté pour ce dossier. Aucun gain de qualité, latence, mémoire ou tokens n’est annoncé.

## Lire le dossier

- [HUMAN.md](HUMAN.md) : point d’entrée et lecture par petits blocs.
- [CATALOGUE_50.md](CATALOGUE_50.md) : les 50 fiches, leurs limites et tests proposés.
- [SOURCES.csv](SOURCES.csv) : tableau filtrable.
- [SOURCES.json](SOURCES.json) : registre pour une future importation contrôlée.
- [PROPOSED_TESTS.json](PROPOSED_TESTS.json) : questions de validation, non exécutées.
- [VALIDATION.json](VALIDATION.json) : contrôles du dossier.
- [METHOD_10_RULES.md](METHOD_10_RULES.md) : règles de sélection et admission.
