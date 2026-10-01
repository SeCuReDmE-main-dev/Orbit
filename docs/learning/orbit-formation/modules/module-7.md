---
title: "Module 7 — Parcours, états et mémoire"
moduleId: 7
missionId: module-7
courseVersion: orbit-course-1.0.0
language: fr-CA
readiness: draft
---

# Module 7 — Parcours, états et mémoire

**Objectif : gérer les transitions sans état bloqué.** Vous allez conserver une sélection, limiter un historique et expliquer la restauration d'une vue. Le module occupe les jours 13–14 : **3 h solo, puis 1 h avec l'enseignant**, avec **2 h solo de projet distinctes**.

Le Module 1 gérait un geste ; celui-ci gère le parcours. « Quel pointeur est actif ? » et « Quelle fiche est ouverte ? » appartiennent à des états différents, même lorsque le même clic intervient dans les deux.

## Code du parcours

Ouvrir [interaction-flow.js](../frontend/module-7/interaction-flow.js), le [notebook élève](../notebooks/module-7.ipynb) et, pour l'enseignant, le [corrigé séparé](../notebooks/instructor/module-7.ipynb).

```js
export const flowOptions = { historyLimit: 32 };
```

Le modèle conserve `view`, `selection`, `elapsed` et `static`. Les vues autorisées sont `mission`, `experience`, `proofs` et `summary`. La sélection conserve un identifiant borné. `navigate` ajoute une entrée ; si le budget est dépassé, la plus ancienne sort.

L'aperçu Colab reçoit `host: null`. Son historique est interne : il ne pilote pas le bouton Retour de la page Colab. Dans le projet Astro, l'hôte navigateur relie les paramètres `learningView` et `learningSelection` à l'URL et écoute `popstate`. Les deux parcours sont vérifiés séparément.

## Deux heures d'apprentissage guidé

| Temps | Travail avec l'assistant | Trace sélectionnée |
|---|---|---|
| 0–30 min | Dessiner liste → fiche → retour avec une sélection précise. Nommer ce qui doit être conservé. | Trois états du parcours |
| 30–60 min | Lire `navigate` et `snapshot`. Repérer validation, ajout et retrait d'une entrée. | Une trace de cinq changements |
| 60–90 min | Lire URL, `popstate` et visibilité. Distinguer historique interne et navigation navigateur. | Une condition de restauration |
| 90–120 min | Préparer l'essai des limites 32/4 et le gel de la chronologie. | Prédiction et scénario |

Demande possible : « Aide-moi à reproduire un retour à une mauvaise sélection. Montre quelles données restaurer, puis demande-moi de tracer cinq changements avec un historique limité à quatre. » L'assistant propose le scénario ; vous conservez la séquence effectivement utilisée.

## Activité Colab — 30 minutes

1. **Prédire — 5 min.** Écrire quelle entrée devrait sortir après cinq changements lorsque `historyLimit` vaut 4. Choisir une séquence précise, avec au moins deux éléments sélectionnés. Prédire l'effet du mode figé sur `elapsed`.
2. **Modifier et observer — 15 min.** Dans `student_files`, comparer `historyLimit: 32` puis `historyLimit: 4` avec la même séquence. Consulter les entrées conservées et la sélection courante. Activer le gel, attendre, reprendre et examiner l'horloge. Ne pas appeler cet essai une validation du bouton Retour navigateur.
3. **Expliquer et exporter — 10 min.** Décrire l'entrée retirée, l'état restauré et les conditions de chronologie. Noter aide, limite et question, puis exporter le code effectivement choisi.

Piste après tentative : l'entrée la plus ancienne sort lorsque la cinquième est ajoutée à un budget de quatre. Le budget concerne ici les entrées de diagnostic internes, pas une suppression arbitraire de l'historique global du navigateur. Le gel suspend `elapsed` et ne doit pas ajouter le temps d'attente au retour.

## Bilan solo — 30 minutes

Prendre 10 minutes pour sélectionner la séquence, 10 minutes pour expliquer un retour et 10 minutes pour préparer le webinaire. Le rendu conserve état initial, événements et état final. « Cela semble fonctionner » devient une vérification utile lorsqu'on peut retrouver le scénario précis.

Une trace locale n'est pas automatiquement un journal à publier. L'élève choisit les éléments à remettre ; aucune conversation complète n'est nécessaire.

## Webinaire — 60 minutes

| Durée | Action avec l'enseignant |
|---|---|
| 10 min | Examiner la séquence et la question de restauration |
| 15 min | Clarifier geste, parcours, historique interne et URL |
| 25 min | Tester fiche, retour navigateur, interruption et gel dans le projet |
| 10 min | Transférer le parcours à une galerie ou un explorateur |

### Script enseignant — séquence de 5 minutes

Les intonations sont proposées pour accompagner la démonstration.

**0:00–1:00 — formuler l'attente.** « Je sélectionne le deuxième élément, puis j'ouvre sa fiche. [Pause.] Quand je reviens, où dois-je me retrouver ? Je veux qu'on nomme la vue et la sélection avant de coder. » Laisser tracer les états.

**1:00–2:00 — distinguer.** « Le pointeur peut être relâché, alors que la fiche reste ouverte. [Accentuer : *deux états différents*.] Quelle donnée appartient au geste ? Quelle donnée appartient au parcours ? » Revenir aux fichiers des Modules 1 et 7 si les rôles sont mélangés.

**2:00–3:00 — suivre les entrées.** « On garde quatre entrées et on fait cinq changements. Montre-moi celle qui sort. » Laisser manipuler et expliquer. Demander aussi ce que conserve la sélection courante, indépendamment du budget de diagnostic.

**3:00–4:00 — vérifier le vrai navigateur.** « Le carnet nous montre un historique interne. Ici, dans le projet, l'URL et le bouton Retour doivent restaurer l'état. [Ralentir.] On vérifie donc ce parcours dans son navigateur cible. » Faire un aller-retour et consigner un éventuel écart.

**4:00–5:00 — transférer.** « Si cette vue devient une galerie, que faut-il conserver lorsque tu ouvres une image puis reviens ? Et si la page est figée, quelle horloge doit rester en place ? » Accepter schéma ou code annoté, avec un essai nouveau avant une conclusion de compréhension.

## Transfert et critères observables

Créer un parcours fiche → liste qui restaure la sélection. L'élève conserve vue et identifiant, explique l'entrée retirée par la borne, distingue historique interne et historique navigateur et vérifie le gel sans rattrapage de temps. Après fermeture, les événements doivent être nettoyés, pas ajoutés à nouveau sans limite.

Les [tests logiciels de briques](../../../../tests/learning-notebooks-bricks.test.ts) examinent notamment l'état interne. Le parcours navigateur demande une observation dans l'environnement cible.

## Ressources et statut

- [History API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/History_API)
- [Page Visibility API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Mission du catalogue](../../../../packages/learning/src/catalog.ts)
- [Projet et reprise](../PROJECT.md)

Statut : fiche préparée. Une reprise décrite dans le code reste à distinguer d'une reprise réellement observée sur l'appareil de l'élève.
