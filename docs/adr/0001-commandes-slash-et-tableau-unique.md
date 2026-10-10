# 0001. Commandes slash et tableau unique pour les convois

Date : 2026-10-10 · Statut : accepté

## Contexte

L'alliance veut suivre ses demandes de convoi dans Discord (`docs/projet/besoin.md`). Trois formes ont été proposées : un salon par demande, un fil par demande, un seul salon avec un tableau tenu par le bot. Pour faire une demande, une proposition était de poster un message selon un modèle, que le bot lirait puis supprimerait, avec une réaction pour valider.

## Décision

- **Un seul salon, un seul message de tableau**, que le bot modifie après chaque changement. Plusieurs demandes en cours coexistent dans le tableau.
- **Commandes slash** (`/demande`, `/valider`, `/livrer`, `/annuler`) plutôt que des messages à analyser. Les réponses du bot ne sont visibles que de celui qui a tapé la commande.
- `/valider` est réservée par défaut aux membres qui ont « Gérer les messages ».

## Conséquences

- Les champs sont typés par Discord (niveau entier, options nommées) : pas de modèle mal rempli à interpréter, pas de droit « Gérer les messages » nécessaire au bot pour supprimer ceux des joueurs.
- Le bot n'a besoin que de l'intent `Guilds`, pas de la lecture du contenu des messages.
- Un message Discord fait 2 000 caractères au plus : le tableau coupe d'abord les terminées, puis les en attente (« … et N de plus »). Au-delà d'une vingtaine de demandes ouvertes, il faudra une commande de consultation ou une pagination.
- Le salon doit rester réservé au bot : retirer « Envoyer des messages » aux membres, garder « Utiliser les commandes de l'application » (**à vérifier** sur le serveur).
