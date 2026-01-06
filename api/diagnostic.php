<?php
// ==================== Diagnostic API ====================
// Fichier de diagnostic à supprimer après déploiement

header('Content-Type: application/json');

$diagnostic = [
    'timestamp' => date('Y-m-d H:i:s'),
    'checks' => []
];

// 1. Vérifier PHP version
$diagnostic['checks']['php_version'] = [
    'status' => version_compare(PHP_VERSION, '7.4.0', '>=') ? 'OK' : 'FAIL',
    'value' => PHP_VERSION,
    'required' => '7.4.0+'
];

// 2. Vérifier PDO MySQL
$diagnostic['checks']['pdo_mysql'] = [
    'status' => extension_loaded('pdo_mysql') ? 'OK' : 'FAIL',
    'message' => extension_loaded('pdo_mysql') ? 'Extension PDO MySQL chargée' : 'Extension PDO MySQL manquante'
];

// 3. Vérifier fichier config
$configFile = __DIR__ . '/config.db.json';
$diagnostic['checks']['config_file'] = [
    'status' => file_exists($configFile) ? 'OK' : 'FAIL',
    'path' => $configFile,
    'exists' => file_exists($configFile),
    'readable' => file_exists($configFile) ? is_readable($configFile) : false
];

// 4. Si le fichier existe, vérifier son contenu
if (file_exists($configFile)) {
    $config = json_decode(file_get_contents($configFile), true);
    $diagnostic['checks']['config_content'] = [
        'status' => (isset($config['database']) && isset($config['database']['host'])) ? 'OK' : 'FAIL',
        'has_database' => isset($config['database']),
        'has_host' => isset($config['database']['host']) ?? false,
        'has_user' => isset($config['database']['user']) ?? false,
        'has_password' => isset($config['database']['password']) ?? false
    ];
    
    // 5. Tester connexion MySQL
    if (isset($config['database'])) {
        try {
            $db = $config['database'];
            $dsn = "mysql:host={$db['host']};port={$db['port']};dbname={$db['database']};charset=utf8mb4";
            $pdo = new PDO($dsn, $db['user'], $db['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
            
            // Tester une requête simple
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
            $result = $stmt->fetch();
            
            $diagnostic['checks']['mysql_connection'] = [
                'status' => 'OK',
                'host' => $db['host'],
                'database' => $db['database'],
                'users_count' => $result['count']
            ];
        } catch (PDOException $e) {
            $diagnostic['checks']['mysql_connection'] = [
                'status' => 'FAIL',
                'error' => $e->getMessage()
            ];
        }
    }
} else {
    $diagnostic['checks']['config_content'] = [
        'status' => 'SKIP',
        'message' => 'Fichier de configuration manquant'
    ];
}

// 6. Vérifier mod_rewrite
$diagnostic['checks']['mod_rewrite'] = [
    'status' => function_exists('apache_get_modules') ? (in_array('mod_rewrite', apache_get_modules()) ? 'OK' : 'FAIL') : 'UNKNOWN',
    'message' => function_exists('apache_get_modules') ? 
        (in_array('mod_rewrite', apache_get_modules()) ? 'mod_rewrite activé' : 'mod_rewrite non activé') :
        'Impossible de vérifier (fonction apache_get_modules non disponible)'
];

// 7. Vérifier .htaccess
$htaccess = __DIR__ . '/../.htaccess';
$diagnostic['checks']['htaccess'] = [
    'status' => file_exists($htaccess) ? 'OK' : 'FAIL',
    'path' => $htaccess,
    'exists' => file_exists($htaccess)
];

// 8. Vérifier les endpoints
$endpoints = ['users', 'menu', 'orders', 'employee-requests', 'role-requests'];
$diagnostic['checks']['endpoints'] = [];
foreach ($endpoints as $endpoint) {
    $file = __DIR__ . '/endpoints/' . $endpoint . '.php';
    $diagnostic['checks']['endpoints'][$endpoint] = [
        'status' => file_exists($file) ? 'OK' : 'FAIL',
        'exists' => file_exists($file)
    ];
}

// Résumé
$allOk = true;
foreach ($diagnostic['checks'] as $check) {
    if (is_array($check) && isset($check['status']) && $check['status'] === 'FAIL') {
        $allOk = false;
        break;
    }
}

$diagnostic['summary'] = [
    'all_checks_passed' => $allOk,
    'ready_for_production' => $allOk,
    'message' => $allOk ? 'Tous les tests sont passés ! API prête.' : 'Certains tests ont échoué. Consultez les détails ci-dessus.'
];

echo json_encode($diagnostic, JSON_PRETTY_PRINT);
