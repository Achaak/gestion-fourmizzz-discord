# Fourmizzz expliqué aux agents

Fourmizzz est un jeu de stratégie par navigateur : chaque joueur élève une fourmilière, récolte des ressources, pond des unités, chasse pour agrandir son terrain et s'allie avec d'autres joueurs. L'alliance qui utilise ce bot joue sur le **serveur 5** (`https://s5.fourmizzz.fr`).

Lire dans cet ordre :

1. [glossaire-du-jeu.md](glossaire-du-jeu.md) : le vocabulaire des joueurs (TDC, ponte, grenier, flood…). Les membres l'emploient sans l'expliquer sur Discord.
2. [mecaniques.md](mecaniques.md) : ressources, récolte, constructions et recherches, colonies, armée. Ce qui sert à comprendre qui produit et qui consomme.
3. [convois.md](convois.md) : comment marche un convoi dans le jeu. C'est le cœur du premier chantier.
4. [api-exports.md](api-exports.md) : la seule source de données du jeu que le bot et l'API ont le droit d'utiliser.
5. [regles.md](regles.md) : règles du jeu et limites que les outils de l'alliance doivent respecter.

## D'où viennent ces informations

- Les pages d'aide officielles du jeu (`tutorial.php`), la page `developer.php` (API), et des relevés faits sur les pages du jeu.
- Le dépôt [Optizzz](https://github.com/Achaak/Optizzz) (extension navigateur du développeur du bot) : `docs/research/` y détaille les sélecteurs des pages, les formules vérifiées et leurs mesures. Quand une information manque ici, chercher là d'abord.
- Le forum officiel (`fourmizzz.cforum.info`) pour les usages des joueurs : c'est de la méta, pas une règle.

Une information non vérifiée est marquée **à vérifier**. Ne jamais inventer une formule du jeu : demander, ou chercher une source.
