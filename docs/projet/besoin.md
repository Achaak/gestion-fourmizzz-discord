# Le besoin de l'alliance

Synthèse des fils Discord de l'alliance du 2026-10-10. Deux sujets ont été lancés ; le premier est prioritaire.

## 1. Suivi des convois (priorité)

**Problème** : on a du mal à suivre les livraisons et à prioriser les demandes. Ça va en début de serveur, mais on sera plus efficaces si on suit et redirige les ressources vers les joueurs.

**Ce qui a été retenu** : un seul salon, toujours propre, avec un **tableau** tenu à jour par le bot (proposition retenue par les membres qui ont participé) :

```
📦 CONVOIS · mis à jour le 10/10 à 13 h 36

▶ EN COURS
 #  Joueur      Demande               Pour   Avancement
 3  Alice       Entrepôt mat. 12      12/10  ████████░░  82 %
                Matériaux   1 240 000 / 1 512 000 · reste 272 000

⏳ EN ATTENTE DE VALIDATION
 #  Joueur      Demande               Pour   Total
 6  Chloé       Champignonnière 15    15/10  2 100 000 mat.

✅ TERMINÉES (7 derniers jours)
 2  Alice       Couveuse 17           08/10  Chloé, Bruno, David
```

- Le joueur fait sa demande : construction, niveau, date souhaitée (le modèle actuel du salon), plus les quantités.
- Un responsable la **valide** : elle passe en cours. C'est là qu'on priorise et qu'on peut faire passer une petite demande pendant une grosse.
- Chacun **déclare** ses livraisons ; le bot fait les totaux et le reste.
- Évolutions déjà évoquées : réduire sa demande si on a produit entre-temps, annuler, un lien vers la page de convoi du jeu préremplie.

**Alternatives écartées** : un salon par demande ou un fil par demande. Plusieurs demandes en parallèle restent possibles dans le tableau unique. Choix détaillé : `docs/adr/0001-commandes-slash-et-tableau-unique.md`.

## 2. Suivi de la consommation par joueur (plus tard)

**But** : voir pour chaque joueur ce qu'il a demandé, livré et produit, en restant dans Discord et dans l'information, pas dans le pilotage.

```
Consommation = Demandé + Produit − Livré   (en tenant compte des colonies)
```

- « Demandé » et « Livré » viennent de l'archive des convois (chantier 1) : d'où l'intérêt de tout garder en base dès maintenant.
- « Produit » s'estime avec le TDC de l'API (`docs/fourmizzz/mecaniques.md`) : c'est une borne haute, car on ne connaît ni le nombre d'ouvrières ni leur répartition.
- **Vision long terme** (système utilisé sur s4) : un **solde** par joueur. Un bot calcule la production journalière de chacun et lui attribue une part des ressources de l'alliance selon son TDP ; le solde monte quand on livre, baisse quand on reçoit. Négatif : on doit livrer ; positif : on peut recevoir. Avantage : un système impartial qui évite les conflits (« X demande trop »). Il suppose que les membres mettent à jour leurs ouvrières et leur TDP. L'alliance veut d'abord l'information simple avant d'automatiser.

## 3. Suivi des floods (idée)

Suivre les floods pour éviter de se marcher dessus (deux membres qui floodent la même cible). Pas encore cadré.

## Contraintes

- Rester **intégré à Discord**.
- Données confidentielles à l'alliance (`docs/fourmizzz/regles.md`).
- Rôle Discord « développeur » sans droits d'admin, donné par un admin aux développeurs.
