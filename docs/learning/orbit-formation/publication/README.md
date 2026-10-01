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

Le point documentaire courant conserve l’import Colab gratuit par sélection explicite de huit ZIP, puis l’assemblage `7ae43df9…` et sa compilation statique dans Kaggle. La [qualification](QUALIFICATION.md) relie les reçus, versions et limites. V2 354480684 reste immuable ; la publication V3 354484426, observée par le coordinateur, corrige la présentation Markdown sans nouveau rejeu. Le corpus Context fournit outline et neuf entrées READY sur sa projection auditée. Les 16 contrôles natifs hors origine sont conservés dans la version Kaggle354497668. Les appels, workspace, publication sélectionnée et déconnexion du Studio authentifié gardent leurs critères séparés.

**Neuf documents Canva élève sont publiés et relus.** Leur [index](CANVA_DELIVERY.md), leur [reçu](CANVA_DELIVERY.json) et les neuf captures dans `qa/canva/` décrivent les sorties réelles. Le prototype initial est préservé ; aucune modification du landing ou publication d’un travail d’élève n’est faite par cette production.

Les sorties de lecture sont [le manuel PDF](outputs/book.pdf), [le manuel DOCX](outputs/book.docx) et [la source maintenable](MASTER_MANUSCRIPT.md). Leur nombre de pages, empreintes et revue actuelle se lisent dans [le reçu documentaire](qa/document-delivery-review.json), [le rapport d’export](qa/export-report.json), [le rendu de toutes les pages](qa/output-review.json) et [l’inventaire final](qa/final-publication-artifacts.json). Les anciennes copies conservent leurs empreintes ; la dernière reconstruction a sa propre revue.

Les fiches [enseignant](TEACHER_GUIDE.md) et les [missions des assistants](ASSISTANT_MISSIONS.md) peuvent circuler séparément. Les scripts sont proposés, avec pauses et intentions pédagogiques ; ils ne déclarent aucun apprentissage humain accompli.

La pagination native Word, la revue du texte par l’auteur et l’efficacité pédagogique restent des examens distincts. Une copie documentaire prête à relire ne ferme pas les critères encore ouverts de la mission : `deliveryReady: false`, `fullMissionComplete: false`.
