<?php
// ==================== Menu Endpoint ====================

global $pdo, $requestMethod, $pathParts;

switch ($requestMethod) {
    case 'GET':
        // GET /api/menu - Récupérer tous les items du menu
        $stmt = $pdo->query("SELECT * FROM menu ORDER BY category, name");
        $menu = $stmt->fetchAll();
        echo json_encode($menu);
        break;

    case 'POST':
        // POST /api/menu - Ajouter un item au menu
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['name']) || !isset($data['price']) || !isset($data['category'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Nom, prix et catégorie requis']);
            exit();
        }

        $id = generateUUID();
        $name = sanitizeInput($data['name']);
        $price = floatval($data['price']);
        $category = sanitizeInput($data['category']);
        $available = $data['available'] ?? true;
        $description = isset($data['description']) ? sanitizeInput($data['description']) : null;
        $image = isset($data['image']) ? sanitizeInput($data['image']) : null;

        $stmt = $pdo->prepare("INSERT INTO menu (id, name, price, category, available, description, image) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $name, $price, $category, $available ? 1 : 0, $description, $image]);

        $newItem = [
            'id' => $id,
            'name' => $name,
            'price' => $price,
            'category' => $category,
            'available' => $available,
            'description' => $description,
            'image' => $image
        ];

        echo json_encode($newItem);
        break;

    case 'PUT':
        // PUT /api/menu/{id} - Mettre à jour un item du menu
        if (!isset($pathParts[1])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID item requis']);
            exit();
        }

        $itemId = sanitizeInput($pathParts[1]);
        $data = json_decode(file_get_contents('php://input'), true);

        $updates = [];
        $params = [];

        if (isset($data['name'])) {
            $updates[] = "name = ?";
            $params[] = sanitizeInput($data['name']);
        }

        if (isset($data['price'])) {
            $updates[] = "price = ?";
            $params[] = floatval($data['price']);
        }

        if (isset($data['category'])) {
            $updates[] = "category = ?";
            $params[] = sanitizeInput($data['category']);
        }

        if (isset($data['available'])) {
            $updates[] = "available = ?";
            $params[] = $data['available'] ? 1 : 0;
        }

        if (isset($data['description'])) {
            $updates[] = "description = ?";
            $params[] = sanitizeInput($data['description']);
        }

        if (isset($data['image'])) {
            $updates[] = "image = ?";
            $params[] = sanitizeInput($data['image']);
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['error' => 'Aucune donnée à mettre à jour']);
            exit();
        }

        $params[] = $itemId;
        $sql = "UPDATE menu SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Item mis à jour']);
        break;

    case 'DELETE':
        // DELETE /api/menu/{id} - Supprimer un item du menu
        if (!isset($pathParts[1])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID item requis']);
            exit();
        }

        $itemId = sanitizeInput($pathParts[1]);
        $stmt = $pdo->prepare("DELETE FROM menu WHERE id = ?");
        $stmt->execute([$itemId]);

        echo json_encode(['success' => true, 'message' => 'Item supprimé']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        break;
}
