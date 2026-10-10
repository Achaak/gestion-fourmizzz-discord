# Gestion Fourmizzz Discord

Bot Discord de gestion de l'alliance sur [Fourmizzz](http://www.fourmizzz.fr) (serveur **s5**). Premier chantier : les **demandes de convoi** et leur suivi dans un tableau unique. Le besoin exprimé par l'alliance est dans `docs/projet/besoin.md`.

Projet à deux : un développeur écrit le bot (ce dépôt) ; l'autre écrit le serveur, la base PostgreSQL et l'API de l'alliance (`docs/projet/architecture.md`). Tant que l'API n'existe pas, le bot garde les demandes en mémoire (`MemoryConvoyStore`), perdues au redémarrage.

- **Code en anglais** : identifiants, commentaires, noms de fichiers, noms de tests.
- **Textes visibles par les joueurs en français**, avec le vocabulaire du jeu (convoi, nourriture, matériaux, ponte, TDC…) et le **vouvoiement**. Nombres comme le jeu (« 1 240 000 », `formatNumber`), dates au format JJ/MM à l'heure de Paris. La doc (`docs/`) est en français.
- Le vocabulaire du domaine est dans `GLOSSARY.md` ; ce qu'on sait du jeu est dans `docs/fourmizzz/`. Lire les deux avant de toucher aux règles des convois.

## Commandes

```bash
pnpm dev               # bot avec rechargement (lit .env)
pnpm start             # bot
pnpm deploy-commands   # enregistrer les commandes slash sur le serveur Discord (après chaque ajout ou changement)
pnpm typecheck
pnpm test              # vitest
pnpm lint              # ESLint (typescript-eslint strict + type-checked)
pnpm format            # Prettier (format:check en lecture seule)
```

Configuration : copier `.env.example` en `.env`. Ne jamais committer `.env` ni un token.

## Architecture

- Node 24 exécute directement le TypeScript (suppression des types) : pas d'étape de build. D'où `erasableSyntaxOnly` (pas d'`enum`, pas de propriétés de paramètre de constructeur) et des imports en `.ts`.
- `src/convoy/` : logique pure des convois, sans Discord, testée avec vitest : règles d'une demande (`request.ts`), stockage (`store.ts`, interface `ConvoyStore`), tableau (`board.ts`), lecture des quantités (`quantity.ts`, « 272k », « 1,5m » comme le jeu), des dates (`due-date.ts`), des lignes de convoi copiées du jeu (`convoy-line.ts`) et leur déclaration (`declare.ts`).
- `src/discord/` : commandes slash (`commands/`, une par fichier, inscrites dans `commands/index.ts`) et publication du tableau (`board-publisher.ts`, un seul message modifié à chaque changement ; tout autre message du salon est supprimé, ADR 0002) ; lecture des lignes de convoi postées dans le salon (`convoy-channel.ts`, ADR 0003).
- Une règle enfreinte par un joueur lève `ConvoyError` : son message lui est montré tel quel, en réponse visible de lui seul (ou, pour une ligne postée dans le salon, en court message qui s'efface). Toute autre erreur est loguée et le joueur voit un message générique.
- Les responsables des convois sont les membres qui ont la permission « Gérer les messages » ; les admins du serveur peuvent restreindre chaque commande dans Paramètres du serveur → Intégrations.
- `discord.js` v14, `zod` pour valider l'environnement et, plus tard, les réponses de l'API. Préférer une brique éprouvée à du code écrit à la main.

## Données et confidentialité

- Les données de l'alliance (demandes, livraisons, et plus tard production, armée, niveaux) **ne doivent pas sortir de l'alliance** : pas de page publique, pas de salon visible des pactes.
- Le jeu n'est lu que par son API publique d'exports (`docs/fourmizzz/api-exports.md`). Le bot n'agit jamais dans le jeu et ne lit pas les pages du jeu à la place des joueurs (`docs/fourmizzz/regles.md`).

## Documentation

- `docs/fourmizzz/` : le jeu expliqué aux agents (mécaniques, convois, API d'exports, règles). À mettre à jour à chaque découverte. Source plus détaillée : `docs/research/` du dépôt [Optizzz](https://github.com/Achaak/Optizzz).
- `docs/projet/` : le besoin de l'alliance et l'architecture bot / API.
- `docs/adr/` : décisions d'architecture.

## Workflow

Les skills de Matt Pocock sont dans `.claude/skills/` (voir `SOURCE.md`) : `/grill-me` ou `/grill-with-docs` pour cadrer, `tdd` pour implémenter, `to-tickets` pour découper en issues GitHub.

Commits : Conventional Commits (`feat:`, `fix:`, `chore:`…). Le hook Husky `pre-commit` lance lint-staged (ESLint + Prettier), `typecheck` et les tests : ne pas le contourner avec `--no-verify`.

TypeScript reste en 6.0 : TypeScript 7 (portage Go) n'a plus d'API JavaScript et casse typescript-eslint.

## Agent skills

### Issue tracker

Les issues vivent dans les GitHub Issues de `Achaak/gestion-fourmizzz-discord` (CLI `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Les cinq labels par défaut (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context : `GLOSSARY.md` et `docs/adr/` à la racine. See `docs/agents/domain.md`.
