# Guide rapide d’utilisation — Ruba v1.3.0

## 1. Présentation

Ruba est une application desktop industrielle destinée à préparer, contrôler, enregistrer et exporter des Packing Lists. La version 1.3.0 centralise les informations d’une commande dans un projet SQLite unique. Un projet peut regrouper les références, la stratégie de colisage, la grille de saisie, les cartons, la Packing List, le Breakdown, le Delivery Plan, les audits et les fichiers associés.

> **Principe essentiel :** utilisez le bouton **Sauvegarder le projet** situé dans l’en-tête principal. Cette action enregistre l’ensemble du projet, et non uniquement la Packing List visible.

## 2. Premier démarrage

Lancez Ruba depuis le raccourci Windows ou depuis `Ruba Packing List.exe` si vous utilisez la version portable. Entrez le mot de passe demandé par l’écran d’accès, puis ouvrez le **Centre industriel** ou le **Colisage opérationnel**.

Au premier démarrage, Ruba crée automatiquement ses fichiers de données dans le dossier utilisateur de l’application. La base centrale se nomme `ruba.sqlite`. La base des Gabarits se nomme `ruba_gabarits.sqlite`. Ces fichiers ne doivent pas être supprimés pendant que Ruba est ouvert.

## 3. Créer un nouveau projet

Ouvrez le ruban **Travaux**, puis choisissez **Nouveau travail**. Saisissez au minimum le **numéro de commande**. Le client peut être renseigné immédiatement ou complété depuis le Delivery Plan. Si aucun nom personnalisé n’est saisi, Ruba propose un nom de type :

```text
NUMERO_COMMANDE — CUSTOMER
```

Après la création, le projet reçoit un **Project ID** unique. Ce même identifiant sert à rattacher les informations de la commande, les Packing Lists, les fichiers importés et les Delivery Plans.

## 4. Remplir les rubans opérationnels

| Ruban | Utilisation |
|---|---|
| **Références** | Numéro de commande, Customer, PO, destination, style, SKU, composition et informations logistiques. |
| **Stratégie** | Mode de colisage, quantité maximale par carton, tailles différentes autorisées et règles de mélange. |
| **Saisie** | Couleurs, tailles, quantités commandées, dimensions, poids, capacités et paramètres de colisage. |
| **Carton Builder** | Mélange et personnalisation des pièces restantes dans les cartons. Le mode Glisser est le mode principal. |
| **Packing List** | Génération et consultation des cartons générés. |
| **Breakdown** | Analyse des quantités par taille, couleur, carton ou destination. |
| **Delivery Plan** | Planning de commande avec dates, PO, couleurs, destination, dimensions, CBM et mode d’expédition. |
| **Historique** | Liste des Packing Lists et projets enregistrés, avec chargement, modification et suppression. |
| **Fichiers exportés** | Consultation, ouverture et suppression des PDF et fichiers Excel créés par Ruba. |
| **Paramètres** | Dossier de stockage, couleurs, en-têtes de tableaux et niveau de zoom. |

Après une série de modifications, cliquez sur **Sauvegarder le projet** en haut de l’application. Vous pouvez sauvegarder avec un nom personnalisé ou laisser Ruba utiliser le nom automatique.

## 5. Utiliser les Gabarits

Ouvrez la gestion des **Gabarits** depuis l’espace industriel. Quatre catégories sont disponibles :

| Catégorie | Données enregistrées |
|---|---|
| **DIM. CARTON** | Nom, longueur, largeur, hauteur et volume calculé. |
| **POIDS PIÈCE** | Nom et poids unitaire en kilogrammes. |
| **POIDS CARTON** | Nom et poids du carton en kilogrammes. |
| **CUSTOMER** | Noms des clients utilisables dans Références. |

Pour créer un gabarit, sélectionnez une catégorie, cliquez sur **Nouveau**, complétez les champs puis enregistrez. Pour modifier un gabarit existant, utilisez l’icône de modification dans la ligne correspondante. Les mesures carton sont affichées en centimètres et le volume est calculé en mètres cubes.

## 6. Utiliser le Delivery Plan

Ouvrez le ruban principal **Delivery Plan** et sélectionnez le projet concerné. Saisissez éventuellement le nom du plan, puis utilisez la grille.

Le tableau accepte le collage direct depuis Excel. Copiez une plage Excel comprenant une ligne d’en-têtes et collez-la dans la grille. Ruba reconnaît les colonnes telles que `DATE`, `SEASON`, `CUSTOMER CODE`, `CUSTOMER NAME`, `CUSTOMER PO`, `COLOR`, `DEST`, `PO QTY`, `PCS PER CTN`, `PACKING TYPE`, `NUMBER OF CARTON`, `L`, `H`, `W`, `CBM`, `GROSS WEIGHT PER CARTON`, `INITIAL SHIP MODE` et `TARGET PL`.

Chaque cellule peut être modifiée directement. Une ligne peut être supprimée avec l’action située à droite. Le champ **CBM** est calculé automatiquement selon la formule suivante lorsque les dimensions sont en centimètres :

```text
CBM = L × H × W / 1 000 000
```

La zone de recherche permet de filtrer rapidement les lignes du plan. Cliquez ensuite sur **Enregistrer** pour rattacher le Delivery Plan au Project ID.

## 7. Références intelligentes

Dans **Références**, saisissez le numéro de commande. Ruba interroge les Delivery Plans enregistrés et propose les clients, PO, destinations et couleurs associés. Une valeur unique peut être proposée automatiquement ; lorsqu’il existe plusieurs valeurs, elles sont disponibles dans les suggestions.

Les propositions ne bloquent jamais la saisie manuelle. Vous pouvez donc corriger ou compléter une valeur si le Delivery Plan ne contient pas encore l’information souhaitée.

## 8. Charger et modifier un projet

Ouvrez **Travaux** puis repérez le projet dans le tableau. Cliquez sur **Charger**. Ruba restaure les données enregistrées sous le Project ID : références, stratégie, couleurs, résultats, audits, préférences et informations de génération.

Modifiez les rubans nécessaires, puis utilisez **Sauvegarder le projet** pour mettre à jour le même projet. Pour consulter les anciennes Packing Lists, ouvrez le ruban **Historique**.

## 9. Exporter et consulter les fichiers

Les exports sont organisés automatiquement dans deux dossiers :

```text
PDF_Exports
XLSX_Exports
```

Le PDF est généré en orientation paysage afin d’améliorer la lisibilité des tableaux larges. Dans **Fichiers exportés**, vous pouvez rechercher un fichier, l’ouvrir avec l’application Windows associée ou le supprimer après confirmation.

## 10. Configurer les couleurs et le zoom

Ouvrez **Paramètres** dans le Centre industriel. Vous pouvez choisir la couleur principale, la couleur des en-têtes de tableaux et le niveau de zoom. Les choix sont enregistrés localement et restaurés au prochain démarrage.

Le bouton **Réinitialiser** restaure les valeurs par défaut. Pour conserver une présentation stable entre plusieurs postes, utilisez les mêmes valeurs de couleur et le même niveau de zoom sur chaque installation.

## 11. Sauvegarde automatique de la base SQLite centrale

### Fonctionnement actuel

La version 1.3.0 enregistre automatiquement les changements dans la base SQLite lorsque vous utilisez **Sauvegarder le projet**. En revanche, la programmation de copies périodiques de la base n’est pas encore exposée par un bouton interne dans l’interface. Pour une entreprise, il est donc recommandé de programmer une copie Windows avec le script `Backup-RubaSQLite.ps1` fourni avec ce guide.

La base centrale est située dans :

```text
<dossier utilisateur Ruba>\ruba.sqlite
```

Le chemin exact peut varier selon Windows et le nom de l’application. Le script fourni recherche automatiquement `ruba.sqlite` dans `%APPDATA%` et `%LOCALAPPDATA%`.

### Méthode recommandée

1. Copiez `Backup-RubaSQLite.ps1` dans un dossier permanent, par exemple `C:\Ruba\Backup`.
2. Modifiez la variable `$BackupRoot` si vous souhaitez stocker les sauvegardes sur un autre disque ou un dossier réseau.
3. Exécutez le script une première fois avec PowerShell pour vérifier le chemin trouvé.
4. Ouvrez le **Planificateur de tâches Windows**.
5. Créez une tâche appelée `Ruba - Sauvegarde SQLite`.
6. Choisissez un déclenchement quotidien ou à l’ouverture de session.
7. Comme action, utilisez :

```text
Programme : powershell.exe
Arguments : -ExecutionPolicy Bypass -File "C:\Ruba\Backup\Backup-RubaSQLite.ps1"
```

8. Choisissez un compte utilisateur ayant accès au dossier Ruba et au dossier de sauvegarde.
9. Testez la tâche avec **Exécuter** dans le Planificateur de tâches.

Pour garantir une copie parfaitement cohérente, il est préférable que Ruba soit fermé pendant la copie. Le script peut fermer puis relancer Ruba si vous activez `$RestartRuba = $true`. Avant toute restauration, fermez Ruba et conservez plusieurs générations de sauvegarde.

### Politique de conservation recommandée

| Type | Conservation conseillée |
|---|---|
| Sauvegarde quotidienne | 30 jours |
| Sauvegarde hebdomadaire | 12 semaines |
| Sauvegarde mensuelle | 12 mois |
| Copie externe ou réseau | Au moins une copie hors du poste principal |

## 12. Restauration après incident

Fermez Ruba. Localisez le dossier de données actuel et renommez la base endommagée, par exemple `ruba.sqlite.corrompue`. Copiez ensuite la sauvegarde choisie vers le nom `ruba.sqlite`, en conservant le même dossier. Si les fichiers `ruba.sqlite-wal` ou `ruba.sqlite-shm` existent avec la sauvegarde, copiez-les uniquement lorsqu’ils proviennent de la même copie et que Ruba était fermé au moment de la sauvegarde. Redémarrez Ruba et vérifiez le nombre de projets dans le Dashboard.

## 13. Nouveautés de la version 1.3.0

La version 1.3.0 introduit une architecture de projet industriel plus complète. Toutes les données importantes peuvent être restaurées à partir d’un Project ID unique, avec une sauvegarde globale accessible dans l’en-tête. Le Delivery Plan devient un véritable tableau compatible avec un flux Excel, avec recherche, édition, suppression de lignes et calcul CBM automatique.

La gestion des Gabarits est également renforcée. Les champs de dimensions et de poids sont normalisés, les spécifications ne restent plus blanches dans l’interface et une catégorie Customer est disponible. Les Références peuvent maintenant exploiter les informations du Delivery Plan pour proposer automatiquement les valeurs liées à une commande.

Les fichiers importés peuvent être ouverts directement depuis l’application. Les paramètres de couleur, d’en-têtes et de zoom sont persistants. Les exports PDF utilisent le paysage pour mieux gérer les tableaux larges.

## 14. Corrections principales

| Correction | Effet utilisateur |
|---|---|
| Chargement incomplet d’un projet | Le chargement restaure désormais un ensemble beaucoup plus large de données et de préférences. |
| Projet et Packing List confondus | Un Project ID central est maintenant séparé de l’identifiant de Packing List historique. |
| Spécifications de Gabarits blanches | Les champs SQLite sont normalisés et présentés avec leurs valeurs numériques. |
| Ancienne contrainte SQLite des Gabarits | Une migration automatique autorise la nouvelle catégorie Customer. |
| Delivery Plan limité à quelques champs | La grille contient les colonnes industrielles prévues et accepte le collage Excel. |
| CBM non automatique | Le CBM est recalculé après modification de L, H ou W. |
| Fichiers importés non ouvrables | Une passerelle Electron dédiée ouvre désormais les fichiers stockés. |
| PDF trop étroit | L’export Electron est configuré en paysage. |
| Paramètres perdus au redémarrage | Les couleurs, en-têtes et zoom sont persistants. |
| Sauvegarde trop locale | La sauvegarde globale est accessible depuis l’en-tête principal. |

## 15. Bonnes pratiques quotidiennes

Enregistrez le projet après chaque étape importante, notamment après la saisie des quantités, la génération de la Packing List et la modification du Delivery Plan. Ne déplacez pas manuellement `ruba.sqlite` pendant que Ruba est ouvert. Utilisez la fonction de dossier de stockage dans Paramètres pour choisir un emplacement adapté. Enfin, vérifiez régulièrement une restauration sur un poste de test afin de confirmer que les sauvegardes sont réellement utilisables.
