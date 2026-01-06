// ==================== Database Management System ====================
// Connexion directe à la BDD MySQL via API backend

class Database {
    constructor() {
        this.apiURL = window.location.origin + '/api';
        this.initialized = false;
        this.config = null;
        this.initPromise = this.init();
    }

    async init() {
        // Charger la configuration
        await this.loadConfig();
        
        // Vérifier la disponibilité de l'API
        await this.checkConnection();
        
        this.initialized = true;
    }
    
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initPromise;
        }
    }

    async loadConfig() {
        try {
            const response = await fetch('../assets/config.json');
            this.config = await response.json();
        } catch (error) {
            throw new Error('Impossible de charger la configuration');
        }
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.apiURL}/health`, {
                method: 'GET'
            });
            if (!response.ok) {
                throw new Error('API non disponible');
            }
        } catch (error) {
            throw new Error('Impossible de se connecter à la base de données. Vérifiez votre connexion.');
        }
    }

    // ==================== User Management ====================
    async getUsers() {
        await this.ensureInitialized();
        try {
            const response = await fetch(`${this.apiURL}/users`);
            if (!response.ok) throw new Error('Erreur lors de la récupération des utilisateurs');
            return await response.json();
        } catch (error) {
            throw new Error('Impossible de récupérer les utilisateurs: ' + error.message);
        }
    }

    async authenticate(username, pin) {
        await this.ensureInitialized();
        const users = await this.getUsers();
        
        // Convertir le PIN en string pour la comparaison
        const pinStr = String(pin);
        const user = users.find(u => u.username === username && String(u.pin) === pinStr);
        
        if (user) {
            const userSession = {
                id: user.id,
                username: user.username,
                role: user.role,
                roles: user.roles || [],
                personalInfo: user.personalInfo,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem('blackwoods_session', JSON.stringify(userSession));
            return userSession;
        }
        return null;
    }

    async registerUser(userData) {
        try {
            const response = await fetch(`${this.apiURL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur lors de l\'inscription');
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async updateUserRole(userId, role) {
        try {
            const response = await fetch(`${this.apiURL}/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role })
            });
            if (!response.ok) throw new Error('Erreur lors de la mise à jour');
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async updateUserInfo(userId, updates) {
        try {
            const response = await fetch(`${this.apiURL}/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!response.ok) throw new Error('Erreur lors de la mise à jour');
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    getCurrentUser() {
        const session = localStorage.getItem('blackwoods_session');
        return session ? JSON.parse(session) : null;
    }

    logout() {
        localStorage.removeItem('blackwoods_session');
    }

    // ==================== Menu Management ====================
    async getMenu() {
        await this.ensureInitialized();
        try {
            const response = await fetch(`${this.apiURL}/menu`);
            if (!response.ok) throw new Error('Erreur lors de la récupération du menu');
            return await response.json();
        } catch (error) {
            throw new Error('Impossible de récupérer le menu: ' + error.message);
        }
    }

    async updateMenuItem(id, updates) {
        try {
            const response = await fetch(`${this.apiURL}/menu/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!response.ok) throw new Error('Erreur lors de la mise à jour');
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async addMenuItem(item) {
        try {
            const response = await fetch(`${this.apiURL}/menu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            if (!response.ok) throw new Error('Erreur lors de l\'ajout');
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async deleteMenuItem(id) {
        try {
            const response = await fetch(`${this.apiURL}/menu/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Erreur lors de la suppression');
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    // ==================== Employee Requests ====================
    async getEmployeeRequests() {
        await this.ensureInitialized();
        try {
            const response = await fetch(`${this.apiURL}/employee-requests`);
            if (!response.ok) throw new Error('Erreur lors de la récupération des demandes');
            return await response.json();
        } catch (error) {
            throw new Error('Impossible de récupérer les demandes: ' + error.message);
        }
    }

    async addEmployeeRequest(request) {
        try {
            const response = await fetch(`${this.apiURL}/employee-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            });
            if (!response.ok) throw new Error('Erreur lors de l\'envoi de la demande');
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async updateEmployeeRequestStatus(requestId, status) {
        try {
            const response = await fetch(`${this.apiURL}/employee-requests/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!response.ok) throw new Error('Erreur lors de la mise à jour');
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async deleteEmployeeRequest(requestId) {
        try {
            const response = await fetch(`${this.apiURL}/employee-requests/${requestId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Erreur lors de la suppression');
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    // ==================== Role Requests ====================
    async getRoleRequests() {
        await this.ensureInitialized();
        try {
            const response = await fetch(`${this.apiURL}/role-requests`);
            if (!response.ok) throw new Error('Erreur lors de la récupération des demandes');
            return await response.json();
        } catch (error) {
            throw new Error('Impossible de récupérer les demandes: ' + error.message);
        }
    }

    async addRoleRequest(request) {
        try {
            const response = await fetch(`${this.apiURL}/role-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            });
            if (!response.ok) throw new Error('Erreur lors de l\'envoi de la demande');
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async updateRoleRequestStatus(requestId, status) {
        try {
            const response = await fetch(`${this.apiURL}/role-requests/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!response.ok) throw new Error('Erreur lors de la mise à jour');
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async deleteRoleRequest(requestId) {
        try {
            const response = await fetch(`${this.apiURL}/role-requests/${requestId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Erreur lors de la suppression');
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    // ==================== Orders Management ====================
    async getOrders() {
        await this.ensureInitialized();
        try {
            const response = await fetch(`${this.apiURL}/orders`);
            if (!response.ok) throw new Error('Erreur lors de la récupération des commandes');
            return await response.json();
        } catch (error) {
            throw new Error('Impossible de récupérer les commandes: ' + error.message);
        }
    }

    async createOrder(order) {
        try {
            const response = await fetch(`${this.apiURL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });
            if (!response.ok) throw new Error('Erreur lors de la création de la commande');
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async updateOrderStatus(orderId, status) {
        try {
            const response = await fetch(`${this.apiURL}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!response.ok) throw new Error('Erreur lors de la mise à jour');
            const order = await response.json();
            return order;
        } catch (error) {
            throw error;
        }
    }

    async deleteOrder(orderId) {
        try {
            const response = await fetch(`${this.apiURL}/orders/${orderId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Erreur lors de la suppression');
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    // ==================== Discord Webhook ====================
    async sendDiscordWebhook(order, action) {
        // La notification Discord est gérée côté serveur
        // Pas besoin d'appeler depuis le frontend
        return true;
    }

    // ==================== Utility Functions ====================
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Initialiser l'instance globale
const db = new Database();
