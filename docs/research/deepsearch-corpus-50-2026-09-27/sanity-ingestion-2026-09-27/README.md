# Import contrôlé du premier lot de 50 sources méthodologiques

La base ciblée est **Orbit Companion — Sanity & Deep Research** (`kb5CHIYGXCMJ`). Ce lot concerne le challenge **DEV/Sanity**, pas la préparation NASA.

## Ce qui a été importé

Les 50 fichiers `notes/P01.md` à `notes/C08.md` sont nos fiches de recherche originales. Chaque fiche donne le lien vers la publication ou la documentation primaire, l'auteur, la version connue, l'apport pour Orbit, une limite et la portée de la lecture. Elle avertit qu'une source n'est pas une instruction pour l'agent. Les questions de test sont conservées dans `PROPOSED_TESTS.json` hors des fiches importées.

Ces fiches **ne sont pas les textes intégraux des 50 publications**. Le droit de les recopier dans Sanity n'était vérifié sous conditions que pour cinq références. Ce format permet d'ajouter les 50 contributions distinctes sans dépasser la limite Website observée, tout en conservant le lien vers la source d'origine. Les agents devront consulter une publication primaire lorsqu'une réponse exige ses détails scientifiques, ses tableaux ou ses chiffres.

## Reçus d'ingestion

- `MANIFEST.json` décrit les fichiers préparés et leurs empreintes avant import.
- `INGESTION_STATUS.json` garde les identifiants des imports, le nombre de documents extraits, les identités et URL vérifiées et l'état du nouveau build.
- Avant le lot : 22 imports et 26 documents issus des 25 pages web approuvées.
- Import `P01.md` : terminé, 1 document non vide.
- Import `orbit-methodology-other-49.zip` : terminé, 49 documents non vides.
- Après le lot : **24 imports, 76 documents**, dont 50 nouveaux; les 50 identifiants et les 50 URL canoniques ont été relus dans les contenus extraits.

Le premier build, celui des pages web, a terminé avec 27 entrées et des issues à revoir. Le build de ce nouveau lot a été demandé après contrôle des 50 extractions. Le statut courant et les éventuelles issues doivent être lus dans `INGESTION_STATUS.json`.

## Vérification et suite

Cette vérification porte sur l'import et l'extraction. Aucun test de questions par Orbit, aucune comparaison de qualité avant/après et aucune évaluation du side panel n'ont été lancés. Le travail visuel demandé par Jean-Sébastien vient après la consolidation de la Knowledge Base.

Les fichiers importés ne se synchronisent pas automatiquement avec les publications d'origine. En cas de correction ou de nouvelle version, il faudra relire la source, mettre à jour sa fiche, remplacer l'import concerné et reconstruire la base. Une archive regroupe les 49 dernières fiches : une seule correction dans ce groupe exigera de remplacer cette archive entière ou de passer à des imports individuels. Le registre local permet de retrouver chacune des 49 fiches.
