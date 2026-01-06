#!/bin/bash
# ==================== Black Woods - Déploiement ====================
# Script de déploiement sur le serveur de production

echo "🌲 Black Woods - Déploiement sur le serveur"
echo "============================================"
echo ""

# Vérifier si nous sommes dans le bon répertoire
if [ ! -f "api/index.php" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

echo "✓ Répertoire correct détecté"

# Vérifier si api/config.db.json existe
if [ ! -f "api/config.db.json" ]; then
    echo "⚠️  Fichier api/config.db.json manquant"
    echo "📝 Création du fichier de configuration..."
    
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
    
    echo "✓ Fichier api/config.db.json créé"
fi

# Vérifier les permissions
echo "📝 Vérification des permissions..."

if [ -w "api/config.db.json" ]; then
    chmod 600 api/config.db.json
    echo "✓ Permissions de api/config.db.json sécurisées (600)"
fi

# Vérifier Apache
echo "📝 Vérification de la configuration Apache..."

if [ -f ".htaccess" ]; then
    echo "✓ Fichier .htaccess présent"
else
    echo "⚠️  Fichier .htaccess manquant"
fi

# Tester l'API
echo "📝 Test de l'API..."

if command -v curl &> /dev/null; then
    echo "Test du endpoint /api/health..."
    RESPONSE=$(curl -s -w "%{http_code}" http://localhost/api/health -o /tmp/health_response.json)
    
    if [ "$RESPONSE" = "200" ]; then
        echo "✓ API accessible (HTTP 200)"
        cat /tmp/health_response.json
        echo ""
    else
        echo "⚠️  API retourne HTTP $RESPONSE"
        cat /tmp/health_response.json
        echo ""
    fi
    rm -f /tmp/health_response.json
fi

echo ""
echo "✅ Déploiement terminé !"
echo ""
echo "📋 Checklist de déploiement:"
echo "  [ ] Fichier api/config.db.json créé avec les bons credentials"
echo "  [ ] Base de données importée (database/setup.sql)"
echo "  [ ] mod_rewrite activé dans Apache"
echo "  [ ] Permissions des fichiers correctes"
echo "  [ ] HTTPS configuré"
echo "  [ ] Tests de l'API effectués"
echo ""
