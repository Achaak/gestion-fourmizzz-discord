# 0002. Le bot vide le salon du tableau

Date : 2026-10-10 · Statut : accepté, complété par l'ADR 0003 (le bot lit les convois postés avant de supprimer)

## Contexte

Le salon des convois ne doit contenir que le tableau (`docs/projet/besoin.md` : « un seul salon, toujours propre »). Les joueurs y tapent pourtant leurs commandes, et certains y postent leurs lignes de convoi ou « Reste 250k » par habitude. L'ADR 0001 prévoyait de retirer « Envoyer des messages » aux membres, mais Discord désactive alors la barre de saisie : on ne peut plus y taper `/livrer`.

## Décision

- Le bot **supprime tout message du salon qui n'est pas le tableau**, dès qu'il est posté, quel que soit l'auteur (admins et autres bots compris).
- Au démarrage, il supprime aussi ce qui a été posté pendant son absence (les 100 derniers messages), après l'avoir traité (ADR 0003).
- Les réponses du bot aux commandes restent visibles du seul joueur et s'effacent seules : elles ne sont pas des messages du salon.

## Conséquences

- Le bot reçoit l'intent `GuildMessages` (non privilégié). Depuis l'ADR 0003, il lit aussi le contenu (`MessageContent`) pour y trouver les lignes de convoi.
- Il lui faut la permission **« Gérer les messages » dans ce salon** (pas sur tout le serveur).
- Un joueur qui poste autre chose qu'une ligne de convoi perd son message sans avertissement. Le message d'aide du tableau rappelle quoi faire.
- Les membres gardent « Envoyer des messages » dans le salon, pour pouvoir taper les commandes.
