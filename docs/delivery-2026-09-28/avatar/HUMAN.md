# Orbit — atelier du personnage, 28 septembre 2026

**État : premier aperçu TRELLIS.2 obtenu ; téléchargement du vrai modèle bloqué par le quota gratuit ZeroGPU.** Le personnage dans l’application n’a pas été remplacé et aucun déploiement n’a été fait.

## Ce que vous pouvez regarder maintenant

Ouvrir [l’atelier local](http://127.0.0.1:4321/avatar-review/) pendant que le serveur de développement fonctionne.

1. À gauche : le modèle 3D actuel, manipulable.
2. À droite : l’image de fabrication préparée, explicitement marquée **référence 2D**. Ce n’est pas le résultat TRELLIS téléchargé.
3. Essayez **Face**, **Trois quarts**, **Profil**, puis **Sans textures**. Cette dernière vue retire l’image des matériaux pour voir les volumes réels.
4. Essayez **Hologramme**, le curseur **Clignement**, puis **Disperser / reformer**. Les expressions agissent seulement sur un modèle qui possède les déformations correspondantes.
5. Les mesures sous les personnages sont actualisables dans le volet de vérification. Elles ne constituent pas une validation des performances d’un nouveau modèle absent.

La démonstration [TRELLIS.2](https://huggingface.co/spaces/microsoft/TRELLIS.2) reste dans son onglet. Les vues colorée et sans textures, de trois quarts et de profil, ont été examinées. Le quota a été atteint au clic **Extract GLB**, après la génération de l’aperçu. L’aperçu est temporaire ; sa conservation par Hugging Face entre sessions n’est pas garantie.

## Ce qui est fait

- Image détourée de fabrication, issue de la référence canonique, avec alpha ; originals conservés.
- Un essai TRELLIS.2 : résolution 1024, graine 42, randomisation désactivée, cible d’export 100 000 faces, textures 2048.
- Atelier de comparaison indépendant et manifeste qui interdit une promotion implicite du candidat.
- Nouveau mode holographique conservant les matériaux PBR, les déformations et les animations disponibles ; ancien mode particules conservé pour la dispersion.
- Audit du GLB, préparation Blender de variantes détaillée et légère, sauvegarde `.blend` et empreintes. La préparation a été exécutée sur une **sphère synthétique de contrôle**, pas sur l’avatar TRELLIS.

## Ce qui manque réellement

Le fichier GLB, sa finition Blender, des yeux séparés et des paupières articulées, le rig facial du nouveau personnage, sa revue dans deux hôtes et la mesure de performance sur ce personnage. Aucun de ces points n’est déclaré terminé.

L’aperçu présente un cou et un crâne reconstruits en volume. C’est une appréciation visuelle provisoire ; la zone des yeux, la bouche et les petits éléments mécaniques nécessitent une inspection du maillage. Aucune note de fidélité définitive n’est attribuée.

## Reprise sans reconstruire le contexte

1. Après le renouvellement du quota gratuit, essayer **Extract GLB** si l’aperçu est toujours accessible. Aucun achat ni abonnement.
2. Si la session a expiré, réutiliser `assets/orbit-avatar/reference-bust-v1.png` avec les paramètres ci-dessus. Ce serait une nouvelle exécution, à inscrire dans le reçu ; ne pas la déclarer déjà faite.
3. Conserver le téléchargement original sous `assets/orbit-avatar/candidates/`. Ne pas écraser l’original pendant la finition.
4. Exécuter l’audit puis la préparation décrite dans `IMPLEMENTATION.md`. Les résultats de cette préparation sont des **maillages statiques à examiner**, pas un avatar animé terminé.
5. Renseigner `web/public/avatar-review/candidate.json` uniquement avec des chemins GLB locaux vérifiés sous `/avatar-review/`. Laisser `approvedForApplication: false`.
6. Examiner face, profil, trois quarts et vue sans textures. Faire la revue visuelle avant la finition et l’intégration dans l’application.

La prochaine décision porte sur **le vrai buste 3D importé et inspecté**, pas sur la qualité de l’image d’entrée.
