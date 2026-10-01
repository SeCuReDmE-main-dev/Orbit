# Orbit Studio — livraison des corpus et moteurs de relations

Date : 2026-09-29  
Dépôt : `C:\Users\jeans\Desktop\challenge-work-hacketon\dev.to-challenge`  
Branche / HEAD observés avant et après le travail : `master` / `3c6806b9cb77b81b5bea2e3debb7146f5ee0b821`

## Résultat public

- Landing : <https://orbit.securedme.ca/>
- Atelier Orbit : <https://orbit.securedme.ca/app/>
- Guide : <https://orbit.securedme.ca/guide/>
- Studio : <https://orbit.securedme.ca/studio/>
- Dossiers : <https://orbit.securedme.ca/studio/orbit-dossiers>
- T · I · F : <https://orbit.securedme.ca/studio/orbit-tif>
- Relations : <https://orbit.securedme.ca/studio/orbit-relations>
- Audit : <https://orbit.securedme.ca/studio/orbit-audit>

Les six entrées supérieures sont présentes dans cet ordre : Structure, Dossiers, T · I · F, Relations, Audit et Releases. Les URL directes et le retour du navigateur sont pris en charge par le routeur Studio et la réécriture du document root.

## Modèle livré

Quatre corpus logiques ont été créés dans `pzscx4w8/production` :

| Corpus | Sources admises | État observé |
|---|---:|---|
| Références nettes | 1 | prêt |
| Contradictions directes | 0 | incomplet volontairement |
| Ambiguïtés de portée | 2 | prêt |
| Évolution | 2 | prêt |

Le corpus de contradictions reste vide parce qu'aucune paire vérifiée de même sujet, propriété et portée n'a été fabriquée pour satisfaire un écran.

Le moteur T/I/F conserve trois collections indépendantes. Il exige un passage exact, lu, admis et dans la même portée avant de classer une preuve dans T ou F. Une portée absente, un passage manquant ou une source non lue va dans I. Aucun pourcentage de vérité n'est calculé.

Le moteur de relations compare les attributs déclarés : fournisseur, produit, mode, condition, version et période. Il rend une des relations suivantes : contradiction de même portée, portées différentes, succession de version, contexte ou comparaison indéterminée. Une règle de domaine absente reste inconnue. Une seule règle candidate existe dans le Content Lake et elle demeure `approvedByHuman: false`.

## Deux parcours contrôlés dans le Studio public

### Ambiguïtés de portée

Deux sources et deux affirmations ont été chargées. Orbit classe la relation entre le mode Deep Research différé et les conditions ZDR comme **portées différentes**. Il n'en fait pas une contradiction directe.

### Évolution

Deux sources et deux affirmations ont été chargées. Orbit classe le déplacement de la configuration entre `@sanity/context` 1.0.0 et Context 2.0 comme **succession de version** et indique que l'ancienne conclusion doit être réexaminée.

Ces parcours démontrent l'apport du contenu structuré : une recherche textuelle peut retrouver les phrases, mais elle n'encode pas à elle seule l'égalité de portée, la succession de version ni la chaîne entrée → affirmation → réponse à revoir.

## Déploiement

Paquet public final :

- fichier : `.orbit/releases/orbit-public-relation-studio-final-20260929-1820.zip`
- taille : `12 299 208` octets
- SHA-256 : `441db2dc12b220075f290b0248756b6dc3214ea873be95fcac5a474044e1b192`
- plan cPanel : `f2c5b606d4abbede1488b156`
- sauvegarde distante : `/home/xacm7978/orbit.securedme.ca.backup-f2c5b606d4abbede1488b156`
- transport : `brokered-ssh-sftp`
- commutation atomique : réussie; chemins attendus vérifiés; staging nettoyé; rollback non déclenché

Passerelle privée Laravel :

- paquet : `.orbit/releases/orbit-account-api-relation-studio-20260929-1802.zip`
- taille : `19 180 329` octets
- SHA-256 : `edec537a0f246aad681901e833b4b8f555e9df2ac9c02ff87030520992e2cb28`
- chemin privé : `/home/xacm7978/orbit-account-api`
- sauvegarde distante : `/home/xacm7978/orbit-account-api.backup-39e7f103d95e8bb088606f6b`

Le domaine utilise PHP 8.4. Le handler est maintenant livré dans le `.htaccess`; il survit donc au remplacement atomique du document root. L'environnement Laravel privé est hors du document root et son fichier `.env` a la permission `0600` lors du déploiement.

## Validations réellement exécutées

- `npm test` : 28 fichiers Vitest, 98 tests réussis; 5 tests Node de garde de politique réussis.
- `npm run build` : core, providers, broker, web et Studio réussis avant la finition visuelle.
- `npm run build --workspace @orbit/studio` : réussi après le correctif d'espacement des cartes.
- Déploiement des schémas Sanity : réussi pour `orbit-companion/production/pzscx4w8`.
- Seed contrôlé : 15 créations `createIfNotExists`; reçu SHA-256 `ac4e8c46443398d657851c609f0ce5bf78a572882901a0d70d4be73eb87600aa`.
- Content Lake après seed : 41 documents, dont 4 corpus, 9 sources, 9 affirmations et 1 règle candidate.
- Routes HTTPS : landing, application, guide, Studio et les six URL directes répondent HTTP 200.
- Context public : `outline` et `entries` répondent `READY` depuis `sanity-context-mcp` pour `kb5CHIYGXCMJ`.
- Contrôle d'origine : une origine étrangère reçoit HTTP 403.
- Validation des paramètres : une requête contenant un paramètre inattendu reçoit HTTP 422.
- Petit écran simulé à 390 px : largeur de document égale à la largeur du viewport, sans débordement horizontal observé.
- Revue visuelle : le chevauchement des textes des cartes a été reproduit, corrigé et recontrôlé sur la route publique Relations.
- Scan du paquet public : 428 fichiers; les deux secrets configurés examinés (`SANITY_API_TOKEN` et `SANITY_CONTEXT_VIEWER_TOKEN`) ont zéro occurrence publique.

## Limites et décisions humaines restantes

- Aucun document n'a été supprimé de la Knowledge Base.
- Les sources Web marquées `partial — Crawl page limit reached` restent signalées comme partielles.
- Aucune règle plithogénique candidate n'a été approuvée à la place de l'humain.
- Aucune décision d'audit humain n'a été fabriquée; les boutons exigent une justification.
- Le corpus « Contradictions directes » reste incomplet jusqu'à la vérification d'une paire réellement incompatible dans la même portée.
- PHP et Composer n'étaient pas disponibles localement pour exécuter PHPUnit. La preuve disponible est le démarrage Laravel sur l'hôte PHP 8.4, les réponses HTTP de la passerelle et les contrôles d'origine publics.

## Restauration

La sauvegarde locale préalable est :

- `C:\Users\jeans\Desktop\challenge-work-hacketon\.orbit-backups\dev-to-challenge-before-relation-engines-20260929.zip`
- SHA-256 : `1B846778A8F8EBE27B78585BD0B286C9D4A0A1B2611FB114C42A00005F50F5E9`

Le déploiement public peut être restauré à partir de la sauvegarde distante indiquée plus haut. Aucun commit, push ou réécriture d'historique n'a été effectué.
