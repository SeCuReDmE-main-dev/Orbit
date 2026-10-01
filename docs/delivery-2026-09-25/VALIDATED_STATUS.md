# Statut validé — 25 septembre 2026

Ce relevé borne ce qui est démontré au 25 septembre. Il ne déclare pas le plan maître terminé.

## Preuves fraîches

| Domaine | Statut | Preuve / limite |
|---|---|---|
| Conservation | VALIDÉ LOCAL | Sauvegarde Orbit vérifiée : 118 fichiers. |
| Environnement | VALIDÉ LOCAL | Environnement isolé et opérateurs locaux observés; aucune valeur secrète exportée. |
| Sanity/GROQ | VALIDÉ PARTIEL | 13 documents publics consultés, 4 affirmations GROQ et `.orbit/sanity/groq-readback.json`; l’accès distant reste borné au corpus vérifié. |
| Exa | VALIDÉ PARTIEL | Appel réel : 3 résultats NASA dans `.orbit/exa/live-search-receipt.json`; adaptateur couvert par 4 tests. |
| Codex | VALIDÉ PARTIEL | Modèle gpt-5.6-luna réellement utilisé; requête HTTP consentie → réponse → checkpoint 3 dans `.orbit/companion-http-receipt.json`. Interface câblée, chat dans extension non démontré. |
| Recherche/broker/UI | VALIDÉ LOCAL | Recherche Exa câblée au broker/UI; 18 tentatives persistantes, cache par mission; tests HTTP mockés passés. |
| Tests | OBSERVÉ | `npm test` réexécuté à 13:50 : 31 tests Vitest + 5 tests de politique réussis. `npm run build` complet (core, providers, broker, web, Studio) terminé avec code 0 à 13:51. npm audit : 3 high, 10 moderate, 0 critical; release bloquée sur analyse/correction de dépendances. |
| Navigateur local | OBSERVÉ PARTIEL | Chrome sur 127.0.0.1:4173 : création des 39 points et conservation du brouillon après rechargement; télémétrie orbitale visible. Cela ne valide pas la reprise par le service worker. |
| Extension publique | NON DÉMONTRÉ | E2E avec l’extension réelle encore absent. |
| Déploiement cPanel | BLOQUÉ | UAPI HTTP 403 et SSH AuthenticationException après vérification de clé hôte; aucun contournement, déploiement non effectué. |
| Context MCP/Knowledge Base | NON FAIT | Aucun parcours live déclaré. |
| Antigravity `agy` / Copilot | NON DISPONIBLES | Aucun binaire local validé dans l’audit précédent; aucune auth ou invocation. |
| Six handoffs | NON FAIT | Aucun transfert fournisseur complet démontré. |

## Lots restants

M01 est conservé; M02 est localement avancé; M03–M05 sont partiels selon les preuves ci-dessus. M06, M08 et M10 restent bloqués ou incomplets; M07, M09 et M11 demandent encore validation ou stabilisation; M12 n’est pas commencé; M13 éditorial est livré dans Drive selon le readback du coordinateur. Le statut global reste **partiel**, et une livraison complète du plan maître n’est pas revendiquée.

## Prochaines actions humaines bornées

1. Ouvrir [la prévisualisation locale](http://127.0.0.1:4173) pendant que le serveur de prévisualisation fonctionne. Modifier altitude et vitesse; créer une question puis recharger pour retrouver le brouillon.
2. Charger `web/dist` comme extension Chrome non empaquetée, relever l’ID de 32 caractères, puis fournir cet ID au coordinateur pour la validation E2E. Le site local seul ne possède pas les permissions de l’extension.
3. Résoudre séparément le HTTP 403 cPanel avant toute déclaration de déploiement. Les tests techniques ci-dessus ont déjà été exécutés par Codex : inutile de les refaire pour avancer.

Le chargement de l’extension et la résolution cPanel restent des actions humaines; aucune autorisation supplémentaire n’est demandée ici.

## Rendu et validation du 25 septembre, 13:52

Accueil refait avec quatre sections et accès directs; bibliothèque de quatre sources Sanity; console de compagnon avec consentement explicite. Scène Three.js éclairée, grille illustrative, étoiles locales déterministes, trace issue des positions calculées; rayon du globe et distance du satellite utilisent la même échelle. La taille du satellite reste illustrative. Aucun changement du calcul newtonien.

Chrome : pause/reset et altitude 600 km observés avec vitesse 7561,7 m/s. Profil étroit demandé à 360 pixels mais Chrome rapporte 450 pixels effectifs : document 431 pixels, sans débordement horizontal. Ce contrôle ne prouve pas 360 pixels ni l'extension chargée. Calcul hors écran couvert par le test avec IntersectionObserver; reprise sans simuler le temps passé hors vue.

Défaut Windows reproduit : Astro avait généré le site puis quittait avec UV_HANDLE_CLOSING. Remplacement de la récupération Sanity par une requête HTTPS sans pool, bornée en temps et taille; builds suivants terminés avec code 0. C'est une observation de correction, pas une preuve générale sur toutes les versions de Node.

La compilation complète et les tests ne remplacent pas les validations encore absentes : installation propre, six handoffs, sécurité de release, crawler 40 pages/profondeur 2, comparaison d'expériences, Knowledge Base et déploiement.


## Mise en ligne observée — 25 septembre, 14:24 Toronto

La préversion statique est maintenant disponible sur https://orbit.securedme.ca. Jean-Sébastien a créé le domaine et sa racine isolée. L’ancien endpoint srv22.swhc.ca était incorrect pour le compte actuel; le même jeton a réussi sur bishop.web-dns1.com, vérifié depuis la session WHC/cPanel. Les opérateurs locaux et le courtier Settings ont fourni les accès, avec ajout du seul hôte exact dans le processus de déploiement. Aucun cache plugin, environnement Education ou secret global modifié.

HTTPS valide, six fichiers publics reçus avec SHA-256 identiques au build, en-têtes CSP/nosniff/referrer présents, laboratoire 600 km/7561,7 m/s vérifié dans Chrome, quatre sources affichées, cinq outils enregistrés. Détails dans PUBLIC_DEPLOYMENT.json. Cette mise en ligne ne termine pas la release : recherche/compagnon exigent l’extension et le broker local, autres intégrations et audit restent ouverts.

À reprendre : mettre à jour proprement la configuration et l’allowlist versionnée des opérateurs vers le serveur actuel; ne pas retester automatiquement l’ancien serveur. Le .env Orbit conserve encore les anciennes adresses, car la réussite ci-dessus utilise un override exact limité au processus.
