# Orbit Formation — guide enseignant

Édition pédagogique 1.0. Extrait composé du manuel ; scripts et intonations proposés, résultats d'apprentissage à examiner.

# Partie II — accompagner et enseigner

Cette partie prépare l'enseignant à partir du travail sélectionné par l'élève. Les corrigés donnent des pistes de raisonnement ; l'enseignant compare ces pistes au scénario et à l'explication effectivement présentés. Les scripts sont des propositions de parole pour Jean-Sébastien, avec des pauses et intonations suggérées.

## Préparer une séance

Avant le webinaire, choisir une observation, une difficulté et un transfert. Ouvrir le fichier réellement remis et sa version. Repérer ce qui a été fourni, modifié, déclaré exécuté et effectivement examiné. Vérifier que la prédiction et les conditions permettent une comparaison utile. Une limite déclarée peut devenir le meilleur exemple de la séance.

Pendant la séance, montrer un effet, laisser une prédiction, relier une donnée au code et faire essayer une modification. La question finale change le contexte afin d'examiner le transfert. L'assistant reste disponible pour expliquer ; l'élève garde la décision et montre ce qu'il retient.

## Examiner sans confondre les preuves

| Trace | Question de revue | Portée |
|---|---|---|
| Code | Où se trouve la modification ? Quelle aide a contribué ? | Contenu et attribution déclarée |
| Observation | Quel geste, appareil et paramètre produisent ce résultat ? | Scénario observé |
| Empreinte | Les contenus comparés sont-ils identiques ? | Identité des fichiers |
| Test logiciel | Quelles entrées et quel comportement sont contrôlés ? | Assertion technique bornée |
| Reformulation | L'élève explique-t-il le mécanisme avec ses données ? | Explication examinée |
| Transfert | Utilise-t-il la notion dans une situation nouvelle ? | Usage nouveau examiné |

Choisir les statuts **rencontré, pratiqué, démontré sur ce scénario, encore à examiner**. Une réussite locale ne devient pas une maîtrise universelle. T/I/F porte sur les preuves d'une affirmation ; il ne devient pas une note d'élève.

## Intervenir à partir d'une difficulté

| Situation rencontrée | Intervention proposée | Trace examinable |
|---|---|---|
| L'élève reconnaît l'effet mais hésite sur le code | Demander quel champ change et ouvrir le symbole indiqué dans la fiche | Champ montré et phrase personnelle |
| La prédiction et l'observation diffèrent | Relever paramètre, conditions et scénario avant d'expliquer l'écart | Comparaison conservée avec sa limite |
| L'aide a donné la solution complète | Demander une modification courte ou un nouveau contexte | Décision de l'élève et essai de transfert |
| Une vérification est indisponible | Nommer la condition manquante et choisir une reprise | Statut explicite et prochaine action |

Pour chaque revue, conserver le scénario examiné, l'explication, la limite, l'aide déclarée, le transfert et la suite choisie. Le retour de l'assistant et la décision humaine restent séparés. Les fiches détachables reprennent ce cadre pour pouvoir circuler sans le manuel complet.

## Choisir l'aide

L'élève peut demander un indice conceptuel, un indice technique, du pseudo-code, un exemple partiel, une solution complète ou son explication. Après une solution complète, proposer une vérification et un changement de contexte. Le niveau d'aide reçu est déclaré avec la production ; il ne sert pas à disqualifier automatiquement l'apprentissage.

## Préparer l'accessibilité

Conserver la liste HTML, les libellés et le clavier. Le mode statique garde l'image courante et suspend son évolution. L'alternative accessible garde le contenu lorsque WebGL ou le réseau sont indisponibles. Contraste, texte agrandi et langue améliorent le parcours ; le code personnel n'est pas traduit automatiquement.


# Fiche enseignant 1 — Geste, état et rendu

**But de la revue :** L'élève relie l'événement à la position et nomme la fin du pointeur actif ; l'enseignant observe son nouveau scénario.

**Préparation :** ouvrir le rendu sélectionné, le notebook et [interaction-state.js](../frontend/module-1/interaction-state.js). Le [corrigé séparé](../notebooks/instructor/module-1.ipynb) est une piste à examiner après la tentative. Retrouver la prédiction et la version réellement choisie avant de comparer.

## Une activité avec l'élève et son assistant

Faire annoncer la position après deux flèches droites, puis exécuter les deux pas clavier. L'élève retrouve ensuite pointerId dans le code et propose un scénario d'interruption.

L'assistant peut expliquer ou fournir un exemple complet. L'élève choisit ensuite sa modification, nomme l'aide reçue et montre un résultat. La question à poser est : **« Quelle donnée change pendant le geste et quelle condition autorise ce changement ? »**

Comparer **keyboardStep : 0.04 → 0.08**, en conservant **zone, position initiale et nombre de pressions**. Le rendu sélectionné peut prendre la forme de schéma événement → état → rendu, code choisi et séquence observée. La limite à garder visible est : **un Échap ou un événement scripté ne démontre pas une annulation tactile native**.

## Déroulé et script de séance

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

## Repérer et travailler une difficulté

La confusion à examiner est : **confondre survol, relâchement, sortie de zone et annulation**. Demander un exemple précis, faire retrouver une seule donnée, puis choisir une expérience plus petite si nécessaire. Une réponse fluide de l'assistant peut devenir une hypothèse de travail ; l'élève la relie au fichier avant de la conserver.

| Situation rencontrée | Intervention proposée | Trace examinable |
|---|---|---|
| L'élève reconnaît l'effet mais hésite sur le code | Demander quel champ change et ouvrir le symbole `createInteraction` | Champ montré et phrase personnelle |
| La prédiction et l'observation diffèrent | Relever paramètre, conditions et scénario avant d'expliquer l'écart | Comparaison conservée avec sa limite |
| L'aide a donné la solution complète | Demander une modification courte ou un nouveau contexte | Décision de l'élève et essai de transfert |
| Une vérification est indisponible | Nommer la condition manquante et choisir une reprise | Statut explicite et prochaine action |

## Transfert et retour humain

Proposer **une carte déplaçable et sélectionnable au clavier**. L'élève peut répondre par texte, schéma ou code annoté, puis essayer la proposition. Conserver : scénario examiné ; explication ; limite ; aide déclarée ; transfert ; suite choisie.

La revue peut conclure « rencontré », « pratiqué », « démontré sur ce scénario » ou « encore à examiner », avec justification. Le retour de l'assistant et la décision humaine sont séparés. Aucun score de moteur ou nombre de tests ne décide de cette compréhension.


# Fiche enseignant 2 — Organisation Astro

**But de la revue :** L'élève retrouve trois responsabilités dans les bons fichiers et distingue l'aperçu HTML de la compilation Astro.

**Préparation :** ouvrir le rendu sélectionné, le notebook et [exploration-card.js](../frontend/module-2/exploration-card.js). Le [corrigé séparé](../notebooks/instructor/module-2.ipynb) est une piste à examiner après la tentative. Retrouver la prédiction et la version réellement choisie avant de comparer.

## Une activité avec l'élève et son assistant

L'élève apporte trois contenus personnels. Avec l'assistant, il indique quel fichier fournit la section et lequel remplit les boutons. Il modifie le préfixe puis explique la partie conservée.

L'assistant peut expliquer ou fournir un exemple complet. L'élève choisit ensuite sa modification, nomme l'aide reçue et montre un résultat. La question à poser est : **« Où changes-tu le titre, les données et la réaction au clic ? »**

Comparer **descriptionPrefix : Mon observation → Ma décision expliquée**, en conservant **identifiants, nombre de boutons et sélection**. Le rendu sélectionné peut prendre la forme de arborescence annotée, deux fichiers exportés et choix de contenu. La limite à garder visible est : **l'aperçu Colab ne compile pas ExplorationCard.astro**.

## Déroulé et script de séance

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

## Repérer et travailler une difficulté

La confusion à examiner est : **attribuer au composant Astro un comportement produit par le contrôleur navigateur**. Demander un exemple précis, faire retrouver une seule donnée, puis choisir une expérience plus petite si nécessaire. Une réponse fluide de l'assistant peut devenir une hypothèse de travail ; l'élève la relie au fichier avant de la conserver.

| Situation rencontrée | Intervention proposée | Trace examinable |
|---|---|---|
| L'élève reconnaît l'effet mais hésite sur le code | Demander quel champ change et ouvrir le symbole `createCards` | Champ montré et phrase personnelle |
| La prédiction et l'observation diffèrent | Relever paramètre, conditions et scénario avant d'expliquer l'écart | Comparaison conservée avec sa limite |
| L'aide a donné la solution complète | Demander une modification courte ou un nouveau contexte | Décision de l'élève et essai de transfert |
| Une vérification est indisponible | Nommer la condition manquante et choisir une reprise | Statut explicite et prochaine action |

## Transfert et retour humain

Proposer **une carte présentant des livres, des étapes ou des activités**. L'élève peut répondre par texte, schéma ou code annoté, puis essayer la proposition. Conserver : scénario examiné ; explication ; limite ; aide déclarée ; transfert ; suite choisie.

La revue peut conclure « rencontré », « pratiqué », « démontré sur ce scénario » ou « encore à examiner », avec justification. Le retour de l'assistant et la décision humaine sont séparés. Aucun score de moteur ou nombre de tests ne décide de cette compréhension.


# Fiche enseignant 3 — Scène Three.js et coordonnées

**But de la revue :** L'élève nomme la caméra et retrouve la position conservée ; il utilise aussi le contenu HTML.

**Préparation :** ouvrir le rendu sélectionné, le notebook et [scene-controller.js](../frontend/module-3/scene-controller.js). Le [corrigé séparé](../notebooks/instructor/module-3.ipynb) est une piste à examiner après la tentative. Retrouver la prédiction et la version réellement choisie avant de comparer.

## Une activité avec l'élève et son assistant

Montrer le même élément dans la scène et la liste. L'élève prédit l'effet du recul de caméra, sélectionne par les deux représentations et retrouve l'identifiant commun.

L'assistant peut expliquer ou fournir un exemple complet. L'élève choisit ensuite sa modification, nomme l'aide reçue et montre un résultat. La question à poser est : **« L'objet semble plus petit : quelle donnée a réellement changé ? »**

Comparer **cameraDistance : 5 → 7**, en conservant **objets, identifiants et positions**. Le rendu sélectionné peut prendre la forme de deux paramètres de caméra, sélection, disponibilité WebGL et explication. La limite à garder visible est : **une scène indisponible donne une observation de repli HTML, pas une observation 3D**.

## Déroulé et script de séance

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

## Repérer et travailler une difficulté

La confusion à examiner est : **confondre position enregistrée, position dans la scène et taille projetée**. Demander un exemple précis, faire retrouver une seule donnée, puis choisir une expérience plus petite si nécessaire. Une réponse fluide de l'assistant peut devenir une hypothèse de travail ; l'élève la relie au fichier avant de la conserver.

| Situation rencontrée | Intervention proposée | Trace examinable |
|---|---|---|
| L'élève reconnaît l'effet mais hésite sur le code | Demander quel champ change et ouvrir le symbole `createSceneController` | Champ montré et phrase personnelle |
| La prédiction et l'observation diffèrent | Relever paramètre, conditions et scénario avant d'expliquer l'écart | Comparaison conservée avec sa limite |
| L'aide a donné la solution complète | Demander une modification courte ou un nouveau contexte | Décision de l'élève et essai de transfert |
| Une vérification est indisponible | Nommer la condition manquante et choisir une reprise | Statut explicite et prochaine action |

## Transfert et retour humain

Proposer **trois étapes consultables dans une scène et une liste**. L'élève peut répondre par texte, schéma ou code annoté, puis essayer la proposition. Conserver : scénario examiné ; explication ; limite ; aide déclarée ; transfert ; suite choisie.

La revue peut conclure « rencontré », « pratiqué », « démontré sur ce scénario » ou « encore à examiner », avec justification. Le retour de l'assistant et la décision humaine sont séparés. Aucun score de moteur ou nombre de tests ne décide de cette compréhension.


# Fiche enseignant 4 — Vitesse et inertie

**But de la revue :** L'élève définit les unités, décrit le rôle de vx/vy, distingue déplacement clavier sans élan et lancer au pointeur, et reconnaît la différence entre deux gestes humains et deux entrées contrôlées.

**Préparation :** ouvrir le rendu sélectionné, le notebook et [inertia.js](../frontend/module-4/inertia.js). Le [corrigé séparé](../notebooks/instructor/module-4.ipynb) est une piste à examiner après la tentative. Retrouver la prédiction et la version réellement choisie avant de comparer.

## Une activité avec l'élève et son assistant

L'élève calcule un déplacement simple avec dt, prédit l'effet d'un amortissement supérieur et compare deux lancers au pointeur. Il utilise aussi les flèches pour déplacer de 0,04 avec une vitesse nulle, puis explique pourquoi leur relâchement ne lance pas l'objet. Espace fige/reprend; Échap annule le geste. Le pointeur passif ne réagrippe pas l'objet lancé.

L'assistant peut expliquer ou fournir un exemple complet. L'élève choisit ensuite sa modification, nomme l'aide reçue et montre un résultat. La question à poser est : **« Après le relâchement du pointeur, quelle donnée conserve le mouvement ? »**

Comparer **damping : 0.65 → 1.3**, en conservant **restitution 0.9, zone et geste aussi comparable que possible**. Le rendu sélectionné peut prendre la forme de paramètres, trajectoires déclarées, unités et conditions du lancer. La limite à garder visible est : **les gestes humains ne garantissent pas une vitesse initiale identique; les flèches ne constituent pas une comparaison d'inertie**.

## Déroulé et script de séance

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

## Repérer et travailler une difficulté

La confusion à examiner est : **traiter une position, une vitesse et une durée comme la même grandeur**. Demander un exemple précis, faire retrouver une seule donnée, puis choisir une expérience plus petite si nécessaire. Une réponse fluide de l'assistant peut devenir une hypothèse de travail ; l'élève la relie au fichier avant de la conserver.

| Situation rencontrée | Intervention proposée | Trace examinable |
|---|---|---|
| L'élève reconnaît l'effet mais hésite sur le code | Demander quel champ change et ouvrir le symbole `createInertia` | Champ montré et phrase personnelle |
| La prédiction et l'observation diffèrent | Relever paramètre, conditions et scénario avant d'expliquer l'écart | Comparaison conservée avec sa limite |
| L'aide a donné la solution complète | Demander une modification courte ou un nouveau contexte | Décision de l'élève et essai de transfert |
| Une vérification est indisponible | Nommer la condition manquante et choisir une reprise | Statut explicite et prochaine action |

## Transfert et retour humain

Proposer **une carte qui glisse après relâchement**. L'élève peut répondre par texte, schéma ou code annoté, puis essayer la proposition. Conserver : scénario examiné ; explication ; limite ; aide déclarée ; transfert ; suite choisie.

La revue peut conclure « rencontré », « pratiqué », « démontré sur ce scénario » ou « encore à examiner », avec justification. Le retour de l'assistant et la décision humaine sont séparés. Aucun score de moteur ou nombre de tests ne décide de cette compréhension.


# Fiche enseignant 5 — Interpolation et élasticité

**But de la revue :** L'élève distingue valeur présente, cible et vitesse ; il montre le gel sans disparition de l'image ni rattrapage du temps suspendu.

**Préparation :** ouvrir le rendu sélectionné, le notebook et [transitions.js](../frontend/module-5/transitions.js). Le [corrigé séparé](../notebooks/instructor/module-5.ipynb) est une piste à examiner après la tentative. Retrouver la prédiction et la version réellement choisie avant de comparer.

## Une activité avec l'élève et son assistant

Comparer une approche de cible et un dépassement. L'élève prédit la nouvelle trajectoire, fige l'image en cours de mouvement, puis explique valeur, cible et vitesse lors de la reprise.

L'assistant peut expliquer ou fournir un exemple complet. L'élève choisit ensuite sa modification, nomme l'aide reçue et montre un résultat. La question à poser est : **« Que peut-il rester en mouvement lorsque la valeur arrive à sa cible ? »**

Comparer **damping : 12 → 5**, en conservant **stiffness 36 et cible**. Le rendu sélectionné peut prendre la forme de paramètre choisi, observation d'oscillation et scénario de gel/reprise. La limite à garder visible est : **un essai réussi ne qualifie pas toutes les valeurs possibles de ressort**.

## Déroulé et script de séance

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

## Repérer et travailler une difficulté

La confusion à examiner est : **identifier un mécanisme uniquement à l'apparence douce de son animation**. Demander un exemple précis, faire retrouver une seule donnée, puis choisir une expérience plus petite si nécessaire. Une réponse fluide de l'assistant peut devenir une hypothèse de travail ; l'élève la relie au fichier avant de la conserver.

| Situation rencontrée | Intervention proposée | Trace examinable |
|---|---|---|
| L'élève reconnaît l'effet mais hésite sur le code | Demander quel champ change et ouvrir le symbole `createTransition` | Champ montré et phrase personnelle |
| La prédiction et l'observation diffèrent | Relever paramètre, conditions et scénario avant d'expliquer l'écart | Comparaison conservée avec sa limite |
| L'aide a donné la solution complète | Demander une modification courte ou un nouveau contexte | Décision de l'élève et essai de transfert |
| Une vérification est indisponible | Nommer la condition manquante et choisir une reprise | Statut explicite et prochaine action |

## Transfert et retour humain

Proposer **l'ouverture d'une fiche ou le déplacement d'une caméra**. L'élève peut répondre par texte, schéma ou code annoté, puis essayer la proposition. Conserver : scénario examiné ; explication ; limite ; aide déclarée ; transfert ; suite choisie.

La revue peut conclure « rencontré », « pratiqué », « démontré sur ce scénario » ou « encore à examiner », avec justification. Le retour de l'assistant et la décision humaine sont séparés. Aucun score de moteur ou nombre de tests ne décide de cette compréhension.


# Fiche enseignant 6 — Particules et ressources

**But de la revue :** L'élève sépare population et performance, explique la réutilisation d'un emplacement et montre le nettoyage.

**Préparation :** ouvrir le rendu sélectionné, le notebook et [particle-layer.js](../frontend/module-6/particle-layer.js). Le [corrigé séparé](../notebooks/instructor/module-6.ipynb) est une piste à examiner après la tentative. Retrouver la prédiction et la version réellement choisie avant de comparer.

## Une activité avec l'élève et son assistant

L'élève annote une particule et prédit ce qui augmente avec la population. Il compare le même scénario, indique la source d'une mesure disponible et conserve un libellé avec l'effet désactivé.

L'assistant peut expliquer ou fournir un exemple complet. L'élève choisit ensuite sa modification, nomme l'aide reçue et montre un résultat. La question à poser est : **« Que mesure ton chronomètre, et quel résultat reste à mesurer dans le navigateur cible ? »**

Comparer **count : 64 → 128, puis restauration à 64**, en conservant **lifetime 3 et seed 17**. Le rendu sélectionné peut prendre la forme de population, durée, graine, appareil, mesure disponible et limite. La limite à garder visible est : **le temps Python ou l'aperçu Canvas ne mesure pas directement un rendu GPU Three.js**.

## Déroulé et script de séance

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

## Repérer et travailler une difficulté

La confusion à examiner est : **confondre nombre de données, nombre de maillages et coût GPU**. Demander un exemple précis, faire retrouver une seule donnée, puis choisir une expérience plus petite si nécessaire. Une réponse fluide de l'assistant peut devenir une hypothèse de travail ; l'élève la relie au fichier avant de la conserver.

| Situation rencontrée | Intervention proposée | Trace examinable |
|---|---|---|
| L'élève reconnaît l'effet mais hésite sur le code | Demander quel champ change et ouvrir le symbole `createParticleLayer` | Champ montré et phrase personnelle |
| La prédiction et l'observation diffèrent | Relever paramètre, conditions et scénario avant d'expliquer l'écart | Comparaison conservée avec sa limite |
| L'aide a donné la solution complète | Demander une modification courte ou un nouveau contexte | Décision de l'élève et essai de transfert |
| Une vérification est indisponible | Nommer la condition manquante et choisir une reprise | Statut explicite et prochaine action |

## Transfert et retour humain

Proposer **un effet facultatif indiquant une sélection**. L'élève peut répondre par texte, schéma ou code annoté, puis essayer la proposition. Conserver : scénario examiné ; explication ; limite ; aide déclarée ; transfert ; suite choisie.

La revue peut conclure « rencontré », « pratiqué », « démontré sur ce scénario » ou « encore à examiner », avec justification. Le retour de l'assistant et la décision humaine sont séparés. Aucun score de moteur ou nombre de tests ne décide de cette compréhension.


# Fiche enseignant 7 — Parcours, états et mémoire

**But de la revue :** L'élève distingue historique interne et navigation navigateur, conserve vue et sélection et explique le gel de elapsed.

**Préparation :** ouvrir le rendu sélectionné, le notebook et [interaction-flow.js](../frontend/module-7/interaction-flow.js). Le [corrigé séparé](../notebooks/instructor/module-7.ipynb) est une piste à examiner après la tentative. Retrouver la prédiction et la version réellement choisie avant de comparer.

## Une activité avec l'élève et son assistant

L'élève trace cinq transitions pour un budget de quatre, retrouve l'entrée retirée et vérifie la sélection. Dans le vrai projet, il fait un aller-retour navigateur et explique l'URL restaurée.

L'assistant peut expliquer ou fournir un exemple complet. L'élève choisit ensuite sa modification, nomme l'aide reçue et montre un résultat. La question à poser est : **« Au retour de la fiche, quelles données doivent être retrouvées ensemble ? »**

Comparer **historyLimit : 32 → 4**, en conservant **séquence précise de cinq changements**. Le rendu sélectionné peut prendre la forme de état initial, séquence, entrée retirée et état restauré. La limite à garder visible est : **host: null dans Colab ne valide pas le bouton Retour de la page Colab**.

## Déroulé et script de séance

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

## Repérer et travailler une difficulté

La confusion à examiner est : **mélanger l'état du geste, l'état de la vue et l'historique global du navigateur**. Demander un exemple précis, faire retrouver une seule donnée, puis choisir une expérience plus petite si nécessaire. Une réponse fluide de l'assistant peut devenir une hypothèse de travail ; l'élève la relie au fichier avant de la conserver.

| Situation rencontrée | Intervention proposée | Trace examinable |
|---|---|---|
| L'élève reconnaît l'effet mais hésite sur le code | Demander quel champ change et ouvrir le symbole `createInteractionFlow` | Champ montré et phrase personnelle |
| La prédiction et l'observation diffèrent | Relever paramètre, conditions et scénario avant d'expliquer l'écart | Comparaison conservée avec sa limite |
| L'aide a donné la solution complète | Demander une modification courte ou un nouveau contexte | Décision de l'élève et essai de transfert |
| Une vérification est indisponible | Nommer la condition manquante et choisir une reprise | Statut explicite et prochaine action |

## Transfert et retour humain

Proposer **une galerie qui revient à la bonne sélection**. L'élève peut répondre par texte, schéma ou code annoté, puis essayer la proposition. Conserver : scénario examiné ; explication ; limite ; aide déclarée ; transfert ; suite choisie.

La revue peut conclure « rencontré », « pratiqué », « démontré sur ce scénario » ou « encore à examiner », avec justification. Le retour de l'assistant et la décision humaine sont séparés. Aucun score de moteur ou nombre de tests ne décide de cette compréhension.


# Fiche enseignant 8 — Assistant, preuves et capacités

**But de la revue :** L'élève attribue correctement les preuves, borne la lecture et explique sa contribution dans le projet assemblé.

**Préparation :** ouvrir le rendu sélectionné, le notebook et [register-capabilities.js](../frontend/module-8/register-capabilities.js). Le [corrigé séparé](../notebooks/instructor/module-8.ipynb) est une piste à examiner après la tentative. Retrouver la prédiction et la version réellement choisie avant de comparer.

## Une activité avec l'élève et son assistant

L'élève examine la trace préparée, montre l'objection liée à la permission ou à la révision et définit son contenu partageable. Pendant la séance, il retrouve une vraie modification dans chacun des huit exports assemblés.

L'assistant peut expliquer ou fournir un exemple complet. L'élève choisit ensuite sa modification, nomme l'aide reçue et montre un résultat. La question à poser est : **« Quelle preuve distingue une trace préparée, un appel réel et une revue humaine ? »**

Comparer **borne de snapshot : 12000 → 6000 caractères JSON**, en conservant **permission, révision, revérification et nettoyage**. Le rendu sélectionné peut prendre la forme de périmètre de capacité, objection, code choisi et lien vers les exports. La limite à garder visible est : **le notebook ne réalise pas l'appel natif ; student_get_learning_snapshot diffère du registre Orbit de vingt-cinq outils**.

## Déroulé et script de séance

| Durée | Action avec l'enseignant |
|---|---|
| 10 min | Examiner la trace, le code exporté et les permissions prévues |
| 15 min | Clarifier citation, portée, révision et autorité |
| 25 min | Utiliser les vrais outils d'Orbit, puis raccorder vos huit productions |
| 10 min | Transférer une capacité bornée à votre projet et expliquer le socle obtenu |

### La découverte de fin de leçon

Vous avez conservé huit briques. **Elles peuvent maintenant former un socle de frontend :** geste et état, carte, scène, inertie, transition, particules, parcours et capacité.

Pendant les 25 minutes de construction du webinaire, ouvrir la partie finale du notebook 8. Le parcours comporte trois étapes distinctes :

1. **Charger — cellule 13.** Choisir vos huit ZIP réels avec le sélecteur officiel `files.upload()`. Une annulation laisse la sélection vide et permet de relancer la cellule. Si le dialogue reste indisponible, téléverser les mêmes ZIP par le panneau **Fichiers → Importer dans l'espace de stockage de la session** de Colab. Activer alors `USE_RUNTIME_FILE_SELECTION = True` et écrire exactement leurs huit noms dans `RUNTIME_SELECTED_EXPORT_FILENAMES`. Cette alternative lit les fichiers explicitement nommés dans `/content` ; elle ne recherche ni ne télécharge de rendus à votre place. Une session Colab est temporaire : conserver les originaux et télécharger le résultat avant sa fermeture.
2. **Examiner — cellule 14.** Vérifier les huit lignes : module, nom du fichier choisi, tentative, formats déclarés du résultat et du manifeste, taille et SHA-256. Chaque module doit apparaître une seule fois. Un fichier absent, un doublon ou une empreinte différente appelle une correction et un nouvel examen.
3. **Assembler — cellule 15.** Copier l'empreinte de la sélection examinée dans `ASSEMBLY_REVIEWED_SELECTION_SHA256`, puis exécuter la cellule. Une confirmation vide ou ancienne laisse l'assemblage bloqué. Télécharger `orbit-mon-frontend-<empreinte12>.zip` et conserver sa provenance. Le statut `ASSEMBLED_NOT_BUILT` indique que le ZIP est préparé ; il ne déclare pas une compilation.

Le raccordement fourni contrôle les manifestes et conserve vos fichiers. Il ne comble pas une absence avec un corrigé caché. Si un rendu doit être remplacé, choisir et expliquer sa nouvelle version, puis reprendre **charger → examiner → assembler**. Ce raccordement reste inclus dans la construction du webinaire ; il n'ajoute aucune heure au cours.

Le code d'intégration est fourni et attribué au cours dans [assembly/](../assembly/README.md). Vos modifications sont dans les dossiers `src/learning/module-N/`. L'assemblage du ZIP ne compile pas Astro : la compilation et le parcours du projet sont vérifiés séparément. Une modification hors du contrat appelle une adaptation expliquée ; elle ne justifie pas une substitution silencieuse du travail.

### Script enseignant — séquence de 5 minutes

Les intonations sont proposées ; elles ne constituent pas un clonage de voix.

**0:00–1:00 — choisir ce qui est partagé.** « Je veux que ton assistant puisse t'aider sur un contenu que tu choisis. [Pause.] Quelle fiche lui donnes-tu, et quelle révision ? Montrons ces deux conditions dans le code. » Laisser l'élève borner le périmètre avant l'appel.

**1:00–2:00 — lire la trace.** « Voici une réponse préparée qui dit READY. [Accentuer : *préparée*.] Ce mot peut-il prouver que le navigateur a réellement exécuté l'outil ? » Attendre la distinction puis examiner les champs incohérents avec la permission ou la révision.

**2:00–3:00 — vérifier l'autorité.** « Un agent peut expliquer, calculer et proposer. Une revue humaine demande une décision réellement humaine. [Ralentir.] Regardons aussi le passage et les conditions avant d'accepter la conclusion. » Demander une objection précise plutôt qu'un sentiment général de confiance.

**3:00–4:00 — découvrir le raccordement.** « Tu as gardé tes huit productions. Maintenant, on va les raccorder. Ce sont tes exports qui entrent dans le projet ; le code d'assemblage est fourni. » Montrer un chemin réellement importé et laisser l'élève retrouver une modification.

**4:00–5:00 — choisir la suite.** « Ce socle appartient maintenant à ton projet. Quel usage veux-tu en faire ? Et quelle capacité utile donneras-tu à ton assistant, avec un partage précis ? » Faire expliquer un nouvel usage et un contrôle. Garder les incertitudes pour la revue finale.

## Repérer et travailler une difficulté

La confusion à examiner est : **prendre READY, une empreinte ou une proposition pour une approbation humaine**. Demander un exemple précis, faire retrouver une seule donnée, puis choisir une expérience plus petite si nécessaire. Une réponse fluide de l'assistant peut devenir une hypothèse de travail ; l'élève la relie au fichier avant de la conserver.

| Situation rencontrée | Intervention proposée | Trace examinable |
|---|---|---|
| L'élève reconnaît l'effet mais hésite sur le code | Demander quel champ change et ouvrir le symbole `registerLearningCapability` | Champ montré et phrase personnelle |
| La prédiction et l'observation diffèrent | Relever paramètre, conditions et scénario avant d'expliquer l'écart | Comparaison conservée avec sa limite |
| L'aide a donné la solution complète | Demander une modification courte ou un nouveau contexte | Décision de l'élève et essai de transfert |
| Une vérification est indisponible | Nommer la condition manquante et choisir une reprise | Statut explicite et prochaine action |

## Transfert et retour humain

Proposer **une capacité bornée utile à son propre projet**. L'élève peut répondre par texte, schéma ou code annoté, puis essayer la proposition. Conserver : scénario examiné ; explication ; limite ; aide déclarée ; transfert ; suite choisie.

La revue peut conclure « rencontré », « pratiqué », « démontré sur ce scénario » ou « encore à examiner », avec justification. Le retour de l'assistant et la décision humaine sont séparés. Aucun score de moteur ou nombre de tests ne décide de cette compréhension.


# Fiche enseignant projet — cadrage et clôture

## Une heure de cadrage

| Durée | Action | Trace |
|---:|---|---|
| 10 min | Décrire la personne, son besoin et l'action principale | Intention en trois phrases |
| 15 min | Comparer deux pistes et choisir un parcours court | Choix, raison et limite |
| 20 min | Définir contenu, geste, contribution 3D, HTML et capacité | Carte du projet et critères |
| 15 min | Choisir l'expérience, la remise et les points de revue | Plan de six heures solo |

L'idée appartient à l'élève. La contribution 3D sert un usage expliqué et le contenu conserve une alternative HTML. Les briques fournies, les modifications et le raccordement sont attribués séparément.

## Six heures solo, suivies de la clôture

Distribuer 1 h de préparation, 2 h d'adaptation, 2 h d'intégration/expérience et 1 h de préparation de remise. Dans le calendrier, cela correspond aux derniers modules. La séance de clôture suit ce travail ; aucune heure accompagnée supplémentaire n'est ajoutée.

## Une heure de clôture

| Durée | Action | Examen |
|---:|---|---|
| 10 min | Montrer besoin et parcours | Usage explicite |
| 20 min | Démontrer geste, sélection, retour, statique et HTML | Comportement observé |
| 15 min | Expliquer une modification et rejouer une expérience | Données, paramètres et limite |
| 10 min | Appliquer une notion à un autre contexte | Transfert nouveau |
| 5 min | Conserver acquis observés et prochaine question | Bilan sélectionné |

### Script enseignant — séquence de 5 minutes

Les pauses et intonations sont des propositions de lecture.

**0:00–1:00.** « Je veux partir de ton intention. À qui sert ce frontend, et quelle action cette personne doit-elle pouvoir accomplir ? [Pause.] Montre-moi ce parcours avant de parler des bibliothèques. »

**1:00–2:00.** « Maintenant, choisis une modification qui t'appartient. Où est-elle dans le fichier ? Qu'as-tu gardé du modèle, et quelle aide as-tu reçue ? » Laisser retrouver le code plutôt que réciter une explication générale.

**2:00–3:00.** « Prenons ton expérience. [Ralentir.] Quelle variable as-tu changée ? Quelles conditions as-tu conservées ? Montre-moi l'observation et une limite. » Examiner un résultat concret ; une observation insuffisante conserve son statut.

**3:00–4:00.** « On va essayer le même contenu avec moins de mouvement et au clavier. Est-ce que la personne retrouve toujours son information ? » Laisser réaliser le parcours et consigner un éventuel défaut, sans l'effacer du bilan.

**4:00–5:00.** « Tu pourrais réutiliser cette notion ailleurs. Propose un exemple qui n'est pas cette scène. Quelle donnée ou quelle règle garderais-tu ? » Laisser reformuler puis définir une prochaine vérification utile.

## Revue de projet

Demander de retrouver une modification réelle dans les exports, d'expliquer un événement qui change l'état et de montrer la reprise. Examiner une expérience comparable plutôt qu'une impression seule. Donner un exemple nouveau de carte, de galerie ou de capteur pour le transfert.

Conserver une grille : intention, attribution, état, accessibilité, expérience, capacité bornée, reprise et transfert. Chaque ligne reçoit le scénario, le constat et sa limite. L'enseignant garde son retour séparé de la proposition de l'assistant et de l'empreinte des fichiers. La publication publique reste une action distincte.


# Qualification technique et lecture des preuves

Édition pédagogique `orbit-course-1.0.0`, point documentaire actualisé le **2 octobre 2026 UTC**. Ce chapitre associe chaque résultat à son entrée, son environnement et son reçu. Les nouveaux exports disposent de leurs propres empreintes et revue ; les anciens reçus conservent leur portée historique.

**Les neuf supports Canva sont publiés et relus ; le manuel est préparé pour la revue de l’auteur.** Le checkpoint initial de la nouvelle session native passe dix-huit contrôles jusqu’au preview ; sa publication, sa relecture et son nettoyage ultérieurs figurent dans le résultat final ci-dessous. La qualification complète conserve `deliveryReady: false` et `fullMissionComplete: false` : le rejeu immuable, le changement de workspace et le refus d’un compte distinct en lecture seule restent non qualifiés. La compréhension d’un élève et les campagnes de modèles gardent leurs examens distincts.

## Résultat final du Studio — 1er octobre, heure de Toronto

La [relecture authentifiée](../../../receipts/formation/native-studio-publication-recovery-20261002.json) vérifie le document synthétique réellement publié : un seul artefact, empreinte exacte, journal privé exclu. Le premier contrôle anonyme erroné reste conservé dans son incident. La [déconnexion native](../../../receipts/formation/native-studio-logout-20261002.json) retire les vingt-cinq outils ; le contrôle temporaire retourne ensuite HTTP 401. La microVM appartenant à cette mission est arrêtée et son origine CORS temporaire retirée, avec [inventaire à zéro](../../../receipts/formation/native-studio-final-cleanup-20261002.json).

Le rejeu immuable, le changement de workspace et le refus sous un compte distinct en lecture seule restent non qualifiés. Les campagnes C/D/E restent partielles. `deliveryReady: false` et `fullMissionComplete: false` expriment les critères complets du plan ; ils ne retirent pas les résultats livrés.

## Checkpoint antérieur — résultats et limites

| Périmètre | Preuve actuelle | Limite à conserver |
|---|---|---|
| Import manuel M8 gratuit | [Copie CPU gratuite](../../../receipts/formation/free-colab-module-8-manual-import-assembled.json) : annulation, refus sans sélection, huit ZIP originaux transférés par le panneau Fichiers, huit noms explicites, examen des versions et SHA, ACK vide refusé, assemblage et téléchargement | QA opérée par Codex. Le dialogue intégré `files.upload` a rencontré deux délais d’attente du contrôle ; son champ reste le premier choix. Cette limite du contrôleur n’est pas attribuée à l’exercice humain |
| Nouvel assemblage exact | [Build Kaggle de `7ae43df9…`](../../../receipts/formation/actual-manual-import-assembly-static-kaggle.json), 46 hashes, neuf briques et huit modules, `npm ci` avec lock `423e4878…`, Astro 7.3.3, Three.js 0.181.2, Node 22.20.0 ; sortie `a4d4a4ab…` | Compilation statique réussie. Le statut Colab `ASSEMBLED_NOT_BUILT` garde son sens ; les nouveaux octets n’ont pas de nouvelle qualification navigateur |
| Régressions logicielles de clôture | [Reçu immuable V2, version 354480684](../../../receipts/formation/closure-software-regressions-kaggle.json) : 141 tests TypeScript, huit contrôles Node de politique/provenance et quatorze contrôles d’import/document ; [36 tests PHP](../../../receipts/formation/php-context-closure-pass-kaggle.json) | La [version V3 publique 354484426](https://www.kaggle.com/code/celebrum/orbit-v3-closure-regressions?scriptVersionId=354484426) conserve ces résultats et corrige leur présentation Markdown : elle ne constitue pas un nouveau rejeu. Le coordinateur a observé sa publication ; la [capture](../../../receipts/formation/closure-regressions-public-kaggle.png) la conserve. Le reçu V2 reste inchangé. Ces contrôles n’examinent pas la compréhension |
| Corpus pédagogique Context réel | [Ingestion](../../../receipts/formation/course-context-ingestion.json), [tri technique des références](../../../receipts/formation/course-context-issue-triage.json), puis [transport public](../../../receipts/formation/course-context-live-transport.json) : outline et neuf entrées HTTP `READY`, passages et empreintes contrôlés | La projection admise est bornée aux neuf chemins audités de la KB et à leur révision. Elle ne transmet ni journal ni credentials. Les documents maintenus plus récents et les versions conservées dans Context ont leurs propres empreintes |
| Origine étrangère et outils natifs publics | [16 contrôles réels Kaggle/E2B, version 354497668](../../../receipts/formation/cross-origin-public-validation.json) : registre natif de 25 outils sur la page du cours Orbit réelle, refus privés avant partage, lectures Context, partage synthétique, import, export et révocation | La page du Studio étranger reste à son écran de connexion dans ce reçu. Le GET Context depuis son origine est public et sans credentials ; il ne prouve aucun outil privé authentifié ou écritures Sanity |
| Preview du Studio étranger authentifié | [18 contrôles Kaggle/E2B](../../../receipts/formation/native-studio-preview-20261002.json) : propriétaire connecté nativement, 25 outils, permissions initiales désactivées, aucun moteur implicite, lectures Context, sauvegarde, reprise et export explicites et un seul artefact synthétique sélectionné dans le preview | `AWAITING_HUMAN_REVIEW_OF_EXACT_PREVIEW`, sans écriture Content Lake. Publication/readback, rejeu, workspace, refus serveur sous un compte en lecture seule et logout restent `NOT_RUN`. Aucun profil ou token personnel n’est transféré ; les anciens refus et nettoyages restent historiques |
| Documents web élève | [Neuf Canva publiés et relus](CANVA_DELIVERY.json) : Module 1 pilote puis sept modules et projet, hiérarchie de titres, horaires, consignes et liens examinés | Le design a reçu un retour positif de l’utilisateur, rapporté par le coordinateur. Le texte pédagogique reste soumis à sa revue. Les pages ouvrent de vrais outils ; elles ne simulent pas leurs exécutions |

Le parcours public antérieur de l’assemblage `141466603…` conserve ses **35 contrôles natifs réussis**. Les **72 contrôles de formation** et les **77 contrôles de l’atome** restent liés à leurs releases et reçus. Une recompilation ne transfère pas automatiquement leur portée à une autre archive.

## Lire le corpus public admis

Le sommaire et les entrées du cours sont disponibles par GET public avec credentials omis. Les neuf chemins contrôlés sont `agents`, `course/assessment`, `course/structure`, `modules/interaction`, `modules/motion`, `modules/navigation`, `project`, `threejs/particles` et `threejs/scenes`. La KB `kbbBvrClyweF` et la révision auditée `d2c6279c-4ded-44de-a45e-f5e8e63bdf94` identifient la provenance. Les entrées historiques hors portée restent exclues. Le tri des problèmes a été technique ; il n’est pas une approbation pédagogique humaine.

Le readback HTTP de production a été fait depuis l’orchestrateur Windows ; le reçu natif ultérieur exerce le vrai navigateur E2B piloté par Kaggle et une origine étrangère. Ces deux environnements gardent leurs attributions. Une entrée `READY` fournit un contenu admissible pour lecture ; elle ne certifie ni sa vérité générale ni la compréhension de l’élève.

## Les huit archives sélectionnées au Module 8

Charger, examiner, puis assembler sont trois actions distinctes. La sélection contient les huit téléchargements récents, avec un seul module par ZIP et toutes les empreintes exigées. Les cellules conservent un refus compréhensible pour une sélection absente, un doublon, un contenu altéré ou une confirmation périmée. La reprise explicite par le panneau Fichiers utilise les ZIP réellement choisis ; aucun téléchargement de fixture ne remplace cette activité.

Les manipulations documentées sont des fixtures de QA, avec observation de compte gratuit et de runtime CPU. Elles ne remplissent pas le journal d’un élève. L’archive assemblée `7ae43df9d3c7f44e39a2b545d28ff807660b85615551b2fca1a55913b339c7d6` contient les neuf briques inchangées et 46 fichiers de manifeste. La compilation Kaggle conserve son lock et ses entrées sans substituer un corrigé.

## Documents et critères encore ouverts

Les [neuf supports web](CANVA_DELIVERY.md), le manuel, les fiches enseignant et les missions des assistants sont des supports de lecture et de travail. La revue documentaire examine structure, liens présents, pages rendues, extraits et métadonnées. La pagination native Word, l’acceptation du texte par l’auteur et l’efficacité pédagogique conservent leurs propres examens.

Le registre natif authentifié et le preview sont désormais observés. Pour clôturer les étapes suivantes du Studio hors origine, conserver des reçus distincts : publication du seul payload examiné avec ses vrais droits, readback, rejeu immuable, changement de workspace, refus sous une identité distincte en lecture seule, puis déconnexion et révocation des accès. Ces étapes restent `NOT_RUN` dans le présent point documentaire ; aucun credential personnel ni acquittement humain n’est fabriqué. La revue graphique commune et le prochain tutoriel restent distincts.

Le [relevé quota du 2 octobre à 00:46 UTC](../../../receipts/formation/kaggle-quota-readback-20261002.json) conserve $8,53/$10 quotidiens et $18,29/$100 mensuels, sans renouvellement ni date de recharge observée. Le [reçu des prérequis C/D/E](../../../receipts/formation/campaign-resumption-prerequisites-20261002.json) décrit le gel de C, trois extractions et dix-neuf productions manquantes, sa règle locale de 85 %, le cas technique terminal, la limite réelle de deux KB pour D et le harnais/pool encore requis pour E. Aucune de ces conditions n’est une reprise exécutée ou un score pédagogique. La mission complète reste partielle.

## Chronologie historique — résultats conservés

**Les paragraphes suivants décrivent les checkpoints antérieurs.** Leurs erreurs, refus Context, pages Canva encore absentes et statuts partiels restent des faits historiques. Les résultats actuels figurent ci-dessus ; ils ne changent ni ces champs ni leurs empreintes.

## Historique — Chronologie des qualifications conservées

| Objet examiné | Résultat rapporté dans le reçu consulté | Portée de ce résultat |
|---|---|---|
| Contrats et régressions logiciels historiques | Kaggle : [133/133 assertions sur le payload corrigé](../../../receipts/formation/software-133-final.json) ; le reçu conserve le premier run de 117 et les tests Python séparés | Payload `cae9a0f4…` uniquement ; les 117 historiques appartiennent à la version [354372770](https://www.kaggle.com/code/celebrum/orbit-formation-software-validation?scriptVersionId=354372770) |
| Checkpoints logiciels historiques conservés | [139/139 assertions](../../../receipts/formation/software-139-kaggle.json), puis [141/141 assertions, exit 0 et Python exit 0](../../../receipts/formation/software-141-kaggle.json), source `28813ecbf712f4fb717aaa3f93444c7c7e14fbd737f2d3e3ac1ed6ca28f72531` | Exécutions interactives historiques du draft Kaggle ; chaque payload conserve sa source. La sauvegarde immuable et les étapes ultérieures gardent leur reçu propre |
| Checkpoint logiciel historique avant v5 | [141/141 assertions, exit 0 et logiciel notebook Python exit 0](../../../receipts/formation/software-141-final-kaggle.json), source `98a0c6594d176b3cb4fe7b921fd93e945e51d96f3fba3019d86037585062ed87` | Ce reçu décrit un draft antérieur. Il ne reçoit pas rétroactivement les empreintes ou les résultats de la version publique courante |
| Version publique Kaggle historique v4 | [Readback conservé](../../../receipts/formation/software-version4-kaggle.json) de [la version 4, identifiant 354422952](https://www.kaggle.com/code/celebrum/orbit-formation-software-validation?scriptVersionId=354422952), durée 105,3 s : 141 tests dans 15 suites, sept tests Python, compilation des huit exports indépendants, second Studio statique verrouillé et 29 tests PHP/185 assertions | Zéro appel de modèle. Le payload source `98a0c659…` et les sorties gardent cette exécution historique ; ils ne deviennent pas ceux de v5 |
| Version publique Kaggle historique v5 | [Readback conservé](../../../receipts/formation/software-version5-kaggle.json) de [la version 5, identifiant 354436854](https://www.kaggle.com/code/celebrum/orbit-formation-software-validation?scriptVersionId=354436854), durée 120,7 s : 141 tests dans 15 suites, sept tests Python, nouvel assemblage exact `141466603…`, second Studio statique verrouillé et 29 tests PHP/185 assertions | Payload source `689494986b4b6a9b02b5a22a8beb81e8de7cb7388a55ad20a122743d3de7966e`, zéro appel de modèle. Ce succès logiciel ne valide ni l'admission publique Context, ni une compréhension humaine, ni les écritures du Studio. Les sorties compilées gardent leur propre exécution et empreinte |
| Formation publique et outils natifs | Navigateur E2B piloté par Kaggle : [72/72 contrôles réussis](../../../receipts/formation/live-browser-72.json) | Release exercée, fixtures synthétiques, zéro appel de modèle ; découverte de 25 outils, appels choisis, stockage, archive et versions |
| Formation publique historique après correction du manifeste | [72/72 contrôles réussis](../../../receipts/formation/live-browser-final.json), run `formation-790dfa8e-614e-4646-85d0-e428a65307fa`, durée 5 147 ms, sur le domaine public | 25 outils natifs, permissions, huit expériences, sauvegarde, versions et ZIP exercés. Le manifeste public contient 358 fichiers ; HTML, JS, CSS et archive portable f2 correspondent aux empreintes de cette exécution. La marque, les cinq portes du landing, le guide et le petit écran sont contrôlés. Fixtures techniques, zéro appel de modèle |
| Formation publique courante après le raccordement M3/M8 | [Nouveau parcours 72/72 réussi](../../../receipts/formation/live-browser-pointer-target-final.json), run `formation-de718cf4-ef62-4333-a2ac-aadf1f49a267`, durée 5 093 ms | Navigateur E2B piloté par Kaggle sur le domaine public, zéro appel de modèle et aucune erreur runtime. Les scénarios restent des fixtures techniques ; la compréhension et la revue humaine ne sont pas déduites de ce succès |
| Sources Colab — QA groupée historique | Huit exports et huit relectures dans des espaces Python séparés | Un même runtime CPU ; une relecture de namespace diffère d'un redémarrage réel |
| Aperçus Colab — sondes historiques | Huit rapports de sondes navigateur | Vérifications par scripts ; trace du Module 8 préparée et gestes pointeur de confiance encore à qualifier |
| Assemblage des huit vrais exports | Liaison de neuf fichiers de briques, 46 fichiers de manifeste vérifiés, compilation Astro réussie dans Kaggle | Build statique avec Node 22.20.0, Astro 7.3.3 et Three.js 0.181.2 ; comportement navigateur du projet assemblé distinct |
| Reprise après redémarrage Colab réel | [Un redémarrage suivi de la relecture des sources capturées](../../../receipts/formation/colab-recovery.json) | Chemin de checkpoint public synthétique ; anciens rapports navigateur importés plutôt que rejoués ; copies froides et reprise privée distinctes |
| Corrections historiques de stockage, intégrité ZIP et versions | Les résultats historiques 133/133 et 72/72 incluent ces parcours dans leurs scénarios | Le lecteur ZIP ensuite partagé avec le Studio possède sa qualification ultérieure dans v5 et le reçu portable f2 ; le premier checkpoint reste distinct |
| Installation statique dans un second Studio | [PASS_STATIC_INSTALL_BUILD](../../../receipts/formation/second-studio-static.json) pour l'archive `3e3a499d…` | Installation, import et build statique réussis ; UI authentifiée, changement de workspace et transport Context encore distincts |
| Installation avec dépendances figées après lecteur ZIP partagé | [PASS_STATIC_INSTALL_BUILD](../../../receipts/formation/portable-studio-locked-install-kaggle.json), archive `ea0f93eff48e9dd6a07283f46067eafdc317b352e43409efac8e5e61d4992b90` | Installation par `npm ci`, import et build statique observés dans le draft Kaggle ; session authentifiée, Context cross-origin, WebMCP natif et écritures Sanity restent `false` |
| Installation de l'archive portable courante | [PASS_STATIC_INSTALL_BUILD](../../../receipts/formation/portable-studio-v2-install-kaggle.json), archive `f2b0dc6897fae7b56e36836e4019eff06e098bf14d35668fa1df84ec6ff9e973` | `npm ci`, import et build statique dans un hôte vierge observés ; 315 fichiers. Authentification, Context cross-origin, WebMCP natif, écriture Sanity et publication npm restent `false` |
| Session du second Studio authentifié | [Lecture DOM réelle](../../../receipts/formation/authenticated-second-studio.json) sur `/formation/studio/orbit-learning-lab` : utilisateur authentifié visible, huit modules, FR/EN/ES, stockage mémoire et six permissions désactivées | L'UI indique le registre enregistré. Aucun appel d'agent natif ni écriture Content Lake n'est exécuté dans ce reçu ; le changement de workspace et la publication sélectionnée ne reçoivent pas de validation implicite |
| Copies Colab indépendantes | [Module 1](../../../receipts/formation/free-colab-module-1-independent.json), [Module 2](../../../receipts/formation/free-colab-module-2-independent.json), [Module 3](../../../receipts/formation/free-colab-module-3-independent.json) : copies neuves, modification et export observés | Fixtures opérées par Codex ; incidents conservés, CPU observé et forfait gratuit rapporté par l'utilisateur ; compréhension humaine encore à examiner |
| Incident puis retest clavier du Module 4 | [Le reçu antérieur](../../../receipts/formation/free-colab-module-4-independent.json) détecte le défaut clavier ; [le retest corrigé](../../../receipts/formation/free-colab-module-4-independent-retest.json) observe flèches, relâchement à vitesse nulle, lancer au pointeur, rebond et gel/reprise dans une copie CPU neuve du commit `784dbca` | Export effectivement téléchargé, SHA-256 `7e6c739c0883e39aca491e6f6280cc353daf6745017a3bea5ce690746e4d67a5`, runtime arrêté. Annulation tactile native et comparaison quantitative d'amortissement restent non vérifiées ; compréhension non examinée |
| Copies indépendantes des Modules 5, 6 et 8 | [Module 5](../../../receipts/formation/free-colab-module-5-independent.json), [Module 6](../../../receipts/formation/free-colab-module-6-independent.json) et [Module 8](../../../receipts/formation/free-colab-module-8-independent.json) : modification, export reçu et arrêt du runtime observés | M5 observe une oscillation après amortissement modifié ; M6 confirme population et commande statique, sans mesure des pixels/âges ; M8 conserve une trace préparée, sans appel WebMCP natif ni exécution de sa limite de snapshot |
| Incident puis retest des sélections du Module 7 | [Le reçu indépendant antérieur](../../../receipts/formation/free-colab-module-7-independent.json) garde `selectionVariantsVerified: false` ; [le retest corrigé](../../../receipts/formation/free-colab-module-7-independent-retest.json) observe choix clavier d'`element-2` et d'`element-3`, conservation entre vues, budget 32/4 et gel d'`elapsed` | Copie CPU neuve du commit `4b06da41e603d63acd33bbf75995a75d824d1bc6`, export reçu `827528418863211e76307d3e3dbd2a21d17d2864bde0e59f4d8295948897f3ce`, runtime arrêté. Le véritable bouton Retour navigateur et la compréhension restent non examinés |
| Import manuel des huit exports dans le Module 8 | Le [reçu M8](../../../receipts/formation/free-colab-module-8-independent.json) observe le champ multiple et deux délais d'attente du dialogue de fichiers, sans fichier transmis ; l'annulation produit le refus attendu faute de huit exports | `manualUploadVerified: false`. Le transport HTTP de huit archives synthétiques choisies et leur nouvel assemblage gardent leurs propres preuves ; ils ne valident pas le dialogue manuel |
| Assemblage des huit exports indépendants | [Assemblage réellement exécuté dans Colab CPU](../../../receipts/formation/free-colab-module-8-independent-assembly.json), huit archives exactes téléchargées par HTTP, empreintes/tailles/identifiants contrôlés, neuf fichiers de briques et 46 fichiers de manifeste | Archive `96acc0ddfdd3728426980df39d2a1ccda07cc855eb95f950a552de776a5b2aed`, 78 147 octets, export reçu et runtime arrêté. `ASSEMBLED_NOT_BUILT` côté Colab ; fixtures de QA, pas production d'un élève |
| Compilation des exports indépendants | [Compilation des vrais exports réussie](../../../receipts/formation/actual-independent-assembly-static-kaggle.json) dans Kaggle : Node 22.20.0, Astro 7.3.3, Three.js 0.181.2, `npm ci` avec lock fourni, build exit 0 | Les huit modules et neuf briques exportées sont importés et appelés, sans remplacement par un corrigé ; sortie `71982b43…`. Comportement navigateur, WebMCP natif et compréhension restent `false` dans ce reçu |
| Premier parcours natif de l'assemblage indépendant | [Incident initial conservé](../../../receipts/formation/actual-assembly-browser-first-failure.json), puis [dix contrôles réussis avant l'échec clavier](../../../receipts/formation/actual-assembly-browser-keyboard-failure.json) sur le vrai artefact compilé `96acc0dd…` | Les empreintes du HTML/JS servi, la scène, le consentement et la capacité native bornée sont observés. `keyboard-card-selects-real-observation` échoue ; `success: false`, `completed: false`. Le diagnostic et le retest ne reçoivent aucun succès anticipé |
| Défaut réel de sélection 3D dans l'assemblage précédent | Le [parcours avec le geste clavier corrigé](../../../receipts/formation/actual-assembly-browser-raycast-failure.json) atteint quinze contrôles réussis, puis échoue sur `actual-raycast-selects-second-sphere` | La capture du Module 1 dirige le relâchement vers le stage, alors que le Module 3 l'écoutait sur son canvas. La compilation de `96acc0dd…` ne démontrait pas cette intégration. L'incident reste conservé après le correctif de la cible d'événements |
| Nouvelle copie indépendante du Module 3 | [Reprise CPU du correctif](../../../receipts/formation/free-colab-module-3-pointer-target-independent.json), source `6a60234`, caméra 5 puis 7, sélection HTML au clavier et clics 3D observés | Export `b202088c8f092630676273c7cdf97d89302983866f70f5b8df3305486d7c3335`, runtime arrêté. La cible par défaut du canvas est exercée ; `sharedStageIntegrationVerified: false` dans ce reçu. La taille projetée n'a pas été mesurée et la compréhension n'a pas été examinée |
| Nouvelle copie indépendante du Module 8 | [Nouvelle copie CPU](../../../receipts/formation/free-colab-module-8-pointer-target-independent.json) du raccordement corrigé et export effectivement reçu | Export `8d80562e069f26bb07ec097ad5763676548bf125d7ab06ce5529f8d590bd1654`. La trace du notebook reste préparée ; cet export ne démontre pas un appel natif WebMCP |
| Nouvel assemblage des exports corrigés | [Assemblage CPU réellement reçu](../../../receipts/formation/free-colab-module-8-pointer-target-assembly.json) : huit archives par HTTP avec contrôles conservés, six exports inchangés, M3/M8 fraîchement exportés, neuf briques et 46 fichiers de manifeste | Archive `141466603afaca979af3e8ee011391c9516de2a723c52809bdca86f0dbb0b1ba`, 79 149 octets, `ASSEMBLED_NOT_BUILT` côté Colab. Le dialogue manuel, la compilation Kaggle et la sélection sous capture du stage conservent chacun leur validation propre |
| Compilation du nouvel assemblage exact | [Build Kaggle réussi](../../../receipts/formation/actual-pointer-target-assembly-static-kaggle.json) pour `141466603…` : huit modules, neuf briques, 46 payloads vérifiés, `npm ci` et Astro build exit 0 | Node 22.20.0, Astro 7.3.3, Three.js 0.181.2, lock `423e48783d884b71827bef1e4aae380a3e15ca93735ef1a89423cf54e8a0edd8`. Fichiers originaux conservés, aucune brique remplacée par un corrigé. Le succès statique complète le reçu Colab sans modifier son statut historique |
| Navigateur du nouvel assemblage exact | [35/35 contrôles réels réussis](../../../receipts/formation/actual-pointer-target-assembly-browser-kaggle.json), run `assembly-038e527c-85d9-44d8-bc93-0997ccb771e7`, durée 4 917 ms | Kaggle pilote E2B sur l'artefact compilé `141466603…`. Sélection HTML au clavier, raycasting sous capture du stage, inertie, gel, particules, repli sans WebGL, capacité native bornée et nettoyage exercés ; zéro erreur runtime et zéro appel de modèle. Fixtures de QA, pas travail d'élève ni approbation humaine |
| Régressions du serveur public et privé | [PASS_PHP_REGRESSIONS](../../../receipts/formation/php-context-29-pass-kaggle.json), exit 0 ; le coordinateur observe 29 tests et 185 assertions sur le payload `5fb59cbe…` | PHP 8.5.11 du runtime FrankenPHP officiel v1.12.7 ; routes, format ciblé, cours, KB, comptes et espaces de travail. Fixtures sans credentials réels, activation publique de production `false` dans ce run |
| Navigateur de la release candidate | [62/62 contrôles formation](../../../receipts/formation/candidate-browser-62-v2.json) et [77/77 contrôles atome](../../../receipts/formation/atom-five-navigation-candidate.json) | Kaggle pilote E2B contre le serveur candidat `127.0.0.1:4321`, avec zéro appel de modèle ; ces résultats ne constituent pas la vérification de la release publique |
| Atome et cinq destinations sur le domaine public | [77/77 contrôles de l'atome](../../../receipts/formation/atom-five-navigation-live.json) sur `https://orbit.securedme.ca/` | Navigateur E2B piloté par Kaggle ; zéro appel de modèle. Ce parcours artistique et ses liens gardent leur périmètre distinct des mécanismes de formation et de la validité scientifique |
| Incidents publics du manifeste conservés | [Premier échec du digest](../../../receipts/formation/live-browser-v2-digest-failure.json) puis [échec de la lecture courante](../../../receipts/formation/live-browser-latest-digest-failure.json) : la copie compressée du manifeste restait ancienne alors que l'archive distante était f2 | Le coordinateur a identifié une réponse Brotli ancienne distincte de la réponse sans compression, puis corrigé les dates et la compression du manifeste uniquement. Le nouveau reçu 72/72 établit le readback réussi ; les incidents gardent leurs résultats initiaux |
| Critères ouverts au checkpoint antérieur | Transport public Context, appels natifs et publication du second Studio, documents Canva | **Qualification de mission encore incomplète** ; les versions Kaggle, le navigateur de l'assemblage, le readback formation et la lecture du Studio authentifié sont établis, mais ces résultats ne ferment pas les autres critères |
| Save & Run All après lecteur ZIP partagé | Le coordinateur rapporte pour [la version Kaggle 354391847](https://www.kaggle.com/code/celebrum/orbit-formation-software-validation?scriptVersionId=354391847) : 133 assertions et assemblage des exports réussis, puis échec `ETARGET` pour `motion-utils@^13.5` pendant l'installation du second Studio | **Exécution partielle** : les étapes réussies ne valident pas le second Studio ni toute la campagne ; son reçu immutable et son graphe exact restent à rattacher au reçu maintenu |
| Graphe de dépendances de la reprise | Le lockfile préparatoire `studio-success-lock.json`, SHA-256 `e4215188e3f702b8707d3992aaa0f917bbdca00e58118a0f6953d98697412938`, conserve `motion-utils` résolu en `13.3.0`. Le nouveau reçu statique conserve sa propre empreinte d'installation `ed94c13524c078f84c44f074a3034d10850f81470a80603638c3404663b4ba06` | Préparation et exécution ultérieure ont des empreintes distinctes ; le succès de la reprise conserve l'échec initial `ETARGET` |
| Transport du corpus pédagogique et accès serveur | GET `/api/v1/course-context/{outline,entries}`, credentials omis, neuf sources publiques prévues, empreintes et portée refusées en cas de désaccord ; [29 régressions PHP](../../../receipts/formation/php-context-29-pass-kaggle.json) réussies | Le serveur est construit pour refuser une admission incomplète. Une réussite logicielle ne garantit pas que Sanity a produit les neuf références attendues ; son activation publique reste désactivée |
| Admission réelle de Sanity Context | [Neuf imports publics terminés, puis admission refusée](../../../receipts/formation/course-context-import-status.json). La dernière construction guidée est `succeeded`, mais `learning_modules` cite les Modules 1 à 7 et deux sources anciennes ; le Module 8 est prêt sans être cité, `PROJECT.md` reste `skipped`, et le namespace demandé n'est pas créé | `publicAdmittedEntries: 0`, `publicEndpointEnabled: false`, `HOLD_PUBLIC_COURSE_CONTEXT_ADMISSION`. Aucune entrée, provenance ou revue humaine n'est fabriquée. Aucun journal personnel ni credential n'est inclus. Le serveur attend un corpus entièrement admissible ; son déploiement et son cache de production ne sont pas prouvés par le reçu PHP |
| Refus contrôlé du serveur réellement déployé | [Transport désactivé observé depuis Kaggle](../../../receipts/formation/course-context-production-disabled.json) : les deux routes du cours retournent HTTP 503, `UNAVAILABLE`, `CONTEXT_NOT_READY` et `noFallback: true` | CORS public `*` sans credentials, cache `no-store, private`, `nosniff`. Une origine étrangère reçoit HTTP 403 sur l'ancienne route privée de KB. Archive serveur `0246a362…`. Ce refus conforme ne devient pas une lecture réussie du corpus Context |
| Propriétaire du registre natif | Source inspectée : registre par document et propriétaire de montage, fermeture du prédécesseur, rejet du nettoyage tardif d'une ancienne vue | Le code exprime la règle ; sa nouvelle preuve native appartient aux contrôles de la version courante |
| Retrait de l'accès temporaire de mission | [RETIRED_AND_REFUSED, HTTP 401](../../../receipts/formation/mission-token-retirement.json) | Credential dédié à la mission enregistré comme retiré ; aucune valeur secrète dans ce manuel |
| Compréhension de l'élève | À examiner dans les rendus et les séances | Reformulation, démonstration et transfert humains |

Le reçu Colab groupé conserve `PARTIAL_VALIDATION`, `coldStartsVerified: false`, `allCourseFunctionsValidated: false` et `learnerUnderstanding: NOT_EXAMINED`. Le redémarrage et la reprise ultérieurs sont un reçu séparé : ils ne réécrivent pas les champs du premier rapport. Le coordinateur rapporte une observation de l'interface CPU d'un compte gratuit ; le JSON de cette exécution garde `accountPlanObserved: not-observed`. Ces provenances restent distinctes.

Pour lire une preuve, nommer **la version, l'entrée, l'environnement, le scénario, le résultat et sa limite**. Une empreinte peut montrer qu'un fichier correspond à sa copie. Le statut `external-declared` conserve ce qu'une personne déclare avoir fait. Une exécution technique demande un résultat d'exécution ; un examen pédagogique demande une explication ou un transfert réellement examiné.

L'ensemble des campagnes Gemini, les trajectoires autonomes de modèles et les résultats pédagogiques relèvent de leurs propres expériences. Les contrôles de ce cours n'en déclarent pas l'achèvement.

Le résultat `PASS_STATIC_INSTALL_BUILD` historique concerne son archive et son graphe d'installation. Les reçus ultérieurs établissent leurs nouvelles installations statiques par `npm ci`, avec des empreintes distinctes. La version 354391847 conserve son échec `ETARGET` ; elle ne reçoit pas rétroactivement le statut de cette reprise. L'authentification réelle, le transport GET/CORS et une publication humaine sélectionnée gardent leurs propres critères de sortie. Le build Kaggle de l'assemblage indépendant complète le résultat Colab `ASSEMBLED_NOT_BUILT` sans modifier ses champs, ni attribuer le succès au dialogue d'import manuel indisponible.

## Historique — Module 4 — correctif et retest observé

La source élève corrigée a l'empreinte `d8ff5bd2c54474cca831101f9992d4b92af273370c6f53dee07cd7b639c2d2ce`; son corrigé séparé a l'empreinte `3acb942558e5dc6e42104494238a6191af12c274d607f184843611be3166807b`. La brique `inertia.js` conserve son contrat. Le changement porte sur l'aperçu : flèches bornées avec vitesse nulle, fin de geste sans lancer, inertie du pointeur, Espace et gestion des interruptions. Le reçu du retest constate `x: 0.5 → 0.54` et `y: 0.5 → 0.54`, puis `held: false`, `vx/vy: 0` au relâchement. Le geste pointeur lance réellement l'objet ; le rebond et le gel de position/vitesse ont été observés. Son export téléchargé reste une fixture de QA opérée par Codex, séparée du corrigé et d'une production d'élève.

## Historique — Module 7 — correctif et retest observé

Le notebook du Module 7 corrigé porte l'empreinte `6b85b3780c50e10cb02a4e75e2ef553b15989f2487cef500ed15b6d572cc0f45`; son corrigé séparé porte `1426f7985237d66f60736b2b55e96e8b47aa6d9736e161ce25bef40b461b031b`. Le changement concerne l'aperçu HTML, avec les identifiants `element-1`, `element-2` et `element-3`. Le contrat de la brique et l'objectif de deux sélections restent inchangés. Le retest utilise Entrée puis Espace pour sélectionner les deuxième et troisième éléments, examine `aria-pressed` et répète cinq choix avec les limites 32 puis 4. La première entrée sort sous la borne de quatre; la vue et la sélection finales restent `summary` et `element-3`. Le gel d'`elapsed` est observé. Ces résultats concernent l'historique interne de la copie Colab, distinct du véritable retour du projet Astro.

## Historique — Modules 3 et 8 — intégration du geste et retest observé

Le défaut de l'ancien assemblage concernait l'intégration, malgré sa compilation réussie : le Module 1 capturait le geste sur le stage, tandis que le Module 3 attendait son relâchement sur le canvas. `pointerTarget` reste facultatif pour l'usage isolé et reçoit explicitement le stage dans l'hôte d'assemblage. La projection et le raycasting utilisent le rectangle du canvas. La copie CPU neuve du Module 3 observe les caméras 5 puis 7, les choix HTML et les clics 3D ; elle ne prétend pas, seule, valider le stage commun.

Les nouvelles archives des Modules 3 et 8 ont ensuite remplacé uniquement leurs anciennes copies dans le manifeste de QA. Les six autres exports sont conservés à l'identique. Le nouvel assemblage réel `141466603…` est compilé dans Kaggle, puis exercé dans E2B avec 35 contrôles réussis. Ces reçus établissent la sélection sous capture partagée sur ce scénario. Les échecs de `96acc0dd…` restent dans la chronologie ; aucune vérification n'est attribuée rétroactivement à cet artefact. L'empreinte du manifeste Git HTTP et celle de la copie Windows CRLF sont distinctes et identifiées dans le reçu Colab ; les assertions de contenu ont été conservées.

## Historique — Retour d'usage et prochaine revue

Le coordinateur transmet le retour de l'utilisateur : le laboratoire fonctionne pour son essai et ses boutons sont compréhensibles. La revue graphique reste une activité commune ultérieure. Ce retour borne un usage humain ; les critères techniques se lisent dans leurs reçus. Les documents en préparation poursuivent le périmètre pédagogique actuel ; le prochain tutoriel et les éditoriaux restent dans leurs prochaines missions.

Cette section est le point unique de mise à jour du manuel pour les nouveaux reçus. Avant les exports définitifs, le coordinateur y reporte les liens immuables, empreintes et limites du dernier payload, puis recompose les sources. Une qualification technique réussie ouvre la revue documentaire ; la disponibilité des PDF et des pages Canva reste une autre étape. Le [registre des versions](TOOLCHAIN_AND_VERSIONS.md) distingue versions déclarées, exécutions observées et outils d'export encore à qualifier.

## Historique — Lire la suspension du corpus public

Les neuf documents de cours ont été importés. Deux tentatives guidées utiles ont ensuite terminé leur construction ; leurs contenus ne satisfont pas la portée stricte du cours. Une construction marquée réussie chez le fournisseur décrit son exécution, pas l'admissibilité de sa sortie pour Orbit. Le compteur conserve 107 documents utilisés, avec une différence d'une unité signalée après la construction, sans ajout public supposé au-delà des neuf imports. Aucun problème ancien de KB n'a été accepté ou rejeté pour obtenir un succès.

Pour cette édition, l'assistant peut examiner les missions, les artefacts partagés et les passages fournis dans le dossier. Il ne doit pas présenter un sommaire Context public du cours comme disponible. Le chemin désactivé retourne `UNAVAILABLE`, raison `CONTEXT_NOT_READY`, avec `noFallback: true` ; cette réponse est validée par les régressions serveur et par le reçu de production qui garde ses observations HTTP. La reprise exige des références admissibles couvrant les huit modules et le protocole, puis la validation d'une lecture du corpus effectivement admis.
