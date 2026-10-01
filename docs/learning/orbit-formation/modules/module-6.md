---
title: "Module 6 — Particules et ressources"
moduleId: 6
missionId: module-6
courseVersion: orbit-course-1.0.0
language: fr-CA
readiness: draft
---

# Module 6 — Particules et ressources

**Objectif : distinguer population, durée de vie, calcul et rendu.** Vous allez modifier une population bornée, comparer les effets et expliquer les ressources à libérer. Le module occupe les jours 11–12 : **3 h solo, puis 1 h avec l'enseignant**, avec **2 h solo de projet supplémentaires et distinctes**.

Le prérequis est de lire une position, une vitesse et une durée. Une particule de cet exercice est un petit ensemble de données ; elle n'est pas une particule physique mesurée.

## Ce que contient une particule

Ouvrir [particle-layer.js](../frontend/module-6/particle-layer.js), le [notebook élève](../notebooks/module-6.ipynb) et, pour l'enseignant seulement, le [corrigé séparé](../notebooks/instructor/module-6.ipynb).

```js
export const particleOptions = { count: 64, lifetime: 3, seed: 17 };
```

Chaque élément contient position `x/y`, vitesse `vx/vy` et âge. La population est créée une fois. Un élément arrivé en fin de vie réutilise son emplacement avec un âge nul et une nouvelle position. La limite du modèle est de 256 éléments ; la durée de vie est bornée entre 0,2 et 10 secondes.

La graine `seed` rend la suite de nombres simulés répétable pour les mêmes conditions. Elle ne prouve ni la validité physique du modèle ni une performance identique sur tous les appareils. La fonction `dispose()` vide les données de la couche ; le contrôleur de scène libère séparément ses ressources graphiques.

## Deux heures d'apprentissage guidé

| Temps | Travail avec l'assistant | Trace sélectionnée |
|---|---|---|
| 0–30 min | Lire les données d'une particule. Distinguer nombre, âge et durée de vie. | Une particule annotée |
| 30–60 min | Lire création et réutilisation. Expliquer pourquoi la population n'augmente pas à chaque image. | Un parcours de fin de vie |
| 60–90 min | Distinguer calcul JavaScript, dessin du navigateur, GPU et runtime Python. Lire le nettoyage Three.js. | Une mesure pertinente et une mesure hors portée |
| 90–120 min | Préparer l'essai 64/128 avec durée 3 et graine 17 conservées. Choisir le scénario et l'appareil à décrire. | Prédiction et conditions |

Demande possible : « Suis une particule avant et après sa fin de vie. Explique ce qui change et ce qui reste constant. Aide-moi ensuite à choisir une mesure du navigateur, sans utiliser le temps Python comme mesure du rendu Three.js. »

## Activité Colab — 30 minutes

1. **Prédire — 5 min.** Annoncer ce qui augmente lorsque `count` passe de 64 à 128. Prédire ce que vous pourriez voir et ce qu'un simple chronomètre du runtime ne permettrait pas de conclure.
2. **Modifier et observer — 15 min.** Dans `student_files`, changer seulement `count: 64` en `count: 128`. Garder `lifetime: 3` et `seed: 17`. Comparer la population et le comportement visuel. Activer le mode figé puis reprendre. Restaurer 64 après l'essai. Le notebook dessine un aperçu Canvas : il n'est pas une mesure de coût GPU Three.js.
3. **Expliquer et exporter — 10 min.** Noter navigateur, scénario, population et durée. Si une métrique manque, écrire « indisponible » plutôt que zéro. Conserver observation, aide reçue et limite, puis exporter la version restaurée.

Piste après tentative : deux fois plus d'éléments signifie plus de données à mettre à jour et à dessiner. Cela ne garantit pas une durée de frame exactement doublée : appareil, navigateur, autres travaux et stratégie de rendu comptent. Une mesure de performance doit décrire sa source et ses conditions.

## Bilan solo — 30 minutes

Choisir les traces pendant 10 minutes, expliquer population et ressources pendant 10 minutes, puis préparer une question pendant 10 minutes. Le rendu peut inclure une mesure absente ou un appareil peu performant : ces limites sont utiles pour choisir un effet facultatif.

Vous devez pouvoir distinguer « 128 éléments dans les données » de « 128 objets graphiques indépendants ». Le renderer peut organiser les données autrement ; il faut lire son chemin de code avant de généraliser.

## Webinaire — 60 minutes

| Durée | Action avec l'enseignant |
|---|---|
| 10 min | Examiner paramètres, appareil et source de mesure |
| 15 min | Clarifier réutilisation, durée de vie et nettoyage |
| 25 min | Mesurer dans le navigateur cible ; tester une couche facultative et sa fermeture |
| 10 min | Transférer l'effet à une sélection, avec libellé et mode désactivé |

### Script enseignant — séquence de 5 minutes

Les pauses et intonations ci-dessous sont proposées.

**0:00–1:00 — voir les données.** « Je veux qu'on regarde un point comme une fiche de données. Il a une position, une vitesse et un âge. [Pause.] Si j'en affiche 64, où est-ce que je retrouve ce nombre dans le code ? » Laisser chercher `count` et la création de la liste.

**1:00–2:00 — prédire.** « On va en mettre 128 avec la même durée de vie. Qu'est-ce qui augmente certainement ? Et quelle performance reste à mesurer ? » Accepter une prédiction nuancée ; distinguer population et durée de rendu.

**2:00–3:00 — essayer.** « Exécutons le même scénario. Décris d'abord ce que tu vois. [Pause d'observation.] Maintenant, quelle mesure peux-tu réellement citer ? » Si aucune métrique n'est disponible, consigner ce fait sans inventer une cadence.

**3:00–4:00 — fermer.** « Ces éléments peuvent finir leur vie sans créer une liste infinie. Regardons ce qui est réutilisé. Puis fermons la couche : qui libère ses données, qui libère le matériel graphique ? » Relier `dispose()` aux responsabilités séparées.

**4:00–5:00 — choisir l'usage.** « Pour ton projet, je te propose un effet qui souligne une sélection. Comment garder le texte lisible quand l'effet est désactivé ? » Laisser dessiner le parcours statique. Le choix d'un effet devient une décision expliquée, pas une obligation de multiplier les points.

## Transfert et critères observables

Créer une couche facultative, bornée et désactivable qui signale une sélection. L'élève distingue population et durée, indique la source d'une mesure, conserve un libellé sans effet et montre le nettoyage à la fermeture. Une population identique après plusieurs cycles ne suffit pas à prouver toute l'absence de fuite ; le parcours complet doit être observé.

Le code garde les données présentes en mode figé. La couche peut être désactivée explicitement pour une préférence d'accessibilité distincte.

## Ressources et statut

- [Nettoyage Three.js — manuel officiel](https://threejs.org/manual/#en/cleanup)
- [Contrôleur de scène et ressources graphiques](../frontend/module-3/scene-controller.js)
- [Mission du catalogue](../../../../packages/learning/src/catalog.ts)
- [Projet et conditions de remise](../PROJECT.md)

Statut : fiche préparée. Les performances universelles et l'efficacité pédagogique ne sont pas déduites de l'existence du code ou d'une graine reproductible.
