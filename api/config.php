<?php
// ==================== Configuration API Backend ====================
// Connexion à la base de données MySQL

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Gérer les requêtes OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Charger la configuration depuis config.db.json (protégé)
$configFile = __DIR__ . '/config.db.json';
$config = json_decode(file_get_contents($configFile), true);

if (!$config || !isset($config['database'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Configuration de la base de données non trouvée']);
    exit();
}

$dbConfig = $config['database'];

// Connexion à MySQL
try {
    $pdo = new PDO(
        "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['database']};charset=utf8mb4",
        $dbConfig['user'],
        $dbConfig['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Connexion à la base de données impossible: ' . $e->getMessage()]);
    exit();
}

// Fonction pour générer un UUID
function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Fonction pour envoyer une notification Discord
function sendDiscordNotification($config, $order, $action) {
    if (!isset($config['discordWebhook']) || empty($config['discordWebhook'])) {
        return;
    }

    $colors = [
        'nouvelle' => 16776960, // Jaune
        'acceptée' => 65280,    // Vert
        'en préparation' => 255, // Bleu
        'prête' => 16711680,    // Rouge
        'terminée' => 8421504,  // Gris
        'annulée' => 0          // Noir
    ];

    $itemsList = [];
    $items = json_decode($order['items'], true);
    foreach ($items as $item) {
        $itemsList[] = "• {$item['quantity']}x {$item['name']} ({$item['price']}$)";
    }

    $embed = [
        'embeds' => [[
            'title' => "🛎️ Commande #{$order['id']}",
            'description' => "**Action:** $action\n**Client:** {$order['username']}\n**Total:** {$order['totalAmount']}$",
            'color' => $colors[$action] ?? 16776960,
            'fields' => [
                [
                    'name' => '📝 Articles',
                    'value' => implode("\n", $itemsList),
                    'inline' => false
                ],
                [
                    'name' => '📊 Statut',
                    'value' => $order['status'],
                    'inline' => true
                ],
                [
                    'name' => '🕒 Date',
                    'value' => date('d/m/Y H:i', strtotime($order['createdAt'])),
                    'inline' => true
                ]
            ],
            'footer' => ['text' => 'Black Woods Restaurant']
        ]]
    ];

    if (isset($config['mentionRoleId']) && !empty($config['mentionRoleId'])) {
        $embed['content'] = "<@&{$config['mentionRoleId']}>";
    }

    $ch = curl_init($config['discordWebhook']);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($embed));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_exec($ch);
    curl_close($ch);
}

// Fonction pour valider les données
function sanitizeInput($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

function validatePIN($pin) {
    return preg_match('/^\d{4,6}$/', $pin);
}

function validateUsername($username) {
    return preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username);
}
