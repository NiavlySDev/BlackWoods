-- ==================== BLACK WOODS DATABASE SETUP ====================
-- Base de données MySQL pour le site Black Woods
-- Serveur: we01io.myd.infomaniak.com:3306
-- Base: we01io_blackwood
-- User: we01io_blackwood

-- Utiliser la base de données
USE we01io_blackwood;

-- ==================== TABLE: users ====================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    pin VARCHAR(6) NOT NULL,
    role VARCHAR(20) NOT NULL,
    roles JSON DEFAULT NULL,
    personalInfo JSON DEFAULT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLE: menu ====================
CREATE TABLE IF NOT EXISTS menu (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    description TEXT,
    image VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_available (available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLE: orders ====================
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    username VARCHAR(50) NOT NULL,
    items JSON NOT NULL,
    totalAmount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    orderType VARCHAR(20) NOT NULL,
    assignedTo JSON DEFAULT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_status (status),
    INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLE: employee_requests ====================
CREATE TABLE IF NOT EXISTS employee_requests (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    username VARCHAR(50) NOT NULL,
    requestedRoles JSON NOT NULL,
    motivation TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLE: role_requests ====================
CREATE TABLE IF NOT EXISTS role_requests (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    username VARCHAR(50) NOT NULL,
    currentRoles JSON NOT NULL,
    requestedRoles JSON NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== DONNÉES PAR DÉFAUT ====================

-- Utilisateur admin par défaut
INSERT INTO users (id, username, pin, role, personalInfo) VALUES 
('admin-001', 'admin', '123456', 'admin', '{"firstName":"Système","lastName":"Administrateur","age":"","address":"","gameId":"","phone":"","discord":""}')
ON DUPLICATE KEY UPDATE pin='123456', role='admin';

-- Utilisateur employé par défaut
INSERT INTO users (id, username, pin, role, roles, personalInfo) VALUES 
('employee-001', 'employee', '654321', 'employee', '["cuisine", "service"]', '{"firstName":"Test","lastName":"Employé","age":"25","address":"","gameId":"","phone":"","discord":""}')
ON DUPLICATE KEY UPDATE pin='654321', role='employee', roles='["cuisine", "service"]';

-- Utilisateur client par défaut
INSERT INTO users (id, username, pin, role, personalInfo) VALUES 
('client-001', 'client', '111111', 'client', '{"firstName":"Test","lastName":"Client","age":"30","address":"123 Rue Test","gameId":"12345","phone":"0612345678","discord":"test#1234"}')
ON DUPLICATE KEY UPDATE pin='111111', role='client';

-- Menu par défaut
INSERT INTO menu (id, name, price, category, available, description) VALUES 
('menu-001', 'Burger Classic', 12.99, 'plats', TRUE, 'Burger avec steak, salade, tomate, oignons'),
('menu-002', 'Pizza Margherita', 10.99, 'plats', TRUE, 'Pizza tomate, mozzarella, basilic'),
('menu-003', 'Salade César', 9.99, 'entrees', TRUE, 'Salade romaine, poulet, parmesan, croûtons'),
('menu-004', 'Tiramisu', 6.99, 'desserts', TRUE, 'Dessert italien au café'),
('menu-005', 'Coca-Cola', 2.99, 'boissons', TRUE, 'Boisson gazeuse 33cl'),
('menu-006', 'Eau Minérale', 1.99, 'boissons', TRUE, 'Eau minérale 50cl')
ON DUPLICATE KEY UPDATE 
    name=VALUES(name), 
    price=VALUES(price), 
    category=VALUES(category), 
    available=VALUES(available), 
    description=VALUES(description);

-- ==================== VUES UTILES ====================

-- Vue pour les commandes avec informations utilisateur
CREATE OR REPLACE VIEW orders_detailed AS
SELECT 
    o.id,
    o.userId,
    o.username,
    o.items,
    o.totalAmount,
    o.status,
    o.orderType,
    o.assignedTo,
    o.createdAt,
    o.updatedAt,
    u.role as userRole,
    u.personalInfo as userInfo
FROM orders o
JOIN users u ON o.userId = u.id;

-- Vue pour les statistiques du jour
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
    DATE(createdAt) as date,
    COUNT(*) as totalOrders,
    SUM(totalAmount) as totalRevenue,
    AVG(totalAmount) as avgOrderAmount,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedOrders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingOrders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelledOrders
FROM orders
GROUP BY DATE(createdAt);

-- ==================== PROCÉDURES STOCKÉES ====================

-- Procédure pour mettre à jour le statut d'une commande
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS UpdateOrderStatus(
    IN orderId VARCHAR(36),
    IN newStatus VARCHAR(20)
)
BEGIN
    UPDATE orders 
    SET status = newStatus, updatedAt = CURRENT_TIMESTAMP 
    WHERE id = orderId;
END //
DELIMITER ;

-- Procédure pour obtenir les commandes d'un utilisateur
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS GetUserOrders(
    IN userId VARCHAR(36)
)
BEGIN
    SELECT * FROM orders_detailed 
    WHERE userId = userId 
    ORDER BY createdAt DESC;
END //
DELIMITER ;

-- ==================== TRIGGERS ====================

-- Trigger pour nettoyer les anciennes commandes (plus de 30 jours)
DELIMITER //
CREATE TRIGGER IF NOT EXISTS cleanup_old_orders
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    DELETE FROM orders 
    WHERE createdAt < DATE_SUB(NOW(), INTERVAL 30 DAY) 
    AND status IN ('completed', 'cancelled');
END //
DELIMITER ;

-- ==================== FIN DU SCRIPT ====================
-- Base de données créée avec succès !
