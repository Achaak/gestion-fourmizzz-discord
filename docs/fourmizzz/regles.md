# Règles du jeu et limites des outils

Règles officielles : `http://www.fourmizzz.fr/tutorial.php?partie=tuto-regles&page=tutorial` (CGU, relues le 2026-10-01). Elles n'ont **pas** de paragraphe explicite sur les bots ; ce qui suit mêle les règles écrites et ce que les joueurs considèrent comme toléré.

## Règles écrites qui touchent l'alliance

- Un compte par joueur et par serveur.
- Comptes sur la même IP (multi déclaré) : **aucun échange de ressources** (donc pas de convoi entre eux), pas d'attaque synchronisée.
- Sitting (garde d'un compte par un autre joueur, 7 jours au plus) : **convois et mouvements d'armée interdits**.
- Vente de comptes, d'unités, de ressources ou de temps contre de l'argent réel interdite.

## Ce que les outils de l'alliance s'autorisent

D'après la discussion de l'équipe (Discord, 2026-10-10) :

- **Autorisé** : l'API d'exports, faite pour ça ; garder ses versions en base ; enregistrer ce que les membres déclarent eux-mêmes (demandes, livraisons), à condition qu'ils le sachent.
- **Interdit, considéré comme de la triche** : les traceurs de TDC (suivre le TDC des autres en continu), les scripts qui **agissent** dans le jeu (relancer une chasse, remettre une antisonde, envoyer un convoi…).
- **Discutable** : un outil qui rend gratuit ce que le Compte+ fait payer (ex. un simulateur de combat dans le jeu).

Pour ce projet, donc :

- Le bot **n'agit jamais dans le jeu** et ne se connecte à aucun compte.
- Il ne lit pas les pages du jeu à la place des joueurs. Le jeu n'est lu que par l'API d'exports.
- Un lien vers une page du jeu (ex. `commerce.php?ID=…`) est permis : c'est le joueur qui clique et agit.

## Confidentialité

Les données de l'alliance (demandes, livraisons, et plus tard production, armée, niveaux) **ne sortent pas de l'alliance**. Une armée ou un niveau de Dôme/Loge connu d'un ennemi l'aide à attaquer. Concrètement : salons Discord réservés aux membres, API protégée, aucune page publique, purge des données d'un membre qui quitte l'alliance.
