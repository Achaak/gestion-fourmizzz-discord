# Mécaniques utiles à l'alliance

Ce qui sert à comprendre qui produit, qui consomme et pourquoi on se fait des convois. Relevés et sources détaillés : `docs/research/ressources-et-entretien.md` d'Optizzz.

## Ressources et récolte

- Deux ressources : **nourriture** et **matériaux**.
- Une ouvrière au travail rapporte **1 ressource toutes les 30 minutes**, soit **48 par jour**, même hors connexion.
- Au travail : au plus **une ouvrière par cm² de TDC**. Les ouvrières en trop ne récoltent rien. Le joueur répartit ses ouvrières au travail entre nourriture et matériaux ; **cette répartition n'est pas publique**.
- La récolte arrive par paquets toutes les 30 minutes, à une heure propre à chaque joueur.
- La champignonnière produit de la nourriture en continu (ex. 5 022 par jour au niveau 8, 8 538 au niveau 9 sur s5).
- Le stock est borné par les **entrepôts** : ce qui dépasse est perdu.

Production brute d'un joueur, par jour : `48 × min(ouvrières, TDC)` ressources, réparties entre nourriture et matériaux, plus la champignonnière en nourriture. L'API donne le TDC mais pas le nombre d'ouvrières ni leur répartition : **une estimation de production depuis l'API est une borne haute** (on suppose le TDC entièrement exploité).

## Constructions et recherches

- Les bâtiments (Couveuse, Solarium, Champignonnière, Entrepôts, Étable à pucerons, Dôme, Loge…) et les recherches (Laboratoire : Technique de ponte, Vitesse d'attaque, Architecture…) coûtent de la nourriture et des matériaux, et du temps.
- Chaque niveau coûte et dure plus que le précédent. La durée d'un niveau est environ ×1,6 (construction) ou ×1,7 (recherche) celle du précédent (**à vérifier**). Les coûts exacts se lisent sur `construction.php` et `laboratoire.php` du joueur : le bot ne les calcule pas, le demandeur saisit les quantités.
- Score « Fourmilière » = somme des niveaux de bâtiments (`buildingScore`), score « Technologie » = somme des niveaux de recherche (`technologyScore`).

## Colonies

- Gagner une attaque sur la Loge d'un joueur le **colonise**.
- Le colonisateur prend **20 % + 1 % par niveau de son étable à pucerons** de ce que récolte le colonisé (ouvrières et champignonnière), pas de ses propres colonies.
- Dans l'API : `masterPlayerId` d'un joueur = son colonisateur (ou `null`).
- Pour le suivi de consommation : la production d'un colonisé est amputée de la taxe, celle d'un colonisateur augmentée. « En prenant en compte les colonies » veut dire ça.

## Armée

- Les unités se pondent sur la page Reine. Elles consomment chaque jour une part de leur coût en nourriture : 5 % dehors (TDC, chasse, attaque), 10 % dans la fourmilière ou le Dôme, 15 % dans la Loge.
- Sans nourriture, l'armée perd 0,5 % toutes les 30 minutes.
- L'armée et les niveaux de Dôme et de Loge sont **sensibles** : ils révèlent la défense d'un joueur. Ils ne doivent jamais sortir de l'alliance.

## Attaques et TDC

- On ne peut attaquer qu'un joueur dont le TDC est entre **50 % et 300 %** du sien.
- Une attaque gagnée sur le TDC prend **20 %** du TDC de la cible, au plus 1 cm² par fourmi attaquante.
- Le **flood** utilise ce mécanisme entre alliés pour faire monter le TDC vers les greniers.
- Pause du serveur de 5 h à 6 h (heure de Paris) chaque jour.
