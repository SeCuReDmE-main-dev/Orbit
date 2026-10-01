# Orbit — clôture de la documentation 2.1.7

Date : 30 septembre 2026, livraison achevée après minuit UTC.
Dépôt : dev.to-challenge ; branche master ; HEAD 3c6806b9cb77b81b5bea2e3debb7146f5ee0b821. Les modifications déjà présentes ont été conservées. Aucun commit ni push.

## Résultat

Le guide public sans ancre, https://orbit.securedme.ca/guide/, contient la documentation finale du landing et ses quinze jeux, en français, anglais et espagnol. Le fragment #release désigne une section du même document.

Le guide décrit le vortex ambiant seul, le lancer, les rebonds, l'absence de freinage au passage du pointeur, le maintien à 2/4/6 secondes, l'ASCII, l'explosion autonome et la reconstruction. Les effets sont décrits comme artistiques. Le landing approuvé reste identique dans son comportement ; seule son étiquette de version passe à 2.1.7.

Les préférences communes disposent d'une portée de traduction explicite. Le guide est traduit intégralement ; le vocabulaire des commandes de l'interface et du Studio est localisé sans traduire les sources ni les dossiers privés. Cela ne constitue pas une validation de traduction exhaustive de tous les paragraphes de ces deux applications.

## Livraison et corrections

Paquet : .orbit/releases/orbit-final-2.1.7.zip.
SHA-256 : c1e6bfee2ccef31bcb6702199d09efa678a0d9965f40946a37bc9cfd550db1ed.
Déploiement : 6bed5bc14573de273783247e.
Sauvegarde distante : /home/xacm7978/orbit.securedme.ca.backup-6bed5bc14573de273783247e.

Le 403 temporaire venait des permissions 600 des fichiers dans une première archive. Le paquet final utilise 644. Les pages HTML demandent désormais une revalidation du cache. Une ancienne copie déjà conservée par Chrome a nécessité un rechargement ignorant le cache ; un navigateur neuf a reçu directement la version 2.1.7.

## Validations réellement effectuées

- Constructions Web et Studio dans E2B : exit 0. Dernière reconstruction Web : exit 0.
- Lecture HTTP finale : /, /guide/, /app/, /studio/, /orbit-release.json et le PDF retournent 200. Résultats dans .orbit/atom-live-20260930/guide-public-readback.json.
- Vérification navigateur du guide sans ancre : contenu anglais de recherche visible et texte espagnol des interactions visible ; retour en français.
- Réglages du guide : texte agrandi observé à 20 px ; contraste renforcé observé blanc. Capture : guide-2.1.7.png.
- Les microVM de contrôle créées pour cette livraison ont été arrêtées.

## Limites précises

Les 77 contrôles mentionnés dans le guide appartiennent à la validation antérieure du landing 2.1.6. Aucune nouvelle campagne Kaggle ni aucun appel de modèle de benchmark n'a été exécuté pour ce correctif documentaire.

Le PDF pédagogique reste l'édition 2.1.6 de 56 pages, explicitement nommé ainsi. Le parcours Studio authentifié et la localisation exhaustive des textes applicatifs n'ont pas été revérifiés de bout en bout dans cette livraison. Les benchmarks des trois moteurs ne sont pas déclarés terminés.

## Chemins principaux

web/src/pages/guide.astro ; web/src/components/GuideAtom.astro ; web/src/components/GuideResearch.astro ; web/src/content/guide-research.json ; web/src/lib/landing-preferences.ts ; web/src/lib/orbit-ui-language.ts ; web/src/layouts/OrbitLayout.astro ; web/src/pages/app/index.astro ; studio/components/OrbitToolMenu.tsx ; web/src/styles/atom-games.css ; web/public/.htaccess ; tools/package_guide_release.py.

Prochaine étape : reprise séparée de l'interface Orbit et du Studio, puis validation de leur parcours complet. Le correctif du guide n'autorise pas à annoncer ces autres chantiers achevés.
