# 0003. Le bot lit les convois postés dans le salon

Date : 2026-10-10 · Statut : accepté

## Contexte

Après chaque convoi, les joueurs ont l'habitude de poster la ligne du jeu (« Vous allez livrer 0 nourritures et 40 000 materiaux à X dans 6H 38m 39s… »). Depuis l'ADR 0002, le bot supprime ces messages sans les compter : seul le formulaire de `/livrer` déclarait une livraison. Poster la ligne directement est le geste le plus simple pour les joueurs.

## Décision

- Le bot **lit les messages postés dans le salon des convois**, et seulement là. Chaque ligne de convoi qu'il y trouve est déclarée au nom de l'auteur, comme avec `/livrer` (`src/convoy/declare.ts`). Le message est ensuite supprimé, qu'il contienne une ligne ou non.
- Le bot répond dans le salon par un court message, qui cite l'auteur sans le notifier et s'efface seul : 15 s pour une confirmation, 60 s pour une erreur. Un message privé aurait échoué chez les joueurs qui les refusent.
- Au démarrage, il traite de la même façon les messages postés pendant son absence (100 derniers), avant de les supprimer.
- `/livrer` reste disponible.

## Conséquences

- Le bot demande l'intent privilégié **`MessageContent`**. Il faut l'activer dans le Developer Portal (Bot → Privileged Gateway Intents) ; sans lui, la connexion du bot échoue. C'est un simple interrupteur tant que le bot est sur moins de 100 serveurs.
- Le bot reçoit le contenu des messages de tous les salons qu'il voit, mais ignore tout ce qui n'est pas dans le salon des convois et n'en garde rien.
- L'heure d'arrivée se lit dans la ligne, ou à défaut se compte depuis l'heure du message, pas depuis le traitement : un message traité au démarrage garde la bonne heure.
