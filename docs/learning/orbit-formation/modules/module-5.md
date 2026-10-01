---
title: "Module 5 — Interpolation et élasticité"
moduleId: 5
missionId: module-5
courseVersion: orbit-course-1.0.0
language: fr-CA
readiness: draft
---

# Module 5 — Interpolation et élasticité

**Objectif : distinguer une transition vers une cible d'un mouvement oscillant.** Vous allez relier cible, position, vitesse, ressort et amortissement, puis expliquer un dépassement. Le module occupe les jours 9–10 : **3 h solo, puis 1 h avec l'enseignant**. Le projet personnel commence aussi pendant ces jours avec des heures distinctes : consulter [PROJECT.md](../PROJECT.md).

Le prérequis est d'avoir rencontré vitesse et durée. Le modèle de ce module rend une transition d'interface réglable ; il ne revendique pas une simulation physique validée.

## Intuition et code

L'[activité Colab](../notebooks/module-5.ipynb) utilise [transitions.js](../frontend/module-5/transitions.js). Le [corrigé enseignant](../notebooks/instructor/module-5.ipynb) reste séparé.

Une interpolation rapproche une valeur de sa cible selon une règle. Un ressort conserve aussi une vitesse : même en arrivant à la cible, il peut continuer et la dépasser. Une animation peut paraître douce avec plusieurs mécanismes ; son apparence ne suffit pas à identifier le code.

```js
export const transitionOptions = { stiffness: 36, damping: 12 };
```

Ici, `value` est une échelle sans unité, `target` sa cible et `velocity` la variation de cette échelle par seconde. Le terme `stiffness × (target - value)` attire vers la cible ; `damping × velocity` freine. `step` borne la durée et la découpe pour l'intégration. Les bornes de ce modèle sont explicites ; des paramètres arbitraires ne deviennent pas sûrs parce qu'une seule animation semble fonctionner.

## Deux heures d'apprentissage guidé

| Temps | Travail avec l'assistant | Trace sélectionnée |
|---|---|---|
| 0–30 min | Dessiner une approche directe et un mouvement qui dépasse. Nommer valeur et cible. | Deux schémas et une différence |
| 30–60 min | Lire `setTarget`, `velocity` et `step`. Suivre un calcul d'accélération avec des nombres simples. | Une ligne de calcul commentée |
| 60–90 min | Lire amortissement, sous-pas et mode statique. Distinguer figer la valeur et la remettre au départ. | Un scénario de gel/reprise |
| 90–120 min | Préparer la comparaison de 12 et 5 avec raideur 36 et cible conservées. | Prédiction, variable et conditions |

Demande possible : « Explique un ressort à partir de `target - value` et `velocity`, puis montre ce qui manque dans une simple interpolation. Demande-moi de prédire un dépassement avant de l'essayer. » Une solution complète est permise ; votre explication revient ensuite au code et à votre observation.

## Activité Colab — 30 minutes

1. **Prédire — 5 min.** Annoncer l'effet attendu du passage de `damping: 12` à `damping: 5`, avec la même cible et `stiffness: 36`. Prédire aussi ce que signifie activer le mode figé pendant le mouvement.
2. **Modifier et observer — 15 min.** Modifier uniquement l'amortissement dans `student_files`, puis exécuter l'aperçu. Comparer dépassement et stabilisation. Activer le gel à un instant choisi et examiner la valeur courante. La reprendre sans demander au modèle de rattraper le temps suspendu. Restaurer la valeur initiale pour un dernier essai.
3. **Expliquer et exporter — 10 min.** Écrire ce que vous avez effectivement vu, votre aide reçue et une limite. Exporter la version choisie ; préciser si vous avez conservé ou restauré le paramètre.

Piste après tentative : une diminution de l'amortissement permet davantage d'oscillation dans cet essai. `step(dt, true)` conserve la valeur et la vitesse présentes. Cela ne signifie pas rendre le mouvement invisible ; l'image actuelle reste consultable.

## Bilan solo — 30 minutes

Passer 10 minutes à sélectionner les résultats, 10 minutes à expliquer un dépassement et 10 minutes à préparer une question pour la revue. Distinguer « j'ai observé cette oscillation » de « j'ai compris toutes les conditions de stabilité ». Une incertitude conservée aide l'enseignant à choisir l'exemple suivant.

Le projet personnel avance en parallèle ; ses heures ne sont pas prises sur ce bilan de module.

## Webinaire — 60 minutes

| Durée | Action avec l'enseignant |
|---|---|
| 10 min | Examiner la comparaison et les valeurs conservées |
| 15 min | Reformuler cible, vitesse, dépassement et stabilisation |
| 25 min | Raccorder une transition du projet ; tester gel, reprise, clavier et nettoyage |
| 10 min | Transférer le mécanisme à une fiche ou une caméra |

### Script enseignant — séquence de 5 minutes

Les intonations sont proposées pour laisser du temps à la prédiction et à l'essai.

**0:00–1:00 — montrer.** « Je veux qu'on distingue deux retours vers une cible. [Pause ; montrer deux trajectoires.] Les deux reviennent, mais l'une dépasse. Quelle donnée peut continuer à évoluer lorsque la valeur arrive à sa cible ? » Laisser l'élève formuler une idée avant de montrer la vitesse.

**1:00–2:00 — relier au code.** « Dans ce code, la distance à la cible attire ; la vitesse conservée peut nous faire passer de l'autre côté. [Ralentir.] L'amortissement freine cette vitesse. Suivons une seule ligne plutôt que toute l'animation. » Montrer les deux termes de l'accélération.

**2:00–3:00 — prédire.** « On garde 36 pour la raideur et on passe de 12 à 5 pour l'amortissement. Quel changement attends-tu ? » Écrire la réponse puis lancer. Donner environ trente secondes à l'observation.

**3:00–4:00 — figer.** « Maintenant, je fige l'image. [Pause.] Où doit rester la valeur ? On peut vérifier cette valeur sans tout enlever. À la reprise, le temps suspendu ne doit pas devenir un saut. » Faire expliquer les données conservées et la chronologie.

**4:00–5:00 — transférer.** « Dans ton projet, quelle transition profiterait de ce mécanisme ? Et à quel moment préfères-tu un changement immédiat ? » Laisser proposer une fiche ou une caméra, avec une justification d'usage. Une préférence esthétique et une vérification technique sont deux traces distinctes.

## Transfert et critères observables

Appliquer la transition à l'ouverture d'une fiche. L'élève nomme le paramètre changé, distingue dépassement et stabilisation, conserve un mode figé utilisable et montre où `dispose()` arrête la ressource. Il explique la différence entre valeur cible et valeur présente dans un nouvel exemple.

Les [tests de briques](../../../../tests/learning-notebooks-bricks.test.ts) examinent les bornes et certains états statiques. Un test réussi ne dispense pas d'observer le geste et de reformuler le mécanisme.

## Ressources et statut

- [Préférence de mouvement réduit — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [Mission et critères du catalogue](../../../../packages/learning/src/catalog.ts)
- [Projet personnel](../PROJECT.md)

Statut : fiche préparée. Les états techniques vérifiés sont documentés dans le bilan courant ; les préférences et la compréhension de l'élève sont examinées pendant la séance.
