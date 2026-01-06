<?php
// ==================== Role Requests Endpoint ====================

global $pdo, $requestMethod, $pathParts;

switch ($requestMethod) {
    case 'GET':
        // GET /api/role-requests - Récupérer toutes les demandes de rôles
        $stmt = $pdo->query("SELECT * FROM role_requests ORDER BY createdAt DESC");
        $requests = $stmt->fetchAll();
        
        // Convertir les JSON strings en objets
        foreach ($requests as &$request) {
            $request['currentRoles'] = json_decode($request['currentRoles']);
            $request['requestedRoles'] = json_decode($request['requestedRoles']);
        }
        
        echo json_encode($requests);
        break;

    case 'POST':
        // POST /api/role-requests - Créer une nouvelle demande
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['userId']) || !isset($data['requestedRoles'])) {
            http_response_code(400);
            echo json_encode(['error' => 'userId et requestedRoles requis']);
            exit();
        }

        $id = generateUUID();
        $userId = sanitizeInput($data['userId']);
        $username = sanitizeInput($data['username']);
        $currentRoles = json_encode($data['currentRoles'] ?? []);
        $requestedRoles = json_encode($data['requestedRoles']);
        $reason = isset($data['reason']) ? sanitizeInput($data['reason']) : null;
        $status = $data['status'] ?? 'pending';

        $stmt = $pdo->prepare("INSERT INTO role_requests (id, userId, username, currentRoles, requestedRoles, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $userId, $username, $currentRoles, $requestedRoles, $reason, $status]);

        $newRequest = [
            'id' => $id,
            'userId' => $userId,
            'username' => $username,
            'currentRoles' => $data['currentRoles'] ?? [],
            'requestedRoles' => $data['requestedRoles'],
            'reason' => $reason,
            'status' => $status,
            'createdAt' => date('Y-m-d H:i:s')
        ];

        echo json_encode($newRequest);
        break;

    case 'PUT':
        // PUT /api/role-requests/{id} - Mettre à jour une demande
        if (!isset($pathParts[1])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID demande requis']);
            exit();
        }

        $requestId = sanitizeInput($pathParts[1]);
        $data = json_decode(file_get_contents('php://input'), true);

        if (isset($data['status'])) {
            $status = sanitizeInput($data['status']);
            $stmt = $pdo->prepare("UPDATE role_requests SET status = ? WHERE id = ?");
            $stmt->execute([$status, $requestId]);
        }

        echo json_encode(['success' => true, 'message' => 'Demande mise à jour']);
        break;

    case 'DELETE':
        // DELETE /api/role-requests/{id} - Supprimer une demande
        if (!isset($pathParts[1])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID demande requis']);
            exit();
        }

        $requestId = sanitizeInput($pathParts[1]);
        $stmt = $pdo->prepare("DELETE FROM role_requests WHERE id = ?");
        $stmt->execute([$requestId]);

        echo json_encode(['success' => true, 'message' => 'Demande supprimée']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        break;
}
