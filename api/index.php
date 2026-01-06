<?php
// ==================== API Router ====================
// Route toutes les requêtes vers les bons endpoints

require_once 'config.php';

// Récupérer l'URL de la requête
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Extraire le chemin de l'API
$basePath = '/api';
$path = str_replace($basePath, '', parse_url($requestUri, PHP_URL_PATH));
$path = trim($path, '/');
$pathParts = explode('/', $path);

// Router
try {
    switch ($pathParts[0]) {
        case 'health':
            echo json_encode(['status' => 'ok', 'timestamp' => time()]);
            break;

        case 'users':
            require_once 'endpoints/users.php';
            break;

        case 'menu':
            require_once 'endpoints/menu.php';
            break;

        case 'orders':
            require_once 'endpoints/orders.php';
            break;

        case 'employee-requests':
            require_once 'endpoints/employee-requests.php';
            break;

        case 'role-requests':
            require_once 'endpoints/role-requests.php';
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
