# Architecture : bot Discord et API de l'alliance

Partage proposé par le développeur de l'API le 2026-10-10 et accepté par le développeur du bot.

```
Discord ──(commandes slash)──▶ Bot (ce dépôt, Node.js) ──HTTP──▶ API de l'alliance ──▶ PostgreSQL
                                                                    ▲
                                       export horaire Fourmizzz ────┘ (cron, déjà en place)
```

| Partie                          | Qui                  | Où                                                                    |
| ------------------------------- | -------------------- | --------------------------------------------------------------------- |
| Bot Discord                     | développeur du bot   | ce dépôt ; tourne sur le serveur du développeur de l'API avec **PM2** |
| Serveur, base, API, site        | développeur de l'API | son serveur ; PostgreSQL, phpPgAdmin                                  |
| Récupération des exports du jeu | développeur de l'API | cron horaire, déjà en place                                           |

## Principes

- **La base est la seule source de vérité.** Le bot ne garde rien de durable : il écrit et lit par l'API. Le site de l'alliance lira les mêmes données.
- **Tout garder**, même ce qui ne sert pas encore : demandes, livraisons, historique. Le suivi de consommation (`besoin.md` §2) en aura besoin.
- **Lien Discord ↔ joueur à la main** au départ : une table `identifiant Discord → id du joueur sur s5` remplie pour la vingtaine de membres. Pas de système d'authentification.
- Le bot passe par l'interface `ConvoyStore` (`src/convoy/store.ts`). Aujourd'hui `MemoryConvoyStore` ; demain une `ApiConvoyStore` qui appelle l'API. Le reste du bot ne change pas.

## Contrat de l'API (brouillon à valider avec le développeur de l'API)

Authentification du bot : un secret partagé dans un en-tête (`Authorization: Bearer …`). L'API n'est pas ouverte au public.

| Route                                  | Corps                                                            | Réponse                             |
| -------------------------------------- | ---------------------------------------------------------------- | ----------------------------------- |
| `POST /convoy-requests`                | `requester`, `building`, `level`, `food`, `materials`, `dueDate` | la demande créée                    |
| `POST /convoy-requests/:id/validate`   | `by`                                                             | la demande                          |
| `POST /convoy-requests/:id/deliveries` | `by`, `deliveries` : liste de `{ food, materials, arrivesAt }`   | la demande, avec le reste           |
| `POST /convoy-requests/:id/cancel`     | `by`                                                             | la demande                          |
| `GET /convoy-requests?status=…`        |                                                                  | les demandes, avec leurs livraisons |
| `GET /members`                         |                                                                  | le lien Discord ↔ joueur            |

- Un membre (`requester`, `by`) est envoyé par son identifiant Discord ; l'API le relie au joueur.
- Une demande renvoyée a la forme de `ConvoyRequest` (`src/convoy/request.ts`) : statut `pending | active | done | cancelled`, dates en ISO 8601, `dueDate` en `YYYY-MM-DD`.
- `POST …/deliveries` accepte une demande `done` (le surplus est gardé, le statut ne change pas) et doit ignorer une livraison déjà enregistrée du même membre (mêmes quantités, `arrivesAt` à 2 min près) : le bot retraite au démarrage les messages qu'il n'a pas pu supprimer. Le bot vérifie les règles sur toutes les demandes avant d'écrire ; une route qui reçoit les livraisons de plusieurs demandes d'un coup rendrait l'écriture vraiment atomique.
- Une règle enfreinte (livrer une demande en attente, valider deux fois…) répond **409** avec `{ "error": "message en français pour le joueur" }`. Le bot le montre tel quel (`ConvoyError`). Une demande inconnue répond 404.
- Les règles vivent alors dans l'API ; celles de `src/convoy/request.ts` servent de référence et de tests.

## Hébergement

- Node 24 sur le serveur, PM2 : `pm2 start ecosystem.config.cjs`.
- `.env` sur le serveur seulement (token du bot, secret de l'API). Jamais dans git.
- Accès au serveur par clé SSH : n'envoyer que la clé **publique**.
- phpPgAdmin et l'API ne doivent pas être ouverts publiquement (données de l'alliance).

## À décider

- Hébergement de la base des demandes pendant le développement (mémoire aujourd'hui).
- Qui est « responsable des convois » : la permission « Gérer les messages » suffit-elle, ou un rôle dédié ?
- Rétention et purge des données d'un membre qui quitte l'alliance.
