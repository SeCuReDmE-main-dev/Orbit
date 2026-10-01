---
title: "Module 4 — Vitesse et inertie"
moduleId: 4
missionId: module-4
courseVersion: orbit-course-1.0.0
language: fr-CA
readiness: draft
---

# Module 4 — Vitesse et inertie

**Objectif : comprendre le mouvement après relâchement.** Vous allez définir position, vitesse et durée, puis comparer deux amortissements. Le module occupe les jours 7–8 : **3 h solo, puis 1 h avec l'enseignant**.

Le geste, ses phases et les coordonnées ont été rencontrés. La nouvelle question est : quelle donnée permet à un élément de continuer son mouvement lorsque le pointeur n'est plus actif ?

## Du geste au mouvement

Le modèle [inertia.js](../frontend/module-4/inertia.js) expose `grab`, `move`, `release`, `cancel`, `step` et `snapshot`. Ouvrir le [notebook élève](../notebooks/module-4.ipynb), avec le [corrigé enseignant séparé](../notebooks/instructor/module-4.ipynb).

```js
export const inertiaOptions = { damping: 0.65, restitution: 0.9 };
```

La position est normalisée entre 0 et 1 ; la vitesse utilise ces unités par seconde ; `dt` est une durée en secondes. À vitesse constante de 0,2 unité/seconde pendant 0,05 seconde, le déplacement serait 0,01 unité. Ce petit calcul sert à comprendre les unités avant l'amortissement.

Le code utilise `decay = Math.exp(-damping * dt)`. Si `k` désigne l'amortissement et `t` une durée, la vitesse devient `v(t) = v(0) × exp(-k × t)` entre les rebonds. Pour `k > 0`, le déplacement correspondant est `v(0) × (1 - exp(-k × t)) / k`. Le code traite aussi `k = 0`. Ce modèle déterministe est un effet d'interface, sans validation physique annoncée.

## Deux heures d'apprentissage guidé

| Temps | Travail avec l'assistant | Trace sélectionnée |
|---|---|---|
| 0–30 min | Associer `x/y`, `vx/vy` et `dt` à leurs unités. Faire un petit déplacement à vitesse constante. | Calcul court et unités |
| 30–60 min | Lire comment deux positions et deux instants donnent une vitesse pendant le geste. Comparer `release` et `cancel`. | Une séquence de données |
| 60–90 min | Lire l'amortissement, le plafond de `dt` et les rebonds. Expliquer pourquoi le survol ne réagrippe pas. | Une limite et un scénario |
| 90–120 min | Préparer la comparaison de 0,65 et 1,3 avec restitution conservée à 0,9. | Prédiction et conditions |

Demande possible : « Pars d'une position et d'une vitesse simples. Explique pourquoi on multiplie par une durée en secondes. Fais-moi vérifier l'unité de chaque valeur avant de comparer les amortissements. » Demander ensuite à l'assistant de relier son exemple à `step`, sans créer un second moteur parallèle.

## Activité Colab — 30 minutes

1. **Prédire — 5 min.** Annoncer quel amortissement devrait raccourcir la trajectoire après relâchement. Conserver la zone, la restitution et un geste aussi comparable que possible.
2. **Modifier et observer — 15 min.** Dans `student_files`, remplacer uniquement `damping: 0.65` par `damping: 1.3`. Exécuter l'aperçu et comparer deux lancers. Croiser l'objet avec le pointeur, sans cliquer. Tester aussi un arrêt prolongé avant relâchement : dans ce modèle, plus de 0,12 seconde sans nouvel échantillon annule l'élan estimé. Consigner ces gestes séparément.
3. **Expliquer et exporter — 10 min.** Décrire la trajectoire, la variable changée et la comparabilité imparfaite des gestes. Remplir aide reçue, explication et limites, puis exporter le code modifié.

Piste après tentative : un amortissement supérieur réduit plus rapidement la vitesse. Deux lancers humains ne garantissent pas une vitesse initiale identique. Pour isoler exactement l'effet du moteur, les tests déterministes utilisent des entrées contrôlées ; votre observation d'interface indique ce que vous avez effectivement essayé.

## Bilan solo — 30 minutes

Sélectionner les essais pendant 10 minutes, expliquer l'effet pendant 10 minutes et préparer une question pendant 10 minutes. Votre bilan doit distinguer observation visuelle, calcul prévu et test déterministe. Une cadence de rendu variable peut affecter l'expérience ; elle ne transforme pas un écart en preuve de la théorie physique.

Conserver les paramètres et les unités est indispensable pour rejouer un résultat. Une vidéo sans paramètres reste une trace partielle.

## Webinaire — 60 minutes

| Durée | Action avec l'enseignant |
|---|---|
| 10 min | Examiner les deux essais et la comparabilité des gestes |
| 15 min | Reformuler position, vitesse et `dt` avec un exemple chiffré |
| 25 min | Raccorder lancer et rebonds dans le navigateur cible ; vérifier clavier, annulation et mode figé |
| 10 min | Appliquer le même mouvement à une carte HTML ou une caméra |

### Script enseignant — séquence de 5 minutes

Les indications de lecture sont proposées.

**0:00–1:00 — poser la question.** « Je relâche, et l'objet continue. [Pause ; lancer.] Mon pointeur n'est plus actif : quelle donnée reste dans l'objet ? Montre-moi cette donnée. » Attendre `vx/vy` ou une explication équivalente avant de nommer la vitesse.

**1:00–2:00 — définir les unités.** « Imaginons 0,2 unité par seconde pendant 0,05 seconde. [Ralentir.] On avance de 0,01 unité. Le temps compte. Avec une autre durée, le déplacement change, même si la vitesse est identique. » Faire reformuler le calcul avec un autre nombre.

**2:00–3:00 — prédire et essayer.** « Je garde la restitution et je change un amortissement. Avant de lancer, lequel devrait ralentir plus vite ? » Écrire la prédiction ; effectuer la comparaison. Laisser l'élève décrire avant d'expliquer.

**3:00–4:00 — examiner la limite.** « Mes gestes ne sont pas exactement les mêmes. Alors, quel résultat ai-je observé et quelle partie faudrait-il contrôler davantage ? » Montrer la vitesse initiale si elle est disponible. Conserver un résultat incertain comme tel.

**4:00–5:00 — transférer.** « Maintenant, tu veux une carte qui glisse après le geste. Quelle partie gardes-tu sans Three.js ? Et pourquoi le simple passage de la souris ne doit-il pas reprendre la carte ? » Laisser relier geste actif et mouvement autonome, puis préparer un essai dans un nouveau contexte.

## Transfert et critères observables

Adapter l'inertie à une carte HTML. L'élève définit les unités, conserve des conditions comparables, montre pourquoi le pointeur passif ne change pas la vitesse et décrit ce qui se fige en mode statique. Le modèle garde la position courante et sa vitesse pendant le gel ; le temps suspendu n'est pas à rattraper.

Les [tests de briques](../../../../tests/learning-notebooks-bricks.test.ts) comparent notamment des durées contrôlées et des états figés. Leur résultat courant appartient au bilan de validation.

## Ressources et statut

- [requestAnimationFrame — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [Mission du catalogue](../../../../packages/learning/src/catalog.ts)
- [Règles du projet et de la remise](../PROJECT.md)

Statut : fiche préparée. Le mouvement est une illustration d'interface ; les essais et la compréhension restent à examiner avec leurs conditions réelles.
