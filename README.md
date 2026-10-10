# Gestion Fourmizzz Discord

Bot Discord de l'alliance sur [Fourmizzz](http://www.fourmizzz.fr) (serveur 5) : demandes de convoi et suivi des livraisons dans un tableau unique.

## Commandes du bot

| Commande                                                       | Qui                     | Effet                                                            |
| -------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| `/demande construction niveau [nourriture] [materiaux] [pour]` | tout membre             | Crée une demande, en attente de validation                       |
| `/valider numero`                                              | responsables            | Ouvre la demande aux livraisons                                  |
| `/livrer numero [nourriture] [materiaux]`                      | tout membre             | Déclare un convoi envoyé ; la demande se ferme une fois complète |
| `/annuler numero`                                              | demandeur, responsables | Annule la demande                                                |

Les quantités s'écrivent comme dans le jeu : `1 240 000`, `272k`, `1,5m`. La date : `JJ/MM`.

## Installer

Prérequis : Node 24, pnpm.

1. Créer l'application et son bot sur le [Discord Developer Portal](https://discord.com/developers/applications). Inviter le bot avec les scopes `bot` et `applications.commands`, et les permissions « Voir les salons », « Envoyer des messages », « Lire l'historique des messages » sur le salon des convois.
2. `cp .env.example .env` et le remplir.
3. Lancer :

```bash
pnpm install
```

```bash
pnpm deploy-commands
```

```bash
pnpm dev
```

En production : `pm2 start ecosystem.config.cjs`.

## Limites actuelles

Les demandes sont gardées en mémoire : un redémarrage les efface. Elles passeront par l'API de l'alliance (`docs/projet/architecture.md`).

## Documentation

- `docs/projet/` : le besoin et l'architecture.
- `docs/fourmizzz/` : le jeu expliqué aux agents et aux nouveaux développeurs.
- `GLOSSARY.md` : le vocabulaire du bot.
