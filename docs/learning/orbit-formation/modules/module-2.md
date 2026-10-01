---
title: "Module 2 — Organisation Astro"
moduleId: 2
missionId: module-2
courseVersion: orbit-course-1.0.0
language: fr-CA
readiness: draft
---

# Module 2 — Organisation Astro

**Objectif : séparer contenu, présentation et comportement.** Vous apprendrez à retrouver le fichier responsable d'une modification et à réutiliser une carte avec un autre contenu. Le module occupe les jours 3–4 : **3 h solo, puis 1 h avec l'enseignant**.

Le prérequis est d'avoir rencontré le parcours événement → état → rendu du [Module 1](module-1.md). Votre assistant peut expliquer directement Astro ; votre travail consiste ensuite à vérifier cette explication dans les fichiers et à préparer une modification précise.

## Fichiers à examiner

- [ExplorationCard.astro](../frontend/module-2/ExplorationCard.astro) fournit le titre, la section, la liste et le paragraphe de description.
- [exploration-card.js](../frontend/module-2/exploration-card.js) crée les boutons, associe un identifiant à chaque élément et actualise la description.
- [Notebook élève](../notebooks/module-2.ipynb) ; [corrigé séparé enseignant](../notebooks/instructor/module-2.ipynb).

La carte Astro déclare deux propriétés : `id` et `title`. Sa liste HTML est vide au départ ; le contrôleur fourni y ajoute les éléments. Cette séparation permet de changer les données sans recopier les événements.

```js
export const cardOptions = { descriptionPrefix: 'Mon observation : ' };
```

Le préfixe appartient à la description affichée par le contrôleur. Modifier ce texte ne doit pas ajouter un bouton. Dans le fichier Astro, `aria-label` reprend le titre de la section : un libellé reste nécessaire même si la carte change d'apparence.

## Deux heures d'apprentissage guidé

| Temps | Travail avec l'assistant | Trace sélectionnée |
|---|---|---|
| 0–30 min | Lire le composant Astro. Retrouver propriétés, section, titre, liste et description. | Arborescence courte et rôle de chaque élément |
| 30–60 min | Lire `createCards`, `select` et `dispose`. Suivre un identifiant depuis les données jusqu'au bouton. | Un parcours de sélection annoté |
| 60–90 min | Lire les composants Astro et les îlots. Distinguer page construite, HTML reçu et comportement navigateur. | Explication de trois responsabilités |
| 90–120 min | Choisir un autre contenu pour une carte et préparer une modification unique. | Prédiction et contenu personnel d'essai |

Demande possible : « Voici ces deux fichiers. Explique qui fournit le HTML, qui remplit la liste et qui réagit à la sélection. Donne un exemple complet, puis demande-moi où je changerais le titre sans changer l'état du geste. » Votre assistant aide à lire ; les chemins et symboles servent à contrôler sa réponse.

## Activité Colab — 30 minutes

1. **Prédire — 5 min.** Écrire ce qui changera si `descriptionPrefix` devient `Ma décision expliquée : `. Prédire aussi ce qui restera identique : nombre de boutons, identifiants et sélection.
2. **Modifier et observer — 15 min.** Dans `student_files`, changer seulement le préfixe de `exploration-card.js`. Exécuter l'aperçu, sélectionner deux éléments et comparer la description. Retrouver ensuite le titre dans `ExplorationCard.astro`, sans attribuer la modification au mauvais fichier.
3. **Expliquer et exporter — 10 min.** Décrire la responsabilité de chaque fichier ; conserver votre aide reçue, une limite et une question. Exporter les deux fichiers dans le même ZIP.

L'aperçu du notebook présente une contrepartie HTML préparée. **Il ne compile pas le composant Astro.** L'exercice permet de comparer le comportement de la carte ; la compilation du vrai composant appartient au parcours de projet vérifié séparément.

Piste après tentative : `createCards` utilise `textContent` pour les titres et descriptions, puis `aria-pressed` pour la sélection. Rechercher `select(id)` permet de relier le bouton aux données. Une amélioration de style se vérifie ensuite dans le projet, avec le titre et le clavier préservés.

## Bilan solo — 30 minutes

Prendre 10 minutes pour choisir votre modification et les traces, 10 minutes pour expliquer la séparation des responsabilités et 10 minutes pour préparer le webinaire. Votre rendu comprend le ZIP, un exemple de carte pour votre sujet et une phrase qui distingue aperçu HTML et compilation Astro.

Une suggestion de l'assistant, un code exécuté et une explication comprise ont des statuts distincts. Vous pouvez signaler « je retrouve le fichier, mais je ne peux pas encore expliquer ce contrôleur » : cette limite prépare une revue utile.

## Webinaire — 60 minutes

| Durée | Action avec l'enseignant |
|---|---|
| 10 min | Examiner le rendu et l'arborescence proposée |
| 15 min | Clarifier contenu, structure et comportement sur un exemple personnel |
| 25 min | Raccorder la carte dans le projet Astro ; vérifier titre, sélection, clavier et compilation |
| 10 min | Réutiliser la carte pour un nouveau sujet sans recopier la logique |

### Script enseignant — séquence de 5 minutes

Les intonations sont des propositions de lecture.

**0:00–1:00 — partir de la carte.** « On a une carte, un titre et trois choix. Je veux changer le sujet. [Pause.] Avant de toucher au code, quel fichier ouvre-t-on ? Montre-moi ton raisonnement avec le titre que tu veux remplacer. » Laisser l'élève choisir un fichier et expliquer pourquoi.

**1:00–2:00 — suivre une donnée.** « Ici, Astro fournit une place : une section, une liste, une description. Le contrôleur remplit cette place. [Accentuer : *la même donnée, un rôle précis*.] Suivons un identifiant jusqu'au bouton. » Montrer les données, `dataset.learningId` et le rappel `onSelect`.

**2:00–3:00 — comparer.** « Tu as changé un préfixe. Qu'as-tu vu ? Et qu'est-ce qui aurait dû rester identique ? » Attendre le constat de l'élève. En cas d'écart, regarder le fichier exécuté plutôt que supposer une erreur de compréhension.

**3:00–4:00 — poser la limite.** « Le carnet nous donne un aperçu HTML. Pour savoir si le vrai composant Astro se construit, on doit examiner sa compilation. [Ralentir.] Ce sont deux vérifications utiles, avec deux objets différents. » Faire nommer l'objet vérifié par chaque étape.

**4:00–5:00 — transférer.** « Imagine une carte pour trois livres ou trois activités. Quelles données changes-tu ? Quelle logique peux-tu garder ? » Laisser annoter trois modifications puis expliquer la partie conservée. La répétition d'une phrase du cours ne suffit pas : l'élève doit montrer son nouveau contenu.

## Transfert et critères observables

Préparer une carte pour un thème personnel. L'élève retrouve le rôle de chaque fichier, change une propriété sans dupliquer la logique et explique la différence entre l'aperçu et la compilation. La sélection doit garder un libellé et un état accessibles.

Le squelette et les contrôleurs fournis sont attribués au cours. Votre contenu, vos modifications et les contributions de l'assistant sont identifiés dans le bilan.

## Ressources et statut

- [Composants Astro — documentation officielle](https://docs.astro.build/en/basics/astro-components/)
- [Architecture en îlots — documentation officielle](https://docs.astro.build/en/concepts/islands/)
- [Mission et critères du catalogue](../../../../packages/learning/src/catalog.ts)
- [Règles du projet et de la remise](../PROJECT.md)

Statut : fiche préparée. Les tests et la compilation sont à lire dans le bilan technique courant ; ils ne constituent pas une certification de la compréhension de l'élève.
