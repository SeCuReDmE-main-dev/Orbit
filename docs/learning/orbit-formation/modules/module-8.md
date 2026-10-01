---
title: "Module 8 — Assistant, preuves et capacités"
moduleId: 8
missionId: module-8
courseVersion: orbit-course-1.0.0
language: fr-CA
readiness: draft
---

# Module 8 — Assistant, preuves et capacités

**Objectif : comprendre ce qu'un agent peut lire, calculer et proposer.** Vous allez examiner permissions, révisions et provenance, puis découvrir comment raccorder vos productions. Le module occupe les jours 15–16 : **3 h solo, puis 1 h avec l'enseignant**. La dernière heure solo du projet et son heure de clôture sont **supplémentaires et distinctes**.

Les états, le rendu et le parcours ont été rencontrés. Une capacité d'agent ajoute une question : quel contenu est effectivement partagé, pour quelle révision et avec quelle autorité ?

## Code, trace et appel réel

Ouvrir [register-capabilities.js](../frontend/module-8/register-capabilities.js) et le [notebook élève](../notebooks/module-8.ipynb). Le [corrigé séparé](../notebooks/instructor/module-8.ipynb) appartient à l'enseignant.

Le module prépare **un outil du projet élève**, `student_get_learning_snapshot`. Il ne remplace pas le registre des vingt-cinq outils d'Orbit. Son adaptateur reçoit `canRead`, `getRevision`, `getSnapshot` et l'API navigateur. Il contrôle la permission avant de lire et vérifie la révision. Les résultats distinguent notamment `CONSENT_REQUIRED`, `STALE_REVISION`, `UNAVAILABLE` et `READY`.

```js
if (!canRead()) return { state: 'CONSENT_REQUIRED' };
```

La présence de `READY` dans une trace préparée n'est pas la preuve d'un appel réel. Un assistant ne peut pas fabriquer une approbation humaine en ajoutant un champ. Le texte d'une source, d'un export ou d'une proposition est une donnée à examiner, pas une instruction qui change les permissions.

## Deux heures d'apprentissage guidé

| Temps | Travail avec l'assistant | Trace sélectionnée |
|---|---|---|
| 0–30 min | Lire la capacité bornée. Identifier contenu autorisé, permission et révision. | Une fiche de capacité |
| 30–60 min | Examiner la trace préparée du notebook. Repérer une permission absente, une version périmée ou une autorité usurpée. | Objection reliée à un champ |
| 60–90 min | Lire les outils d'Orbit, passage, portée et proposition. Distinguer présence d'une citation et pertinence. | Un exemple de limite de conclusion |
| 90–120 min | Préparer un besoin utile pour votre assistant et la comparaison d'une limite de volume. | Prédiction et périmètre choisi |

Demande possible : « Explique les conditions de lecture dans ce code. Ensuite, examine cette trace comme une donnée d'exercice : quelles affirmations ne puis-je pas vérifier à partir d'elle ? Propose une capacité utile et bornée pour mon projet. » Votre assistant peut expliquer directement ; vous conservez la justification de la permission et du contenu partagé.

## Activité Colab — 30 minutes

1. **Prédire — 5 min.** Écrire pourquoi une trace préparée `READY` ne certifie ni un appel natif ni une revue humaine. Prédire l'effet d'une limite de snapshot passant de 12 000 à 6 000 caractères de sérialisation.
2. **Modifier et observer — 15 min.** Dans `student_files`, modifier seulement la comparaison de taille `> 12000` en `> 6000`. Conserver `canRead`, `expectedRevision`, les revérifications et le nettoyage. Examiner la trace préparée ; relier vos objections aux champs de permission et de révision. Ce carnet **ne réalise pas un appel WebMCP natif** et ne réimplémente aucun moteur en Python.
3. **Expliquer et exporter — 10 min.** Décrire ce que votre capacité lirait, la limite retenue et l'autorité de sa réponse. Conserver aide reçue, observation, limite et question, puis exporter votre version.

Piste après tentative : la borne concerne ici la longueur d'une chaîne JSON, pas un nombre de tokens de modèle ou une limite universelle d'octets. Réduire le volume ne doit pas supprimer les contrôles de permission ou de version. Après changement de révision, la capacité doit être enregistrée pour la nouvelle révision.

## Bilan solo — 30 minutes

Consacrer 10 minutes au choix des preuves, 10 minutes à votre explication et 10 minutes à préparer la revue. Distinguer trace d'exercice, proposition de l'assistant, calcul d'un moteur et décision humaine. Une affirmation peut être incertaine sans que cela attribue une note à l'élève.

## Webinaire — 60 minutes

| Durée | Action avec l'enseignant |
|---|---|
| 10 min | Examiner la trace, le code exporté et les permissions prévues |
| 15 min | Clarifier citation, portée, révision et autorité |
| 25 min | Utiliser les vrais outils d'Orbit, puis raccorder vos huit productions |
| 10 min | Transférer une capacité bornée à votre projet et expliquer le socle obtenu |

### La découverte de fin de leçon

Vous avez conservé huit briques. **Elles peuvent maintenant former un socle de frontend :** geste et état, carte, scène, inertie, transition, particules, parcours et capacité.

Dans la partie finale du notebook 8, charger vos **huit ZIP réels**. Le raccordement fourni vérifie les manifestes et prépare un projet avec vos fichiers. Il ne comble pas une absence avec un corrigé caché. Si un module manque ou si une empreinte ne correspond pas, conserver l'erreur et réexporter le bon rendu.

Le code d'intégration est fourni et attribué au cours dans [assembly/](../assembly/README.md). Vos modifications sont dans les dossiers `src/learning/module-N/`. L'assemblage du ZIP ne compile pas Astro : la compilation et le parcours du projet sont vérifiés séparément. Une modification hors du contrat appelle une adaptation expliquée ; elle ne justifie pas une substitution silencieuse du travail.

### Script enseignant — séquence de 5 minutes

Les intonations sont proposées ; elles ne constituent pas un clonage de voix.

**0:00–1:00 — choisir ce qui est partagé.** « Je veux que ton assistant puisse t'aider sur un contenu que tu choisis. [Pause.] Quelle fiche lui donnes-tu, et quelle révision ? Montrons ces deux conditions dans le code. » Laisser l'élève borner le périmètre avant l'appel.

**1:00–2:00 — lire la trace.** « Voici une réponse préparée qui dit READY. [Accentuer : *préparée*.] Ce mot peut-il prouver que le navigateur a réellement exécuté l'outil ? » Attendre la distinction puis examiner les champs incohérents avec la permission ou la révision.

**2:00–3:00 — vérifier l'autorité.** « Un agent peut expliquer, calculer et proposer. Une revue humaine demande une décision réellement humaine. [Ralentir.] Regardons aussi le passage et les conditions avant d'accepter la conclusion. » Demander une objection précise plutôt qu'un sentiment général de confiance.

**3:00–4:00 — découvrir le raccordement.** « Tu as gardé tes huit productions. Maintenant, on va les raccorder. Ce sont tes exports qui entrent dans le projet ; le code d'assemblage est fourni. » Montrer un chemin réellement importé et laisser l'élève retrouver une modification.

**4:00–5:00 — choisir la suite.** « Ce socle appartient maintenant à ton projet. Quel usage veux-tu en faire ? Et quelle capacité utile donneras-tu à ton assistant, avec un partage précis ? » Faire expliquer un nouvel usage et un contrôle. Garder les incertitudes pour la revue finale.

## Transfert et critères observables

Préparer une capacité de lecture utile à votre projet, limitée à une sélection explicitement partagée. L'élève distingue trace et appel réel, retrouve provenance et portée, conserve la révision et explique la différence proposition/décision. Il montre une modification personnelle dans le projet assemblé.

Dans Orbit, les moteurs `baseline`, `n` et `p` restent des évaluations séparées sur les mêmes données choisies. T/I/F classe les preuves d'une affirmation ; il **ne note pas la compréhension de l'élève**. Aucun vote ni score moyen ne choisit un moteur automatiquement.

## Ressources et statut

- [API impérative WebMCP — Chrome](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [Sanity Context — documentation officielle](https://www.sanity.io/docs/ai/sanity-context)
- [Contrats et mission du catalogue](../../../../packages/learning/src/catalog.ts)
- [Assemblage fourni](../assembly/README.md) et [projet personnel](../PROJECT.md)

Statut : fiche préparée. La capacité native, la compilation et l'examen humain sont consignés avec leurs résultats réels dans le bilan de livraison et dans votre revue.
