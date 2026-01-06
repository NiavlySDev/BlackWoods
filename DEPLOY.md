# 🚀 Déploiement Black Woods sur le serveur

## Erreur actuelle

```
GET http://blackwood.tfe91.fr/api/health 500 (Internal Server Error)
```

**Cause**: Le fichier `api/config.db.json` n'existe pas sur le serveur.

## 📋 Checklist de déploiement

### 1. Copier le fichier de configuration

Créez le fichier `api/config.db.json` sur le serveur avec le contenu suivant :

```json
{
    "database": {
        "host": "we01io.myd.infomaniak.com",
        "port": 3306,
        "database": "we01io_blackwood",
        "user": "we01io_blackwood",
        "password": "BlAcKwOdSbDd2025."
    },
    "discordWebhook": "https://discord.com/api/webhooks/1457860920427679877/z55d5hwAdqrs2_JdAY5gxbgSWT3dQ_gPkFneQTBTAQGMFpF-Lwd31jGg2lukbG8iFFup",
    "mentionRoleId": "1457800740067344464"
}
```

**Commandes SSH:**
```bash
cd /path/to/blackwood.tfe91.fr
cat > api/config.db.json << 'EOF'
{
    "database": {
        "host": "we01io.myd.infomaniak.com",
        "port": 3306,
        "database": "we01io_blackwood",
        "user": "we01io_blackwood",
        "password": "BlAcKwOdSbDd2025."
    },
    "discordWebhook": "https://discord.com/api/webhooks/1457860920427679877/z55d5hwAdqrs2_JdAY5gxbgSWT3dQ_gPkFneQTBTAQGMFpF-Lwd31jGg2lukbG8iFFup",
    "mentionRoleId": "1457800740067344464"
}
EOF

# Sécuriser les permissions
chmod 600 api/config.db.json
```

### 2. Vérifier que tous les fichiers sont présents

```bash
# Fichiers API
ls -la api/
# Devrait afficher:
# - index.php
# - config.php
# - config.db.json ← IMPORTANT
# - endpoints/
```

### 3. Tester l'API

```bash
# Test simple
curl http://blackwood.tfe91.fr/api/health

# Devrait retourner:
# {"status":"ok","timestamp":1736183280}
```

### 4. Importer la base de données

Si ce n'est pas déjà fait:

```bash
mysql -h we01io.myd.infomaniak.com -P 3306 -u we01io_blackwood -p we01io_blackwood < database/setup.sql
# Mot de passe: BlAcKwOdSbDd2025.
```

### 5. Vérifier Apache

Assurez-vous que:
- `mod_rewrite` est activé
- Le fichier `.htaccess` est bien chargé
- `AllowOverride All` est configuré dans le VirtualHost

**Vérifier mod_rewrite:**
```bash
apache2ctl -M | grep rewrite
# Devrait afficher: rewrite_module (shared)
```

**Si pas activé:**
```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### 6. Vérifier les permissions

```bash
# Permissions recommandées
chmod 755 api/
chmod 644 api/*.php
chmod 600 api/config.db.json
chmod 644 .htaccess
```

### 7. Activer les logs d'erreur PHP

Pour déboguer si ça ne marche toujours pas:

```bash
# Voir les logs Apache
tail -f /var/log/apache2/error.log

# Ou selon la config
tail -f /var/log/httpd/error_log
```

## 🔍 Diagnostic des erreurs

### Erreur 500 sur /api/health

**Causes possibles:**
1. ❌ Fichier `api/config.db.json` manquant → **CAUSE ACTUELLE**
2. ❌ Erreur PHP dans `api/index.php`
3. ❌ Permissions incorrectes
4. ❌ mod_rewrite pas activé

**Solution:**
```bash
# Créer le fichier config.db.json (voir étape 1)
# Puis tester:
curl http://blackwood.tfe91.fr/api/health
```

### Erreur 404 sur /api/*

**Causes possibles:**
1. ❌ mod_rewrite pas activé
2. ❌ .htaccess pas chargé
3. ❌ Mauvaise configuration Apache

**Solution:**
```bash
# Vérifier .htaccess
cat .htaccess

# Activer mod_rewrite
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### Erreur de connexion MySQL

**Causes possibles:**
1. ❌ Credentials incorrects dans config.db.json
2. ❌ MySQL pas accessible depuis le serveur web
3. ❌ Pare-feu bloque le port 3306

**Solution:**
```bash
# Tester la connexion MySQL
mysql -h we01io.myd.infomaniak.com -P 3306 -u we01io_blackwood -p
# Si ça ne marche pas, contactez votre hébergeur
```

## 🎯 Test complet de l'API

Une fois le fichier `config.db.json` créé:

```bash
# 1. Health check
curl http://blackwood.tfe91.fr/api/health
# Attendu: {"status":"ok","timestamp":...}

# 2. Liste des utilisateurs
curl http://blackwood.tfe91.fr/api/users
# Attendu: [{"id":"admin-001","username":"admin",...}]

# 3. Liste du menu
curl http://blackwood.tfe91.fr/api/menu
# Attendu: [{"id":"menu-001","name":"Burger Classic",...}]
```

## 📞 En cas de problème

1. Consultez les logs: `tail -f /var/log/apache2/error.log`
2. Vérifiez les permissions: `ls -la api/`
3. Testez PHP: `php -v` et `php -m | grep pdo_mysql`
4. Vérifiez Apache: `apache2ctl -t`

---

**Note**: Une fois le fichier `api/config.db.json` créé sur le serveur, 
l'erreur 500 devrait disparaître et l'API devrait fonctionner. ✅
