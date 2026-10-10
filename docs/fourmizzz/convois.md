# Les convois dans le jeu

Un convoi envoie de la nourriture et/ou des matériaux à un autre joueur. C'est l'outil logistique principal de l'alliance : les greniers, qui récoltent beaucoup, ravitaillent ceux qui construisent ou pondent. Relevé sur s5 le 2026-10-07 (Optizzz, `docs/research/fourmizzz-pages.md`, section `commerce.php`).

## Envoyer un convoi

- Page **`commerce.php`** (menu Commerce). Champs : destinataire (pseudo), nourriture, matériaux, ouvrières. Les quantités acceptent les abréviations **k, m, g** (« 272k », « 1,5m ») : le bot accepte les mêmes.
- Depuis le profil d'un joueur, le lien convoi est **`commerce.php?ID=<id du joueur>`** : il ouvre la page avec le destinataire choisi. L'`id` est celui de l'API d'exports. C'est le moyen d'avoir un lien « livrer » prérempli dans Discord ; pré-remplir les quantités par l'URL **n'a pas été vu** (à vérifier).
- Il faut **une ouvrière par lot de 10 ressources**, + 5 % par niveau d'étable à pucerons. Les ouvrières envoyées ne récoltent plus pendant le trajet et **ne reviennent pas** (observation d'un joueur).
- Le surplus est **perdu** si les entrepôts du destinataire débordent. La place libre chez un autre joueur n'est pas publique : seul le demandeur la connaît.

## Durée du trajet

```
temps (s) = floor( 0,9^VA × 637200 × (1 − e^(−d / 350)) )
d = √((x₁ − x₂)² + (y₁ − y₂)²)
```

- VA : niveau de Vitesse d'attaque de **celui qui envoie**. Coordonnées `x`, `y` dans l'API d'exports.
- Exemple : d = 10, VA 0 → 4 h 59 ; VA 3 → 3 h 38.
- Formule vérifiée à la seconde sur un profil du jeu (Optizzz, `docs/research/temps-de-trajet.md`).

## Ce qu'on voit après l'envoi

- L'expéditeur voit ses convois en cours sur `commerce.php` : « Vous allez livrer 1 [nourriture] et 0 [matériaux] à X dans 1H 22m 22s ».
- Un message « Convoi livré à X : … » arrive **au départ** dans sa messagerie.
- Le destinataire voit les ressources arriver dans son stock. **Aucun export public** ne trace les convois : l'alliance ne peut les suivre que par déclaration (d'où `/livrer`).

## Règles

- Convois **interdits** entre comptes d'une même IP (multi déclaré) et pendant un **sitting** (garde de compte).
- Vendre des ressources contre de l'argent réel est interdit.
