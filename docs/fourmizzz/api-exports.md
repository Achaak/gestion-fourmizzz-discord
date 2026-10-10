# API des exports publics

Source : page en jeu `https://s5.fourmizzz.fr/developer.php` (lue le 2026-10-07). Contrat OpenAPI : `api-exports.fr.openapi.yaml`, lien sur cette page. Détail et mesures : Optizzz, `docs/research/fourmizzz-api-exports.md`.

## En bref

- Lecture seule, gratuite, **sans authentification**, sur l'adresse de chaque serveur : `https://s5.fourmizzz.fr/api/exports/…`. `www.fourmizzz.fr` répond 404.
- **Un export par heure** depuis le 2026-10-07 au moins (à l'origine : un par nuit, à minuit heure de Paris). La version est la date **UTC** `AAAAMMJJHHmm`. Historique jamais purgé.
- Une version publiée ne change plus : on peut la garder en cache, et ne télécharger que les versions nouvelles.
- Le jeu a déjà coupé ce genre d'accès par le passé (souvenir d'un membre) : c'est pourquoi l'API de l'alliance garde les exports en base.

## Routes

| Requête                                      | Réponse                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `GET /api/exports/`                          | `{ "players": [versions…], "alliances": [versions…] }`, plus récente d'abord |
| `GET /api/exports/players/` (`?version=…`)   | Tableau des joueurs, trié par id                                             |
| `GET /api/exports/alliances/` (`?version=…`) | Tableau des alliances, trié par tag                                          |

Le `/` final compte (sinon 301). Erreurs : `{"error": "…"}`, avec le code HTTP (400 version invalide, 404 pas d'export, 502/503 incident).

## Joueur

`id`, `pseudo`, `alliance` (tag ou `null`), `masterPlayerId` (colonisateur ou `null`), `x`, `y`, `field` (**TDC** en cm²), `grade` (ou `null`), `buildingScore`, `technologyScore`, `trophyScore`, `onHoliday`, `isBanned`.

Un joueur s'identifie par **serveur + id** : le pseudo peut changer. Le lien Discord ↔ joueur doit donc garder l'`id`, pas le pseudo.

## Alliance

`tag`, `name`, `playersCount`, `totalField`, `totalBuildingScore`, `totalTechnologyScore`, `totalTrophyScore`, `diplomacy.pacts[] { tag, name, description }`, `diplomacy.wars[]` (tags).

- `pacts[].name` est le **type** de pacte (« PNA », « Total »), pas le nom de l'alliance.
- Une guerre n'est déclarée que d'un côté : chercher dans les deux sens, sans tenir compte de la casse.

## Ce que l'API ne donne pas

Ressources, ouvrières et leur répartition, armée, niveaux de bâtiments et de recherches (dont la Vitesse d'attaque), convois, dernière connexion. Tout cela ne peut venir que des joueurs eux-mêmes (saisie ou copier-coller), jamais d'une lecture automatique de leurs pages (`regles.md`).

## Volumes sur s5 (2026-10-07)

Export joueurs ≈ 330 Ko pour 1 610 joueurs ; 50 alliances. Le TDC exporté date de l'heure de l'export : il bouge plusieurs fois par jour.
