<?php
// ==================== API Router ====================
// Route toutes les requêtes vers les bons endpoints

// Récupérer l'URL de la requête
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Extraire le chemin de l'API
$basePath = '/api';
$path = str_replace($basePath, '', parse_url($requestUri, PHP_URL_PATH));
$path = trim($path, '/');
$pathParts = explode('/', $path);

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Gérer les requêtes OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Router
try {
    switch ($pathParts[0]) {
        case 'health':
            // Health check ne nécessite pas de connexion DB
            echo json_encode(['status' => 'ok', 'timestamp' => time()]);
            break;

        case 'users':
        case 'menu':
        case 'orders':
        case 'employee-requests':
        case 'role-requests':
            // Ces endpoints nécessitent la config et la connexion DB
            require_once 'config.php';
            require_once 'endpoints/' . $pathParts[0] . '.php';
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint non trouvé']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
