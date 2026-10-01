# Synthia — recherche appliquée au personnage 3D

27 septembre 2026. Recherche et réalisation par Codex principal, sans délégation. Périmètre : Orbit, Blender 4.5.9, Three.js 0.181.1, glTF. Assets canoniques consultés en lecture seule.

## Ce que la comparaison montre

Le personnage livré jusqu’ici est une étude technique, pas une identité validée. La référence possède un visage ovale, des paupières et des cils précis, un nez fin, des lèvres dessinées, des coques ivoire ajourées, une mécanique dense dans le cou et un médaillon ADN aux tempes. Le maillage actuel conserve trop de traits génériques de son anatomie de départ. Des lignes posées sur une surface ne reproduisent pas des assemblages de pièces.

La planche `assets/synthia/direction/synthia-character-direction-01.png` est une illustration de direction. Elle ne prouve ni une géométrie, ni un rig, ni une animation. Le GLB se vérifie séparément dans `/presence-lab/`.

## Méthode de recherche et sources

Exa : trois recherches distinctes de cinq résultats (15 résultats examinés au niveau titre/extrait), suivies de six lectures de documentation. Les vidéos payantes Blender Studio n’ont pas été regardées : seules les descriptions publiques et réponses de leur auteur ont été consultées. Aucun cours acheté, aucun asset de marketplace copié. Les résultats de recherche pointant vers Three.js r110 et Blender 3.5 ont été écartés comme guides d’implémentation pour nos versions.

| Source primaire | Enseignement retenu | Application / statut |
| --- | --- | --- |
| [Blender Studio — forme de tête](https://studio.blender.org/training/stylized-character-workflow/5d3a1bb1d4efee8f4fb28c06/) | Contrôler les proportions en vue orthographique et l’apparence en perspective. | Comparaison face, trois-quarts et profil exigée ; ressemblance encore insuffisante. |
| [Blender Studio — edge flow et articulation](https://studio.blender.org/training/stylized-character-workflow/5e5408388faf011a381510de/) | Les expressions servent à vérifier les besoins de topologie avant de figer le visage. | Le clignement approximatif et les morphs actuels restent des études. Aucune synchronisation labiale précise revendiquée. |
| [Solidify — Blender 4.5](https://docs.blender.org/manual/en/4.5/modeling/modifiers/generate/solidify.html) | Donner une épaisseur réelle aux surfaces ; vérifier les normales et les limites de l’approximation. | Ajout de coques, revue des intersections nécessaire. |
| [Bevel — Blender 4.5](https://docs.blender.org/manual/en/4.5/modeling/modifiers/generate/bevel.html) | Les chanfreins produisent de vrais bords qui captent les reflets. | Appliqué aux coques de l’étude suivante, sans prétendre garantir une fabrication physique. |
| [glTF — Blender 4.5](https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html) | Export des matériaux PBR reconnus, géométrie, morphs et skinning ; les shaders Blender arbitraires ne sont pas portables tels quels. | Matériaux Principled et GLB embarqué, contrôlé indépendamment dans Three.js. |
| [Three.js — MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html) | Métal et diélectrique ont des comportements différents. Un environnement améliore les reflets. | Céramique non métallique, métal distinct ; paramètres affinés sans transformer tout le visage en chrome. |
| [Three.js — PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html) | Préfiltrage de l’environnement pour les surfaces de rugosités différentes. | Environnement de studio généré localement via RoomEnvironment + PMREM ; aucune image HDR distante. |
| [Three.js — gestion des couleurs](https://threejs.org/manual/en/color-management.html) | Distinguer données linéaires et couleurs d’affichage. | Sortie sRGB explicite, tone mapping ACES, exposition diminuée ; couleurs relues visuellement. |

## Décisions pratiques

1. Corriger la forme avant d’ajouter davantage de détails : silhouette, profondeur des orbites, paupières, lèvres, menton et profil.
2. Adapter les coques à la surface réelle avec projection géométrique ; ne pas juxtaposer une sphère indépendante au crâne.
3. Séparer céramique, métal, joints et éléments lumineux. Employer la transparence holographique après validation du rendu opaque.
4. Tester la même géométrie dans le grand affichage et le panneau compact. La portabilité technique ne constitue pas une validation artistique.
5. Conserver chaque essai et son générateur, avec une sélection explicite. L’essai v6 a été rejeté visuellement pour coques détachées et coupe de mâchoire artificielle.
6. Maintenir texte, clavier et mouvement réduit. Le contrôle ECC utilisé est `accessibility` : il guide la revue, il ne fournit pas une certification WCAG.

## Reste à valider

La fidélité à Synthia n’est pas acquise. Il manque notamment une topologie de paupières crédible, le détail mécanique du cou et des épaules, la justesse du profil et une revue humaine satisfaisante. Aucun pipeline gratuit ne garantit automatiquement la reconstruction fidèle d’un personnage à partir d’illustrations. Le modèle doit être sculpté et comparé, pas déclaré terminé parce qu’il se charge.
