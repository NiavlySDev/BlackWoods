# 📋 Configuration Files - Black Woods Restaurant

## Vue d'ensemble

Le projet Black Woods utilise **deux systèmes de configuration distincts** :

### 1️⃣ Configuration Backend (PHP/MySQL)
**Fichiers :** `api/config.db.json` et `api/config.db.json.example`

### 2️⃣ Configuration Frontend (JavaScript)
**Fichiers :** `assets/config.json` et `assets/config.example.json`

---

## 🔧 Configuration Backend - `api/config.db.json`

### 📍 Emplacement
```
api/config.db.json
```

### 🎯 Utilisation
- Connexion à la base de données MySQL
- Configuration des webhooks Discord
- Paramètres de sécurité de l'API
- Configuration de l'environnement serveur

### 📝 Structure
```json
{
    "database": {
        "host": "we01io.myd.infomaniak.com",
        "port": 3306,
        "database": "we01io_blackwood",
        "user": "we01io_blackwood",
        "password": "VotreMotDePasse"
    },
    "discordWebhook": "https://discord.com/api/webhooks/...",
    "mentionRoleId": "123456789",
    "app": {
        "name": "Black Woods Restaurant",
        "environment": "production",
        "debug": false,
        "timezone": "Europe/Paris"
    },
    "security": {
        "sessionTimeout": 3600,
        "maxLoginAttempts": 5,
        "tokenExpiration": 86400
    },
    "api": {
        "version": "1.0.0",
        "rateLimit": {
            "enabled": true,
            "maxRequests": 100,
            "windowMinutes": 15
        }
    }
}
```

### ⚠️ Sécurité
- ✅ Fichier **IGNORÉ** dans `.gitignore`
- ✅ Ne **JAMAIS** le commiter sur Git
- ✅ Contient des **informations sensibles** (mot de passe DB)

### 📁 Fichier d'exemple
`api/config.db.json.example` - Version sans informations sensibles pour partage

---

## 🎨 Configuration Frontend - `assets/config.json`

### 📍 Emplacement
```
assets/config.json
```

### 🎯 Utilisation
- Configuration de l'interface utilisateur
- Paramètres de l'application côté client
- Options d'affichage et de comportement
- **Note :** Actuellement chargé mais peu utilisé dans le code

### 📝 Structure
```json
{
    "app": {
        "name": "Black Woods Restaurant",
        "version": "1.0.0",
        "environment": "production"
    },
    "api": {
        "baseUrl": "/api",
        "timeout": 30000
    },
    "features": {
        "discordNotifications": true,
        "autoRefresh": true,
        "refreshInterval": 30000
    },
    "ui": {
        "theme": "dark",
        "language": "fr",
        "itemsPerPage": 20
    }
}
```

### 🔓 Sécurité
- ✅ Fichier **IGNORÉ** dans `.gitignore`
- ✅ Ne contient **PAS** d'informations sensibles
- ℹ️ Peut être partagé mais mieux vaut l'ignorer pour éviter les conflits

### 📁 Fichier d'exemple
`assets/config.example.json` - Version identique pour référence

---

## 📂 Où sont utilisés ces fichiers ?

### Backend (`api/config.db.json`)
✅ **Utilisé par :**
- `api/config.php` - Connexion MySQL et fonctions utilitaires
- `api/endpoints/*.php` - Tous les endpoints de l'API
- `api/diagnostic.php` - Tests de configuration

### Frontend (`assets/config.json`)
⚠️ **Chargé par :**
- `assets/js/database.js` - Classe Database (ligne 30)

ℹ️ **Note :** Actuellement, le fichier est chargé mais **très peu utilisé**. La configuration est principalement stockée dans `this.config` mais n'est pas exploitée dans le reste du code. Amélioration possible !

---

## 🚀 Installation / Déploiement

### Première installation

1. **Copier les fichiers d'exemple :**
   ```bash
   # Backend
   cp api/config.db.json.example api/config.db.json
   
   # Frontend
   cp assets/config.example.json assets/config.json
   ```

2. **Éditer `api/config.db.json` :**
   - Remplacer les informations de connexion MySQL
   - Ajouter le webhook Discord (optionnel)
   - Configurer les paramètres selon l'environnement

3. **Éditer `assets/config.json` (optionnel) :**
   - Ajuster les paramètres d'interface si nécessaire
   - Par défaut, les valeurs conviennent

### Vérification

```bash
# Tester la configuration backend
curl http://votre-site.com/api/diagnostic.php

# Vérifier les fichiers
ls -la api/config.db.json
ls -la assets/config.json
```

---

## 🔐 Fichiers dans `.gitignore`

```gitignore
# Configuration sensible
assets/config.json
config.json
api/config.db.json
.env
```

---

## 💡 Recommandations

### Pour le développement
- Garder `config.db.json.example` et `config.example.json` à jour
- Documenter tout nouveau paramètre ajouté
- Tester la configuration avec `api/diagnostic.php`

### Pour la production
- Utiliser `"debug": false` dans `config.db.json`
- Configurer un webhook Discord pour les notifications
- Activer le rate limiting dans l'API
- Supprimer `api/diagnostic.php` après déploiement

### Améliorations possibles
- Utiliser davantage `assets/config.json` dans le frontend
- Centraliser les paramètres UI (theme, langue, etc.)
- Implémenter un système de cache pour la config
- Ajouter validation des configs au démarrage

---

## 📞 Support

En cas de problème de configuration :
1. Vérifier que les fichiers existent et sont lisibles
2. Utiliser `api/diagnostic.php` pour identifier le problème
3. Consulter les logs PHP du serveur
4. Vérifier la console JavaScript du navigateur

---

**Date de dernière mise à jour :** 18 janvier 2026
