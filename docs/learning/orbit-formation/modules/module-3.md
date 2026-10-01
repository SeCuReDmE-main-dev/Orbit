---
title: "Module 3 — Scène Three.js et coordonnées"
moduleId: 3
missionId: module-3
courseVersion: orbit-course-1.0.0
language: fr-CA
readiness: draft
---

# Module 3 — Scène Three.js et coordonnées

**Objectif : relier objet, caméra, coordonnées et sélection.** Vous allez observer comment la caméra modifie une projection, puis retrouver le même élément dans une représentation HTML. Le module occupe les jours 5–6 : **3 h solo, puis 1 h avec l'enseignant**.

Le prérequis est de distinguer structure et comportement dans une carte. La scène est une autre manière de présenter les éléments ; leur identifiant et leur contenu restent disponibles dans la liste HTML.

## Code et matériel

Ouvrir le [notebook élève](../notebooks/module-3.ipynb) et [scene-controller.js](../frontend/module-3/scene-controller.js). Le [corrigé enseignant](../notebooks/instructor/module-3.ipynb) est séparé. Le notebook utilise un runtime CPU ; Three.js 0.181.2 s'exécute dans le navigateur depuis un CDN. Le refus du réseau ou l'absence de WebGL conserve le parcours HTML, sans valider une scène 3D.

```js
export const sceneOptions = { cameraDistance: 5 };
```

Le contrôleur reçoit `THREE` depuis son hôte. Il prépare scène, caméra, objets et lumière. Il ne crée pas sa propre boucle de rendu : l'hôte décide quand appeler `render()`. Le même `item.id` relie sphère, sélection et fiche HTML.

Les données de position de l'activité sont normalisées. Le contrôleur les transforme vers la scène ; la caméra projette ensuite la scène vers l'écran. Déplacer une caméra n'est donc pas déplacer les données de l'objet.

## Deux heures d'apprentissage guidé

| Temps | Travail avec l'assistant | Trace sélectionnée |
|---|---|---|
| 0–30 min | Lire scène, caméra, matériau et lumière. Associer chaque mot à un objet du code. | Schéma de la présentation |
| 30–60 min | Suivre un identifiant de la liste HTML à une sphère. Repérer le raycasting. | Chemin « clic → identifiant → fiche » |
| 60–90 min | Lire la projection et le redimensionnement. Distinguer coordonnées normalisées, scène et écran. | Une explication avec trois coordonnées différentes |
| 90–120 min | Préparer la comparaison caméra 5/7 avec positions conservées. Examiner le parcours sans WebGL. | Prédiction et conditions de l'essai |

Demande possible : « Donne-moi une analogie de la caméra, puis relie-la à `camera.position.z` et à `item.position`. Demande-moi quelle valeur change si l'objet paraît plus petit. » L'analogie aide à démarrer ; l'explication finale revient aux données du code.

## Activité Colab — 30 minutes

1. **Prédire — 5 min.** Avec les mêmes objets, annoncer l'effet attendu d'une caméra passant de 5 à 7. Préciser si votre hypothèse concerne la taille affichée ou la position enregistrée.
2. **Modifier et observer — 15 min.** Dans `student_files`, remplacer `cameraDistance: 5` par `cameraDistance: 7`. Exécuter l'aperçu. Choisir une sphère puis le bouton HTML correspondant ; comparer l'identifiant sélectionné. Observer un changement de taille de la zone si l'interface le permet. Si la scène ne démarre pas, consigner le refus et utiliser la liste, sans inventer une observation 3D.
3. **Expliquer et exporter — 10 min.** Décrire ce qui a changé et ce qui reste dans les données. Noter navigateur, disponibilité WebGL, aide reçue et limite. Exporter le contrôleur réellement modifié.

Piste après tentative : reculer la caméra modifie la projection, avec les positions d'objet inchangées. Une sphère et un bouton HTML peuvent désigner le même élément. Un identifiant commun ne suffit toutefois pas à prouver que tous les gestes tactiles ou tous les redimensionnements fonctionnent.

## Bilan solo — 30 minutes

Choisir les traces pendant 10 minutes, rédiger votre explication pendant 10 minutes et préparer une question pendant 10 minutes. Votre rendu nomme l'élément choisi, les deux distances, la disponibilité de la scène et une limite.

La position, la couleur ou la taille d'un objet **ne mesure pas la vérité d'une affirmation**. La scène fournit ici une représentation artistique et pédagogique ; elle ne constitue pas une simulation scientifique validée.

## Webinaire — 60 minutes

| Durée | Action avec l'enseignant |
|---|---|
| 10 min | Examiner la comparaison et le statut WebGL |
| 15 min | Reformuler la distinction objet/caméra/projection |
| 25 min | Raccorder sélection 3D et fiche HTML ; essayer redimensionnement et parcours accessible |
| 10 min | Transférer les mêmes identifiants à une autre représentation |

### Script enseignant — séquence de 5 minutes

Les pauses et intonations proposées servent à laisser une place à l'observation.

**0:00–1:00 — observer.** « Je veux qu'on regarde le même objet sous deux vues. [Pause ; montrer la sphère et son bouton.] Quelle information nous dit qu'il s'agit du même élément ? Montre-moi cet identifiant dans les données. » Laisser chercher avant d'ouvrir le rappel de sélection.

**1:00–2:00 — prédire.** « Je vais reculer la caméra. [Accentuer : *la caméra*.] Est-ce que je dois changer la position enregistrée de l'objet ? Écris ta prédiction. » Attendre la distinction entre données et image.

**2:00–3:00 — comparer.** « Passons de 5 à 7. Décris ce que tu vois avant de l'expliquer. Ensuite, vérifions les valeurs conservées. » Donner du temps à la comparaison. Une observation absente devient une limite, pas un résultat supposé.

**3:00–4:00 — retrouver l'information.** « Si ton appareil ne dessine pas cette scène, comment gardes-tu accès au même contenu ? [Ralentir.] Le bouton HTML représente un vrai parcours de sélection. Essaie-le et explique ce qu'il garde. » Vérifier l'identifiant et la description sans réduire l'exercice à l'effet visuel.

**4:00–5:00 — transférer.** « Pour ton projet, pourrais-tu présenter trois étapes dans une scène et dans une liste ? Quelle donnée doit rester commune ? » Laisser dessiner un exemple. Demander une justification de l'intérêt de la 3D et conserver la question si cet intérêt reste incertain.

## Transfert et critères observables

Créer trois éléments consultables à la fois dans une liste et une scène. L'élève distingue coordonnées d'écran et de scène, montre le lien d'une sélection à sa fiche et retrouve le contenu sans WebGL. Il explique le rôle d'un redimensionnement et les ressources à nettoyer à la fermeture.

Le contrôleur possède `dispose()` pour libérer événements, géométries, matériaux et renderer. La présence de cette fonction dans le code demande encore une vérification de son appel dans le parcours complet.

## Ressources et statut

- [Fondamentaux Three.js — manuel officiel](https://threejs.org/manual/#en/fundamentals)
- [Raycaster — API Three.js](https://threejs.org/docs/#api/en/core/Raycaster)
- [Mission du catalogue](../../../../packages/learning/src/catalog.ts)
- [Projet et règles de remise](../PROJECT.md)

Statut : fiche préparée. Une réussite de l'aperçu ne remplace pas les tests du navigateur cible, la compilation Astro ou l'examen de votre explication.
