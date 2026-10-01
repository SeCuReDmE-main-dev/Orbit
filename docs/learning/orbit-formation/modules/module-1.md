---
title: "Module 1 — Geste, état et rendu"
moduleId: 1
missionId: module-1
courseVersion: orbit-course-1.0.0
language: fr-CA
readiness: draft
---

# Module 1 — Geste, état et rendu

**Objectif : expliquer quelle donnée un événement modifie et comment le rendu en dépend.** À la fin de l'activité, vous devez pouvoir retrouver la position, le pointeur actif et la phase du geste dans le code, puis expliquer un relâchement et une interruption. La fiche fournit une méthode ; votre compréhension sera examinée pendant le webinaire.

Ce module occupe les jours 1–2 : **3 h solo, puis 1 h avec l'enseignant**. Le notebook et le modèle sont fournis. Vos modifications et votre explication restent attribuées séparément à vous et à votre assistant.

## Avant de commencer

Ouvrez le [notebook élève](../notebooks/module-1.ipynb) dans Colab, puis conservez une copie personnelle. Un compte Google gratuit et un runtime CPU suffisent. L'assistant personnel peut fournir un exemple complet ; vous choisissez ce que vous essayez et remettez.

Le code d'étude est [interaction-state.js](../frontend/module-1/interaction-state.js). Les corrigés sont réservés à l'enseignant dans [la copie séparée](../notebooks/instructor/module-1.ipynb). La mission du catalogue est définie dans [catalog.ts](../../../../packages/learning/src/catalog.ts).

## Deux heures d'apprentissage guidé

| Temps | Votre travail avec l'assistant | Trace sélectionnée |
|---|---|---|
| 0–30 min | Lire le modèle. Repérer `state.position`, `phase` et `pointerId`. Dessiner « événement → donnée → rendu ». | Un petit schéma et une question |
| 30–60 min | Lire `pointerdown` et `pointermove`. Expliquer pourquoi un survol seul ne déplace pas l'élément. | Trois phrases reliées aux lignes concernées |
| 60–90 min | Comparer `pointerup`, `pointercancel` et `lostpointercapture`. Lire les ressources officielles. | Une différence entre relâchement et annulation |
| 90–120 min | Reprendre le parcours au clavier. Préparer une prédiction avec deux pressions vers la droite. | Valeur initiale, valeur testée, conditions |

Demande possible à l'assistant : « Explique-moi `pointerId` à partir de ce fichier. Donne un scénario normal et un scénario interrompu, puis demande-moi quelle donnée doit être restaurée. » Vous pouvez demander la solution ; votre propre trace décrit ensuite ce que vous avez vérifié.

Dans ce modèle, `x` et `y` sont normalisés entre 0 et 1. `x = 0.5` signifie le milieu de la zone, pas 0,5 pixel. L'état est copié avant transmission au rendu, afin de garder une séparation explicite entre les données et leur présentation.

```js
export const interactionOptions = { keyboardStep: 0.04 };
```

Cette valeur règle le pas clavier. Elle ne change ni la largeur de la zone ni la vitesse de la souris. Sous capture du pointeur, sortir de la zone ne signifie pas automatiquement annuler le geste.

## Activité Colab — 30 minutes

1. **Prédire — 5 min.** À partir de `x = 0.5`, annoncer la position attendue après deux flèches droites avec un pas de 0,04, puis 0,08. Ajouter une hypothèse sur le pointeur actif après annulation. Écrire la prédiction avant l'aperçu.
2. **Modifier et observer — 15 min.** Dans `student_files`, changer uniquement `keyboardStep: 0.04` en `keyboardStep: 0.08`. Exécuter l'aperçu depuis cette même variable. Comparer deux pressions ; essayer un geste puis son relâchement. Repérer dans le code la transition d'annulation. Une annulation native dépend du navigateur et du périphérique ; ne la déclarez pas observée si vous avez seulement lu le code ou pressé Échap.
3. **Expliquer et exporter — 10 min.** Noter le résultat observé, la variable conservée et une limite. Remplir l'aide reçue et l'explication, puis exporter le ZIP. Le ZIP contient le code effectivement présent dans `student_files`, pas un corrigé substitué.

Piste de vérification, à consulter après votre prédiction : deux pressions ajoutent 0,08 avec le premier pas et 0,16 avec le second, tant que la borne droite n'est pas atteinte. Le code place `pointerId` à `null` à la fin d'un geste. Ce calcul attendu ne remplace pas votre essai.

## Bilan solo — 30 minutes

Consacrer 10 minutes au choix des traces à remettre, 10 minutes à une explication personnelle et 10 minutes à la question pour le webinaire. Conserver le ZIP, le scénario utilisé et les éventuels écarts. Une capture seule montre une image ; l'explication doit nommer l'événement et l'état.

Votre carnet personnel et ses sorties sont dans Colab/Drive. Vous choisissez le rendu transmis à l'enseignant. Aucune conversation privée complète n'est requise.

## Webinaire — 60 minutes

| Durée | Action avec l'enseignant |
|---|---|
| 10 min | Lire le rendu et votre question ; distinguer fourni, modifié, exécuté et déclaré |
| 15 min | Reformuler un scénario d'annulation et une sélection clavier |
| 25 min | Raccorder l'interaction à une vraie zone du projet ; essayer capture, relâchement, interruption et clavier |
| 10 min | Adapter le geste à une carte et expliquer les données à conserver |

### Script enseignant — séquence de 5 minutes

Les pauses et intonations ci-dessous sont proposées pour la lecture, sans reproduction vérifiée d'une voix enregistrée.

**0:00–1:00 — montrer.** « Je veux qu'on parte d'un geste simple. Je prends l'objet, je le déplace et je relâche. [Pause ; faire le geste.] Ce qui m'intéresse, c'est la donnée qui change. Dans ce code, où se trouve sa position ? » Laisser l'élève pointer le champ ; ouvrir ensuite `state.position`.

**1:00–2:00 — prédire.** « Maintenant, je passe la souris sans cliquer. [Accentuer : *sans cliquer*.] Qu'est-ce qui devrait changer ? On écrit notre idée avant de regarder. » Attendre une réponse, puis montrer la condition sur `pointerId` dans `pointermove`.

**2:00–3:00 — distinguer.** « Relâcher et être interrompu ont une conséquence commune : le geste actif doit se terminer. La raison reste différente. [Ralentir.] Une sortie de zone sous capture peut continuer le geste. Regardons donc le nom de l'événement et l'identifiant actif, ensemble. » Comparer deux états sans demander de mémoriser toutes les API.

**3:00–4:00 — essayer.** « Tu choisis le pas clavier. Prédis deux déplacements, puis essaie. Je te laisse expliquer la différence. » Laisser environ trente secondes à la manipulation et à la comparaison.

**4:00–5:00 — transférer.** « Si cette sphère devient une carte de ton site, quelle donnée gardes-tu ? Et si le geste s'interrompt, comment éviter une carte qui reste accrochée ? » Accepter texte, dessin ou code annoté. Si l'explication manque, revenir à un seul événement plutôt que conclure à une maîtrise acquise.

## Transfert et critères observables

Créer une carte déplaçable qui dispose aussi d'une commande clavier. Vous devez pouvoir : nommer la donnée modifiée ; distinguer relâchement, sortie de zone et annulation ; montrer la remise à zéro du pointeur actif ; sélectionner le même élément sans souris. Un scénario vérifié et une reformulation valent davantage qu'une définition copiée.

Les [tests logiciels](../../../../tests/learning-notebooks-bricks.test.ts) examinent des comportements du modèle. Ils ne certifient ni un geste tactile réel ni votre compréhension.

## Ressources primaires et limites

- [Capture du pointeur — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture)
- [Événement pointercancel — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event)
- [Projet et règles de remise](../PROJECT.md)

Statut de cette fiche : source pédagogique préparée. La validation technique et les observations Colab sont consignées dans le bilan de livraison ; aucune réussite de l'élève n'est déduite de ce document.
