# Black Woods - Structure du Projet

## 📁 Structure des Dossiers

```
BlackWoods/
│
├── home/
│   └── index.html                  # Page d'accueil
│
├── client/
│   ├── client.html                 # Panel client
│   ├── client.css                  # Styles du panel client
│   └── client.js                   # Logique du panel client
│
├── employee/
│   ├── employee.html               # Panel employé/admin
│   ├── employee.css                # Styles du panel employé
│   └── employee.js                 # Logique du panel employé
│
├── login/
│   ├── login.html                  # Page de connexion
│   ├── login.css                   # Styles de la page de connexion
│   └── login.js                    # Logique de connexion
│
├── register/
│   ├── register.html               # Page d'inscription
│   ├── register.css                # Styles de la page d'inscription
│   └── register.js                 # Logique d'inscription
│
├── pages/
│   ├── mentions-legales.html       # Mentions légales
│   ├── reglements.html             # Règlements
│   └── pages.css                   # Styles des pages légales
│
├── assets/
│   ├── css/
│   │   └── styles.css              # Styles globaux (partagés)
│   ├── js/
│   │   ├── database.js             # Système de base de données
│   │   └── script.js               # Scripts globaux
│   └── config.json                 # Configuration
│
└── tasks.md                        # Liste des tâches du projet

```

## 🎯 Organisation du Code

### Principe de séparation
Chaque module de l'application (client, employee, login, register) est maintenant dans son propre dossier avec:
- **HTML**: Structure de la page
- **CSS**: Styles spécifiques au module (extraits des balises `<style>`)
- **JS**: Logique spécifique au module (extraite des balises `<script>`)

### Fichiers partagés
Les fichiers communs à toute l'application sont dans le dossier `assets/`:
- **styles.css**: Variables CSS, styles de base, composants réutilisables
- **database.js**: Gestion de la base de données (localStorage)
- **script.js**: Scripts globaux (animations, navigation)
- **config.json**: Configuration de l'application

## 🔗 Chemins Relatifs

### Depuis un module (client/, employee/, login/, register/, pages/)
- CSS global: `../assets/css/styles.css`
- JS global: `../assets/js/database.js` ou `../assets/js/script.js`
- Autre module: `../nom_module/fichier.html`
- Home: `../home/index.html`

### Exemple de liens
```html
<!-- Dans client/client.html -->
<link rel="stylesheet" href="../assets/css/styles.css">
<link rel="stylesheet" href="client.css">
<script src="../assets/js/database.js"></script>
<script src="client.js"></script>
<a href="../home/index.html">Accueil</a>
<a href="../login/login.html">Se connecter</a>
```

## 🚀 Démarrage

Pour lancer le projet, ouvrez simplement le fichier `home/index.html` dans votre navigateur.

## ✨ Avantages de cette Structure

1. **Modularité**: Chaque fonctionnalité est isolée dans son propre dossier
2. **Maintenabilité**: Plus facile de trouver et modifier le code
3. **Clarté**: La structure reflète l'architecture de l'application
4. **Séparation des responsabilités**: HTML/CSS/JS séparés
5. **Réutilisabilité**: Les fichiers communs sont centralisés dans assets/

## 📝 Notes

- Les anciens fichiers à la racine (client.html, employee.html, etc.) peuvent être supprimés
- Le script `extract_and_reorganize.py` a été utilisé pour la migration
- Tous les liens ont été mis à jour pour refléter la nouvelle structure
