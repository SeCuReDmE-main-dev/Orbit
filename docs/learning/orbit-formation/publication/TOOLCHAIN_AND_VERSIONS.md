# Versions et outils du dossier pédagogique

Point documentaire du **1er octobre 2026**. Les versions ci-dessous viennent des sources et reçus sélectionnés. Cette lecture prépare le dossier ; les exécutions du cours et les exports DOCX/PDF conservent leurs étapes et reçus distincts.

| Élément | Version / identité | Origine et qualification |
|---|---|---|
| Formation | `orbit-course-1.0.0` | Contrat et métadonnées des sources pédagogiques |
| Plugin portable | `@orbit/learning-studio` · `1.0.0` | Version déclarée dans son package ; distinguer chaque archive par SHA-256 |
| Registre pédagogique | 15 noms de recherche + 10 noms pédagogiques | Factory partagée ; enregistrement natif lié au document et au propriétaire du montage |
| Capacité du projet élève | `student_get_learning_snapshot` | Capacité bornée de la brique du Module 8 ; registre distinct des 25 outils d'Orbit |
| Moteurs | `baseline`, `n`, `p` | Sélection explicite, versions et résultats conservés séparément ; qualification d'une campagne de modèles distincte |
| Node | `22.20.0` | Observé dans les reçus Kaggle de build du vrai assemblage et de l'installation statique du plugin |
| Astro | `7.3.3` | Observé dans le build Kaggle du vrai assemblage ; le site déclare une plage `^7.3.3` |
| Three.js | `0.181.2` | Version figée du notebook et du squelette ; observée dans le build de l'assemblage |
| Sanity Studio | `6.16.0` | Dépendance figée du second hôte et reçus statiques Kaggle ; session authentifiée observée en lecture seule, appels natifs et écritures distincts |
| React / React DOM | `19.3.0` | Dépendances figées du second hôte et reçus statiques Kaggle |
| styled-components | `6.5.3` | Dépendance figée du second hôte et reçus statiques Kaggle |
| esbuild | `0.28.2` | Version déclarée par le package portable ; sa déclaration seule ne prouve pas un build |
| Transport du corpus | GET `/api/v1/course-context/outline` et `/api/v1/course-context/entries` | Credentials navigateur omis, activation serveur explicite ; outline et neuf entrées READY sur la projection auditée, puis origine étrangère et CORS public vérifiés dans 16 contrôles natifs Kaggle/E2B. La session authentifiée du Studio garde ses validations distinctes |
| PHP de validation | `8.5.11` · FrankenPHP `v1.12.7` | Observé dans le reçu Kaggle de régressions ; binaire officiel avec SHA vérifié. Ce runtime n'identifie pas la version PHP du serveur public |
| Pandoc | `3.9.0.2` | Version relevée dans le précontrôle du coordinateur à `2026-10-01T11:40:53Z` ; conversions DOCX/LaTeX effectivement exécutées et conservées dans `qa/export-report.json` |
| XeLaTeX | MiKTeX-XeTeX `4.16`, MiKTeX `25.12` | Version relevée dans le même précontrôle ; compilation PDF à trois passes exécutée. Aucune installation ou mise à jour du runtime |
| Polices de lecture | Arial et Consolas | Fichiers installés observés ; caractères et lisibilité examinés dans les pages rendues. Le rapport `qa/output-review.json` identifie le PDF correspondant |
| Canva | Neuf documents web publiés | Messages de publication, lecture des neuf URL publiques, titres et ressources examinés ; index et captures dans CANVA_DELIVERY.json |

Les versions d'outils d'export sont des relevés du précontrôle conservé, pas une nouvelle mesure de cette composition. Les chemins des exécutables et comptes restent dans le périmètre opérationnel privé. Les rapports publics retiennent nom, version, origine et portée.

Références de preuve : [qualification maintenue](QUALIFICATION.md), [build du premier assemblage](../../../receipts/formation/actual-export-assembly.json), [build historique des exports indépendants](../../../receipts/formation/actual-independent-assembly-static-kaggle.json), [nouvel assemblage exact compilé](../../../receipts/formation/actual-pointer-target-assembly-static-kaggle.json), [ses 35 contrôles navigateur](../../../receipts/formation/actual-pointer-target-assembly-browser-kaggle.json), [archive portable f2 et graphe verrouillé](../../../receipts/formation/portable-studio-v2-install-kaggle.json), [session authentifiée en lecture seule](../../../receipts/formation/authenticated-second-studio.json), [version Kaggle historique v5, 354436854](../../../receipts/formation/software-version5-kaggle.json), [version historique v4, 354422952](../../../receipts/formation/software-version4-kaggle.json), [formation publique 72/72 après le correctif](../../../receipts/formation/live-browser-pointer-target-final.json), [admission Context refusée](../../../receipts/formation/course-context-import-status.json), [retest indépendant corrigé M4](../../../receipts/formation/free-colab-module-4-independent-retest.json), [retest indépendant corrigé M7](../../../receipts/formation/free-colab-module-7-independent-retest.json) et [régressions PHP](../../../receipts/formation/php-context-29-pass-kaggle.json). Les exports provisoires gardent les critères encore ouverts ; leurs empreintes et rapports de rendu appartiennent à la construction documentaire.

Point courant de clôture : [import manuel gratuit et assemblage](../../../receipts/formation/free-colab-module-8-manual-import-assembled.json), [compilation statique exacte7ae43](../../../receipts/formation/actual-manual-import-assembly-static-kaggle.json), [V2 immuable354480684](../../../receipts/formation/closure-software-regressions-kaggle.json), [V3 publique354484426](https://www.kaggle.com/code/celebrum/orbit-v3-closure-regressions?scriptVersionId=354484426) avec présentation Markdown corrigée sans nouveau rejeu, [transport Context READY9](../../../receipts/formation/course-context-live-transport.json), [16 contrôles natifs hors origine354497668](../../../receipts/formation/cross-origin-public-validation.json) et [neuf supports Canva](CANVA_DELIVERY.json). Le coordinateur a observé la publication V3 ; sa capture est conservée. Les anciennes suspensions sont historiques.
