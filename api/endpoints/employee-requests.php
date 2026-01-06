<?php
// ==================== Employee Requests Endpoint ====================

global $pdo, $requestMethod, $pathParts;

switch ($requestMethod) {
    case 'GET':
        // GET /api/employee-requests - Récupérer toutes les demandes
        $stmt = $pdo->query("SELECT * FROM employee_requests ORDER BY createdAt DESC");
        $requests = $stmt->fetchAll();
        
        // Convertir les JSON strings en objets
        foreach ($requests as &$request) {
            $request['requestedRoles'] = json_decode($request['requestedRoles']);
        }
        
        echo json_encode($requests);
        break;

    case 'POST':
        // POST /api/employee-requests - Créer une nouvelle demande
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['userId']) || !isset($data['requestedRoles'])) {
            http_response_code(400);
            echo json_encode(['error' => 'userId et requestedRoles requis']);
            exit();
        }

        $id = generateUUID();
        $userId = sanitizeInput($data['userId']);
        $username = sanitizeInput($data['username']);
        $requestedRoles = json_encode($data['requestedRoles']);
        $motivation = isset($data['motivation']) ? sanitizeInput($data['motivation']) : null;
        $status = $data['status'] ?? 'pending';

        $stmt = $pdo->prepare("INSERT INTO employee_requests (id, userId, username, requestedRoles, motivation, status) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $userId, $username, $requestedRoles, $motivation, $status]);

        $newRequest = [
            'id' => $id,
            'userId' => $userId,
            'username' => $username,
            'requestedRoles' => $data['requestedRoles'],
            'motivation' => $motivation,
            'status' => $status,
            'createdAt' => date('Y-m-d H:i:s')
        ];

        echo json_encode($newRequest);
        break;

    case 'PUT':
        // PUT /api/employee-requests/{id} - Mettre à jour une demande
        if (!isset($pathParts[1])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID demande requis']);
            exit();
        }

        $requestId = sanitizeInput($pathParts[1]);
        $data = json_decode(file_get_contents('php://input'), true);

        if (isset($data['status'])) {
            $status = sanitizeInput($data['status']);
            $stmt = $pdo->prepare("UPDATE employee_requests SET status = ? WHERE id = ?");
            $stmt->execute([$status, $requestId]);
        }

        echo json_encode(['success' => true, 'message' => 'Demande mise à jour']);
        break;

    case 'DELETE':
        // DELETE /api/employee-requests/{id} - Supprimer une demande
        if (!isset($pathParts[1])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID demande requis']);
            exit();
        }

        $requestId = sanitizeInput($pathParts[1]);
        $stmt = $pdo->prepare("DELETE FROM employee_requests WHERE id = ?");
        $stmt->execute([$requestId]);

        echo json_encode(['success' => true, 'message' => 'Demande supprimée']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        break;
}
