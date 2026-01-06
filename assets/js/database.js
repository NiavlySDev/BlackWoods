// ==================== Database Management System ====================
// Gère la connexion à la BDD MySQL distante avec fallback sur localStorage

class Database {
    constructor() {
        this.apiURL = null; // Sera défini après le chargement de la config
        this.isRemoteAvailable = false;
        this.initialized = false;
        this.config = null;
        this.initPromise = this.init();
    }

    async init() {
        // Charger la configuration
        await this.loadConfig();
        
        // Vérifier la disponibilité de la BDD distante
        await this.checkRemoteConnection();
        
        // Initialiser les données par défaut si nécessaire
        if (!this.isRemoteAvailable) {
            this.initLocalData();
        }
        
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
            
            // Définir l'URL de l'API selon l'environnement
            if (this.config.database && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                // En production, utiliser l'API backend qui se connectera à MySQL
                this.apiURL = window.location.origin + '/api';
            } else {
                // En local, pas d'API distante
                this.apiURL = null;
            }
        } catch (error) {
            this.config = { discordWebhook: null, mentionRoleId: null, database: null };
            this.apiURL = null;
        }
    }

    async checkRemoteConnection() {
        // Ne vérifier la connexion que si une API est configurée
        if (!this.apiURL) {
            this.isRemoteAvailable = false;
            return;
        }
        
        try {
            const response = await fetch(`${this.apiURL}/health`, {
                method: 'GET',
                timeout: 5000
            });
            this.isRemoteAvailable = response.ok;
        } catch (error) {
            this.isRemoteAvailable = false;
        }
    }

    initLocalData() {
        // Initialiser les données par défaut dans localStorage si elles n'existent pas
        // OU si les utilisateurs n'ont pas de PIN (anciennes données)
        const existingUsers = localStorage.getItem('blackwoods_users');
        let needsReset = false;
        
        if (existingUsers) {
            const users = JSON.parse(existingUsers);
            // Vérifier si les utilisateurs ont des PINs
            if (users.some(u => !u.pin)) {
                needsReset = true;
            }
        }
        
        if (!existingUsers || needsReset) {
            const defaultUsers = [
                {
                    id: 1,
                    username: 'admin',
                    pin: '123456',
                    role: 'admin',
                    roles: ['Comptoir', 'Livraison', 'Préparation'],
                    personalInfo: {
                        firstName: 'Admin',
                        lastName: 'Administrateur',
                        gameId: '00000',
                        phone: '37833-51492',
                        discord: 'admin#1234'
                    }
                },
                {
                    id: 2,
                    username: 'employee',
                    pin: '654321',
                    role: 'employee',
                    roles: ['Comptoir'],
                    personalInfo: {
                        firstName: 'John',
                        lastName: 'Doe',
                        gameId: '12345',
                        phone: '37833-00001',
                        discord: 'johndoe#5678'
                    }
                },
                {
                    id: 3,
                    username: 'client',
                    pin: '111111',
                    role: 'client',
                    roles: [],
                    personalInfo: {
                        firstName: 'Jane',
                        lastName: 'Smith',
                        gameId: '67890',
                        phone: '37833-00002',
                        discord: 'janesmith#9012'
                    },
                    savedOrderInfo: null
                }
            ];
            localStorage.setItem('blackwoods_users', JSON.stringify(defaultUsers));
        }

        if (!localStorage.getItem('blackwoods_menu')) {
            const defaultMenu = [
                { id: 1, name: '🌮 Taco', price: 746, calories: 70, category: 'plats' },
                { id: 2, name: '🌯 Burrito', price: 695, calories: 70, category: 'plats' },
                { id: 3, name: '🍟 Frites', price: 162, calories: 45, category: 'plats' },
                { id: 4, name: '🥤 Soda', price: 40, calories: 0, category: 'boissons' },
                { id: 5, name: '☕ Caffé', price: 50, calories: 0, category: 'boissons' },
                { id: 6, name: '🍬 Bonbon', price: 20, calories: 0, category: 'gourmandises' },
                { id: 7, name: '🍎 Tarte Aux Pommes', price: 270, calories: 0, category: 'gourmandises' }
            ];
            localStorage.setItem('blackwoods_menu', JSON.stringify(defaultMenu));
        }

        if (!localStorage.getItem('blackwoods_orders')) {
            localStorage.setItem('blackwoods_orders', JSON.stringify([]));
        }

        if (!localStorage.getItem('blackwoods_employee_requests')) {
            localStorage.setItem('blackwoods_employee_requests', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('blackwoods_role_requests')) {
            localStorage.setItem('blackwoods_role_requests', JSON.stringify([]));
        }
    }

    // ==================== User Management ====================
    async getUsers() {
        if (this.isRemoteAvailable) {
            try {
                const response = await fetch(`${this.apiURL}/users`);
                return await response.json();
            } catch (error) {
                return this.getLocalUsers();
            }
        }
        return this.getLocalUsers();
    }

    getLocalUsers() {
        const users = localStorage.getItem('blackwoods_users');
        return users ? JSON.parse(users) : [];
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
        const users = await this.getUsers();
        
        // Vérifier si le username existe déjà
        if (users.find(u => u.username === userData.username)) {
            throw new Error('Ce nom d\'utilisateur existe déjà');
        }

        const newUser = {
            id: Math.max(...users.map(u => u.id), 0) + 1,
            username: userData.username,
            pin: this.generatePIN(),
            role: 'client',
            roles: [],
            personalInfo: {
                firstName: userData.firstName,
                lastName: userData.lastName,
                gameId: userData.gameId,
                phone: userData.phone,
                discord: userData.discord
            },
            savedOrderInfo: null
        };

        users.push(newUser);
        
        if (this.isRemoteAvailable) {
            try {
                await fetch(`${this.apiURL}/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newUser)
                });
            } catch (error) {
            }
        }
        
        localStorage.setItem('blackwoods_users', JSON.stringify(users));
        return newUser;
    }

    generatePIN() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async updateUser(userId, updates) {
        const users = await this.getUsers();
        const index = users.findIndex(u => u.id === userId);
        
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            localStorage.setItem('blackwoods_users', JSON.stringify(users));
            return users[index];
        }
        return null;
    }

    async updateUserPIN(userId, newPIN) {
        return await this.updateUser(userId, { pin: newPIN });
    }

    async updateUserRole(userId, newRole) {
        return await this.updateUser(userId, { role: newRole });
    }

    async updateUserRoles(userId, roles) {
        return await this.updateUser(userId, { roles: roles });
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
        if (this.isRemoteAvailable) {
            try {
                const response = await fetch(`${this.apiURL}/menu`);
                return await response.json();
            } catch (error) {
                return this.getLocalMenu();
            }
        }
        return this.getLocalMenu();
    }

    getLocalMenu() {
        const menu = localStorage.getItem('blackwoods_menu');
        return menu ? JSON.parse(menu) : [];
    }

    async updateMenuItem(id, updates) {
        if (this.isRemoteAvailable) {
            try {
                const response = await fetch(`${this.apiURL}/menu/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                return await response.json();
            } catch (error) {
                return this.updateLocalMenuItem(id, updates);
            }
        }
        return this.updateLocalMenuItem(id, updates);
    }

    updateLocalMenuItem(id, updates) {
        const menu = this.getLocalMenu();
        const index = menu.findIndex(item => item.id === id);
        if (index !== -1) {
            menu[index] = { ...menu[index], ...updates };
            localStorage.setItem('blackwoods_menu', JSON.stringify(menu));
            return menu[index];
        }
        return null;
    }

    async addMenuItem(item) {
        if (this.isRemoteAvailable) {
            try {
                const response = await fetch(`${this.apiURL}/menu`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                });
                return await response.json();
            } catch (error) {
                return this.addLocalMenuItem(item);
            }
        }
        return this.addLocalMenuItem(item);
    }

    addLocalMenuItem(item) {
        const menu = this.getLocalMenu();
        const newItem = {
            ...item,
            id: Math.max(...menu.map(m => m.id), 0) + 1
        };
        menu.push(newItem);
        localStorage.setItem('blackwoods_menu', JSON.stringify(menu));
        return newItem;
    }

    // ==================== Employee Requests ====================
    async getEmployeeRequests() {
        if (this.isRemoteAvailable) {
            try {
                const response = await fetch(`${this.apiURL}/employee-requests`);
                return await response.json();
            } catch (error) {
                return this.getLocalEmployeeRequests();
            }
        }
        return this.getLocalEmployeeRequests();
    }

    getLocalEmployeeRequests() {
        const requests = localStorage.getItem('blackwoods_employee_requests');
        return requests ? JSON.parse(requests) : [];
    }

    async createEmployeeRequest(userId, message) {
        const user = (await this.getUsers()).find(u => u.id === userId);
        if (!user) return null;

        const requests = await this.getEmployeeRequests();
        const newRequest = {
            id: Math.max(...requests.map(r => r.id), 0) + 1,
            userId: userId,
            userInfo: user.personalInfo,
            username: user.username,
            message: message,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        requests.push(newRequest);
        
        if (this.isRemoteAvailable) {
            try {
                await fetch(`${this.apiURL}/employee-requests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newRequest)
                });
            } catch (error) {
            }
        }

        localStorage.setItem('blackwoods_employee_requests', JSON.stringify(requests));
        return newRequest;
    }

    async updateEmployeeRequest(requestId, status) {
        const requests = await this.getEmployeeRequests();
        const index = requests.findIndex(r => r.id === requestId);
        
        if (index !== -1) {
            requests[index].status = status;
            requests[index].updatedAt = new Date().toISOString();
            
            // Si approuvé, mettre à jour le rôle de l'utilisateur
            if (status === 'approved') {
                await this.updateUserRole(requests[index].userId, 'employee');
                await this.updateUserRoles(requests[index].userId, ['Comptoir']);
            }
            
            localStorage.setItem('blackwoods_employee_requests', JSON.stringify(requests));
            return requests[index];
        }
        return null;
    }

    // ==================== Role Requests (Demandes de rôles supplémentaires) ====================
    async getRoleRequests() {
        const requests = localStorage.getItem('blackwoods_role_requests');
        return requests ? JSON.parse(requests) : [];
    }

    async createRoleRequest(userId, requestedRoles, message) {
        const user = (await this.getUsers()).find(u => u.id === userId);
        if (!user) return null;

        const requests = await this.getRoleRequests();
        const newRequest = {
            id: Math.max(...requests.map(r => r.id), 0) + 1,
            userId: userId,
            userInfo: user.personalInfo,
            username: user.username,
            currentRoles: user.roles || [],
            requestedRoles: requestedRoles,
            message: message || '',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        requests.push(newRequest);
        localStorage.setItem('blackwoods_role_requests', JSON.stringify(requests));
        return newRequest;
    }

    async updateRoleRequest(requestId, status) {
        const requests = await this.getRoleRequests();
        const index = requests.findIndex(r => r.id === requestId);
        
        if (index !== -1) {
            requests[index].status = status;
            requests[index].updatedAt = new Date().toISOString();
            
            // Si approuvé, ajouter les rôles demandés à l'utilisateur
            if (status === 'approved') {
                const users = await this.getUsers();
                const user = users.find(u => u.id === requests[index].userId);
                if (user) {
                    const currentRoles = user.roles || [];
                    const newRoles = [...new Set([...currentRoles, ...requests[index].requestedRoles])];
                    await this.updateUserRoles(requests[index].userId, newRoles);
                }
            }
            
            localStorage.setItem('blackwoods_role_requests', JSON.stringify(requests));
            return requests[index];
        }
        return null;
    }

    async deleteMenuItem(id) {
        if (this.isRemoteAvailable) {
            try {
                await fetch(`${this.apiURL}/menu/${id}`, { method: 'DELETE' });
                return true;
            } catch (error) {
                return this.deleteLocalMenuItem(id);
            }
        }
        return this.deleteLocalMenuItem(id);
    }

    deleteLocalMenuItem(id) {
        const menu = this.getLocalMenu();
        const filtered = menu.filter(item => item.id !== id);
        localStorage.setItem('blackwoods_menu', JSON.stringify(filtered));
        return true;
    }

    // ==================== Order Management ====================
    async getOrders() {
        if (this.isRemoteAvailable) {
            try {
                const response = await fetch(`${this.apiURL}/orders`);
                return await response.json();
            } catch (error) {
                return this.getLocalOrders();
            }
        }
        return this.getLocalOrders();
    }

    getLocalOrders() {
        const orders = localStorage.getItem('blackwoods_orders');
        return orders ? JSON.parse(orders) : [];
    }

    async createOrder(order) {
        if (this.isRemoteAvailable) {
            try {
                const response = await fetch(`${this.apiURL}/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(order)
                });
                return await response.json();
            } catch (error) {
                return this.createLocalOrder(order);
            }
        }
        return this.createLocalOrder(order);
    }

    createLocalOrder(order) {
        const orders = this.getLocalOrders();
        const newOrder = {
            ...order,
            id: Math.max(...orders.map(o => o.id), 0) + 1,
            createdAt: new Date().toISOString(),
            status: 'pending',
            assignedTo: null
        };
        orders.push(newOrder);
        localStorage.setItem('blackwoods_orders', JSON.stringify(orders));
        
        // Envoyer notification Discord (nouvelle commande)
        this.sendDiscordWebhook(newOrder, 'created');
        
        return newOrder;
    }

    async updateOrderStatus(orderId, status) {
        if (this.isRemoteAvailable) {
            try {
                const response = await fetch(`${this.apiURL}/orders/${orderId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
                return await response.json();
            } catch (error) {
                return this.updateLocalOrderStatus(orderId, status);
            }
        }
        return this.updateLocalOrderStatus(orderId, status);
    }

    updateLocalOrderStatus(orderId, status) {
        const orders = this.getLocalOrders();
        const index = orders.findIndex(o => o.id === orderId);
        if (index !== -1) {
            orders[index].status = status;
            orders[index].updatedAt = new Date().toISOString();
            localStorage.setItem('blackwoods_orders', JSON.stringify(orders));
            
            // Envoyer notification Discord (changement de statut)
            this.sendDiscordWebhook(orders[index], 'updated');
            
            return orders[index];
        }
        return null;
    }

    // ==================== Order Assignment ====================
    async assignOrder(orderId, employeeId) {
        const orders = this.getLocalOrders();
        const index = orders.findIndex(o => o.id === orderId);
        
        if (index !== -1) {
            const users = await this.getUsers();
            const employee = users.find(u => u.id === employeeId);
            
            if (!employee) return null;
            
            orders[index].assignedTo = {
                id: employee.id,
                username: employee.username,
                name: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
                phone: employee.personalInfo.phone,
                discord: employee.personalInfo.discord
            };
            orders[index].updatedAt = new Date().toISOString();
            localStorage.setItem('blackwoods_orders', JSON.stringify(orders));
            return orders[index];
        }
        return null;
    }

    async updateOrder(orderId, updates, userId) {
        const orders = this.getLocalOrders();
        const index = orders.findIndex(o => o.id === orderId);
        
        if (index === -1) return null;
        
        const order = orders[index];
        
        // Vérifier si l'utilisateur est le propriétaire de la commande
        if (order.clientId !== userId) {
            throw new Error('Vous ne pouvez pas modifier cette commande');
        }
        
        // Règles de modification selon le statut
        if (!order.assignedTo) {
            // Pas encore prise en charge - modification complète autorisée
            orders[index] = { ...order, ...updates, id: orderId, createdAt: order.createdAt };
        } else if (order.status === 'preparing') {
            // En préparation - uniquement le lieu de livraison
            if (updates.deliveryOption) {
                orders[index].deliveryOption = updates.deliveryOption;
                orders[index].orderType = updates.orderType;
                orders[index].total = updates.total;
                orders[index].deliveryFee = updates.deliveryFee;
                if (updates.deliveryLocation) {
                    orders[index].deliveryLocation = updates.deliveryLocation;
                }
            }
        } else if (order.status === 'ready' || order.status === 'completed') {
            // Prête ou complétée - aucune modification
            throw new Error('Cette commande ne peut plus être modifiée');
        }
        
        orders[index].updatedAt = new Date().toISOString();
        localStorage.setItem('blackwoods_orders', JSON.stringify(orders));
        
        // Envoyer notification Discord (commande modifiée)
        this.sendDiscordWebhook(orders[index], 'modified');
        
        return orders[index];
    }

    // ==================== Discord Webhook ====================
    async sendDiscordWebhook(order, action) {
        if (!this.config || !this.config.discordWebhook) {
            return;
        }

        try {
            const users = await this.getUsers();
            const customer = users.find(u => u.id === order.clientId);
            
            let color, title, description;
            
            if (action === 'created') {
                color = 0xD4AF37; // Or
                title = '🆕 Nouvelle Commande';
                description = `Une nouvelle commande a été créée !\n\n**Client:** ${customer?.personalInfo?.firstName} ${customer?.personalInfo?.lastName} (${customer?.username})\n**Téléphone:** ${customer?.personalInfo?.phone}\n**Discord:** ${customer?.personalInfo?.discord}`;
            } else if (action === 'modified') {
                color = 0xFF9800; // Orange
                title = '✏️ Commande Modifiée';
                description = `La commande #${order.id} a été modifiée par le client.\n\n**Client:** ${customer?.personalInfo?.firstName} ${customer?.personalInfo?.lastName}\n**Statut:** ${this.getStatusLabel(order.status)}`;
            } else {
                color = this.getStatusColor(order.status);
                title = '📦 Mise à jour de Commande';
                description = `Le statut de la commande #${order.id} a été modifié.\n\n**Client:** ${customer?.personalInfo?.firstName} ${customer?.personalInfo?.lastName}\n**Nouveau statut:** ${this.getStatusLabel(order.status)}`;
            }
            
            // Détails de la commande
            const itemsList = order.items.map(item => `• ${item.name} x${item.quantity} - ${item.price * item.quantity}$`).join('\n');
            
            let locationText = order.deliveryOption === 'sur-place' ? '🏪 Sur place' : '📦 À emporter';
            if (order.deliveryOption === 'a-emporter' && order.deliveryLocation) {
                locationText += `\n📍 Adresse: ${order.deliveryLocation}`;
            }
            
            const embed = {
                title: title,
                description: description,
                color: color,
                fields: [
                    {
                        name: '📋 Détails',
                        value: `**Commande #${order.id}**\n${itemsList}\n\n**Total:** ${order.total}$\n**Lieu:** ${locationText}`,
                        inline: false
                    }
                ],
                footer: {
                    text: `Black Woods Restaurant • ${new Date().toLocaleString('fr-FR')}`
                },
                timestamp: new Date().toISOString()
            };
            
            if (order.assignedTo) {
                embed.fields.push({
                    name: '👨‍🍳 Employé en charge',
                    value: `${order.assignedTo.name}\n📞 ${order.assignedTo.phone}\n💬 ${order.assignedTo.discord}`,
                    inline: false
                });
            }
            
            const payload = {
                embeds: [embed]
            };
            
            // Ajouter mention uniquement pour nouvelle commande
            if (action === 'created' && this.config.mentionRoleId) {
                payload.content = `<@&${this.config.mentionRoleId}>`;
            }
            
            await fetch(this.config.discordWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
        }
    }
    
    getStatusColor(status) {
        const colors = {
            pending: 0xFFA500,    // Orange
            preparing: 0x3498DB,  // Bleu
            ready: 0x2ECC71,      // Vert
            completed: 0x95A5A6   // Gris
        };
        return colors[status] || 0x808080;
    }
    
    getStatusLabel(status) {
        const labels = {
            pending: '⏳ En attente',
            preparing: '👨‍🍳 En préparation',
            ready: '✅ Prête',
            completed: '🎉 Complétée'
        };
        return labels[status] || status;
    }
}

// Instance globale
const db = new Database();
