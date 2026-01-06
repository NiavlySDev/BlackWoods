<?php
// ==================== Orders Endpoint ====================

global $pdo, $requestMethod, $pathParts, $config;

switch ($requestMethod) {
    case 'GET':
        // GET /api/orders - Récupérer toutes les commandes
        $stmt = $pdo->query("SELECT * FROM orders ORDER BY createdAt DESC");
        $orders = $stmt->fetchAll();
        
        // Convertir les JSON strings en objets
        foreach ($orders as &$order) {
            $order['items'] = json_decode($order['items']);
            $order['assignedTo'] = $order['assignedTo'] ? json_decode($order['assignedTo']) : null;
        }
        
        echo json_encode($orders);
        break;

    case 'POST':
        // POST /api/orders - Créer une nouvelle commande
        if (isset($pathParts[1]) && isset($pathParts[2]) && $pathParts[2] === 'status') {
            // POST /api/orders/{id}/status - Mettre à jour le statut
            if (!isset($pathParts[1])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID commande requis']);
                exit();
            }

            $orderId = sanitizeInput($pathParts[1]);
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['status'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Statut requis']);
                exit();
            }

            $status = sanitizeInput($data['status']);
            $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
            $stmt->execute([$status, $orderId]);

            // Récupérer la commande mise à jour
            $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch();
            $order['items'] = json_decode($order['items']);
            $order['assignedTo'] = $order['assignedTo'] ? json_decode($order['assignedTo']) : null;

            // Envoyer notification Discord
            $statusMap = [
                'pending' => 'nouvelle',
                'accepted' => 'acceptée',
                'preparing' => 'en préparation',
                'ready' => 'prête',
                'completed' => 'terminée',
                'cancelled' => 'annulée'
            ];
            sendDiscordNotification($config, $order, $statusMap[$status] ?? $status);

            echo json_encode($order);
            break;
        }

        // Créer une nouvelle commande
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['userId']) || !isset($data['items']) || !isset($data['totalAmount'])) {
            http_response_code(400);
            echo json_encode(['error' => 'userId, items et totalAmount requis']);
            exit();
        }

        $id = generateUUID();
        $userId = sanitizeInput($data['userId']);
        $username = sanitizeInput($data['username']);
        $items = json_encode($data['items']);
        $totalAmount = floatval($data['totalAmount']);
        $status = $data['status'] ?? 'pending';
        $orderType = sanitizeInput($data['orderType'] ?? 'delivery');
        $assignedTo = isset($data['assignedTo']) ? json_encode($data['assignedTo']) : null;

        $stmt = $pdo->prepare("INSERT INTO orders (id, userId, username, items, totalAmount, status, orderType, assignedTo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $userId, $username, $items, $totalAmount, $status, $orderType, $assignedTo]);

        $newOrder = [
            'id' => $id,
            'userId' => $userId,
            'username' => $username,
            'items' => $data['items'],
            'totalAmount' => $totalAmount,
            'status' => $status,
            'orderType' => $orderType,
            'assignedTo' => $data['assignedTo'] ?? null,
            'createdAt' => date('Y-m-d H:i:s')
        ];

        // Envoyer notification Discord
        sendDiscordNotification($config, $newOrder, 'nouvelle');

        echo json_encode($newOrder);
        break;

    case 'PUT':
        // PUT /api/orders/{id}/status - Mettre à jour le statut
        if (!isset($pathParts[1]) || !isset($pathParts[2]) || $pathParts[2] !== 'status') {
            http_response_code(400);
            echo json_encode(['error' => 'Route invalide']);
            exit();
        }

        $orderId = sanitizeInput($pathParts[1]);
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['status'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Statut requis']);
            exit();
        }

        $status = sanitizeInput($data['status']);
        $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
        $stmt->execute([$status, $orderId]);

        // Récupérer la commande mise à jour
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        $order['items'] = json_decode($order['items']);
        $order['assignedTo'] = $order['assignedTo'] ? json_decode($order['assignedTo']) : null;

        // Envoyer notification Discord
        $statusMap = [
            'pending' => 'nouvelle',
            'accepted' => 'acceptée',
            'preparing' => 'en préparation',
            'ready' => 'prête',
            'completed' => 'terminée',
            'cancelled' => 'annulée'
        ];
        sendDiscordNotification($config, $order, $statusMap[$status] ?? $status);

        echo json_encode($order);
        break;

    case 'DELETE':
        // DELETE /api/orders/{id} - Supprimer une commande
        if (!isset($pathParts[1])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID commande requis']);
            exit();
        }

        $orderId = sanitizeInput($pathParts[1]);
        $stmt = $pdo->prepare("DELETE FROM orders WHERE id = ?");
        $stmt->execute([$orderId]);

        echo json_encode(['success' => true, 'message' => 'Commande supprimée']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        break;
}
