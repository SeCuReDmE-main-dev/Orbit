# Orbit Formation — sources de publication

Ce dossier prépare le manuel français, les documents web Canva, les fiches enseignant et les missions des assistants. Il reste distinct du code de l'application, des notebooks et des éditoriaux réservés.

## Les sources à maintenir

- Les huit fiches dans `../modules/` et `../PROJECT.md` décrivent les notions, les activités et les scripts.
- `QUALIFICATION.md` porte le point documentaire des validations, avec leurs limites et les critères encore ouverts.
- `TOOLCHAIN_AND_VERSIONS.md` sépare versions déclarées, exécutions observées et outils d'export relevés au précontrôle.
- `scripts/prepare_sources.py` compose `MASTER_MANUSCRIPT.md`, `TEACHER_GUIDE.md`, `ASSISTANT_MISSIONS.md`, `CANVA_BRIEFS.md`, la carte des sources et les profils. Cette commande écrit des sources documentaires ; elle n'exécute ni logiciel du cours ni export Office/PDF.
- `scripts/build_outputs.py` prépare le précontrôle puis les exports seulement avec `--execute`. Il utilise Pandoc et LaTeX, conserve les logs et laisse la revue visuelle sous contrôle humain. Aucune installation automatique n'est effectuée.

Le précontrôle peut résoudre les exécutables depuis le rapport privé déjà inspecté `.orbit/formation-20261001/publication-toolchain.json`, même lorsque MiKTeX n'est pas dans le `PATH`. Les rapports de publication retiennent les noms des outils et les versions relevées, sans leurs chemins privés. Les fichiers de polices Arial et Consolas ont été observés dans Windows ; le rendu, les caractères et la lisibilité restent à examiner lors de l'export.

## Ordre de production

1. Reporter dans `QUALIFICATION.md` les reçus cloud à jour et conserver leur portée.
2. Recomposer les sources avec `python scripts/prepare_sources.py` depuis ce dossier.
3. Examiner le Module 1 pilote et ses liens dans Canva, puis généraliser les briefs.
4. Faire le précontrôle des exports ; choisir des polices réellement présentes.
5. Construire DOCX, source LaTeX et PDF lorsque le coordinateur lance explicitement l'export.
6. Examiner le contenu, les pages, les liens, les extraits et les sauts de page ; consigner la revue dans `qa/`.

Le total reste **40 h = 10 h accompagnées + 30 h solo**. Chaque module contient 120 minutes d'apprentissage, 30 minutes Colab, 30 minutes de bilan et 60 minutes de webinaire. Le projet final suit **1 h de cadrage → 6 h solo → 1 h de clôture**.

## Séparation des éditions

Le manuel rassemble une partie apprenant et une partie enseignant. Son cadre de revue commun apparaît une seule fois ; les fiches du guide enseignant reprennent ce cadre pour circuler séparément. Les documents Canva élève se publient par module au rythme retenu ; les corrigés et les scripts restent dans l'espace enseignant. Les premiers documents présentent les productions comme conservables. La démonstration de leur assemblage occupe les 25 minutes de construction du webinaire du Module 8.

Les scripts à la première personne sont des propositions pour Jean-Sébastien. Les annotations d'intonation proposent une lecture ; la compréhension de l'élève se constate dans les exercices et les revues.

Le point documentaire courant intègre les huit copies Colab indépendantes, la [version Kaggle publique courante v5, 354436854](../../../receipts/formation/software-version5-kaggle.json), source `68949498…`, avec 141 tests et sept tests Python en 120,7 s ; [v4, 354422952](../../../receipts/formation/software-version4-kaggle.json), reste historique, l'installation statique de l'archive portable f2 par `npm ci`, les retests corrigés M4/M7, les nouveaux exports M3/M8 et leur assemblage exact `141466603…`, les 29 régressions PHP/185 assertions, les 72 contrôles publics de formation après le correctif et les 77 contrôles publics de l'atome. Le nouvel assemblage est compilé avec son lock, puis passe 35 contrôles de navigateur ; les échecs précédents sont conservés. Le second Studio authentifié a été lu avec ses six permissions désactivées ; ses appels natifs et écritures gardent leurs propres critères non exécutés. L'admission du corpus public Context a échoué ; son transport reste désactivé. Le dialogue d'import manuel Colab reste non validé ; le transport HTTP réellement exécuté ne lui attribue pas rétroactivement un succès. Les résultats du candidat et les incidents publics de digest sont conservés séparément. La revue graphique et le prochain tutoriel appartiennent au travail commun ultérieur.

État de production : **copie de lecture DOCX/PDF préparée et revue par Codex, prête pour la revue de l'auteur ; documents Canva pas encore produits**. Les sorties sont [le manuel PDF](outputs/book.pdf), 72 pages, et [le manuel DOCX](outputs/book.docx), 33 tableaux. Le [reçu documentaire final](qa/document-delivery-review.json), le [rapport d'export](qa/export-report.json) et le [rapport de rendu complet](qa/output-review.json) et le [manifeste final des artefacts distribués](qa/final-publication-artifacts.json) identifient les copies réellement examinées. Les six planches de pages et les pages critiques ont été inspectées ; zéro débordement, chevauchement détecté ou glyphe de remplacement. Les 334 annotations de liens sont observées, sans prétendre avoir revisité chaque destination. La pagination native dans Word et l'acceptation humaine du texte restent à examiner. Une copie prête à relire ne ferme pas les critères encore ouverts de la mission : `deliveryReady: false`, `fullMissionComplete: false`.

La clôture opérationnelle du coordinateur garde ses reçus distincts : [ressources cloud arrêtées](../../../receipts/formation/final-resource-cleanup.json), [credentials temporaires de mission retirés et refusés](../../../receipts/formation/final-mission-credential-retirement.json) et [rejeu public Kaggle explicitement étiqueté](../../../receipts/formation/final-browser-public-replay.json). Ce dernier est un rejeu des résultats conservés, sans nouvelle trajectoire autonome. Ces reçus ne modifient ni le contenu ni les empreintes de la copie documentaire déjà rendue.
