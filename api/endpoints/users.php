<?php
// ==================== Users Endpoint ====================

global $pdo, $requestMethod, $pathParts;

switch ($requestMethod) {
    case 'GET':
        // GET /api/users - Récupérer tous les utilisateurs
        $stmt = $pdo->query("SELECT id, username, pin, role, roles, personalInfo, createdAt, updatedAt FROM users ORDER BY createdAt DESC");
        $users = $stmt->fetchAll();
        
        // Convertir les JSON strings en objets
        foreach ($users as &$user) {
            $user['roles'] = $user['roles'] ? json_decode($user['roles']) : [];
            $user['personalInfo'] = $user['personalInfo'] ? json_decode($user['personalInfo']) : null;
        }
        
        echo json_encode($users);
        break;

    case 'POST':
        // POST /api/users - Créer un nouvel utilisateur
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['username']) || !isset($data['pin'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Username et PIN requis']);
            exit();
        }

        $username = sanitizeInput($data['username']);
        $pin = sanitizeInput($data['pin']);
        $role = $data['role'] ?? 'client';
        $roles = isset($data['roles']) ? json_encode($data['roles']) : null;
        $personalInfo = isset($data['personalInfo']) ? json_encode($data['personalInfo']) : null;

        if (!validateUsername($username)) {
            http_response_code(400);
            echo json_encode(['error' => 'Username invalide']);
            exit();
        }

        if (!validatePIN($pin)) {
            http_response_code(400);
            echo json_encode(['error' => 'PIN invalide (4-6 chiffres requis)']);
            exit();
        }

        // Vérifier si l'utilisateur existe déjà
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Ce nom d\'utilisateur existe déjà']);
            exit();
        }

        // Créer l'utilisateur
        $id = generateUUID();
        $stmt = $pdo->prepare("INSERT INTO users (id, username, pin, role, roles, personalInfo) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $username, $pin, $role, $roles, $personalInfo]);

        $newUser = [
            'id' => $id,
            'username' => $username,
            'pin' => $pin,
            'role' => $role,
            'roles' => $data['roles'] ?? [],
            'personalInfo' => $data['personalInfo'] ?? null
        ];

        echo json_encode($newUser);
        break;

    case 'PUT':
        // PUT /api/users/{id} - Mettre à jour un utilisateur
        if (!isset($pathParts[1])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID utilisateur requis']);
            exit();
        }

        $userId = sanitizeInput($pathParts[1]);
        $data = json_decode(file_get_contents('php://input'), true);

        // Construire la requête de mise à jour
        $updates = [];
        $params = [];

        if (isset($data['pin'])) {
            if (!validatePIN($data['pin'])) {
                http_response_code(400);
                echo json_encode(['error' => 'PIN invalide']);
                exit();
            }
            $updates[] = "pin = ?";
            $params[] = sanitizeInput($data['pin']);
        }

        if (isset($data['role'])) {
            $updates[] = "role = ?";
            $params[] = sanitizeInput($data['role']);
        }

        if (isset($data['roles'])) {
            $updates[] = "roles = ?";
            $params[] = json_encode($data['roles']);
        }

        if (isset($data['personalInfo'])) {
            $updates[] = "personalInfo = ?";
            $params[] = json_encode($data['personalInfo']);
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['error' => 'Aucune donnée à mettre à jour']);
            exit();
        }

        $params[] = $userId;
        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Utilisateur mis à jour']);
        break;

    case 'DELETE':
        // DELETE /api/users/{id} - Supprimer un utilisateur
        if (!isset($pathParts[1])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID utilisateur requis']);
            exit();
        }

        $userId = sanitizeInput($pathParts[1]);
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);

        echo json_encode(['success' => true, 'message' => 'Utilisateur supprimé']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        break;
}
