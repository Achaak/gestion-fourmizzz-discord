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
- Le bot n'a pas besoin de lire le contenu des messages pour les commandes. (Depuis les ADR 0002 et 0003, il lit le salon des convois pour y déclarer les lignes postées et le vider.)
- Le tableau est mis en page avec les **Components V2** de Discord : un encadré coloré par section (vert en cours, jaune en attente, gris terminées), des titres, une barre de progression en carrés de couleur. Un tel message compte au plus 40 composants et 4 000 caractères : le tableau coupe d'abord les terminées, puis les en attente, puis les en cours (« … et N de plus »). Au-delà d'une dizaine de demandes en cours, il faudra une commande de consultation ou une pagination.
- Les heures d'arrivée et de mise à jour sont des horodatages Discord (« dans 3 heures », « 23:50 ») : Discord les affiche à l'heure de chaque lecteur et les tient à jour. Les dates de demande restent au format JJ/MM.
- Le demandeur est cité par une mention : Discord affiche son nom actuel sur le serveur. Le tableau ne notifie jamais personne.
- Le salon doit rester réservé au tableau : voir l'ADR 0002, qui remplace l'idée de retirer « Envoyer des messages » aux membres.
