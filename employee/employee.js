
        // Vérification de l'authentification
        const currentUser = db.getCurrentUser();
        if (!currentUser || (currentUser.role !== 'employee' && currentUser.role !== 'admin')) {
            window.location.href = '../login/login.html';
        }

        const isAdmin = currentUser.role === 'admin';

        // Afficher le nom et les rôles
        document.getElementById('employeeName').textContent = 
            currentUser.personalInfo ? 
            `${currentUser.personalInfo.firstName} ${currentUser.personalInfo.lastName}` : 
            currentUser.username;

        if (isAdmin) {
            document.getElementById('pageTitle').innerHTML = '👑 Panel Administration';
            document.getElementById('adminTab').style.display = 'block';
            document.getElementById('roleBadges').innerHTML = '<div class="role-badge">ADMIN</div>';
        } else {
            const roles = currentUser.roles || [];
            document.getElementById('roleBadges').innerHTML = roles.map(r => 
                `<div class="role-badge">${r}</div>`
            ).join('');
        }

        let currentFilter = 'pending';
        let employeeCart = [];
        let employeeMenu = [];
        let currentPinInput = '';
        let newPinInput = '';
        let confirmPinInput = '';

        // Charger les données
        loadOrders();
        loadEmployeeOrderMenu();
        loadEmployeeOrderHistory();
        loadSettings();
        initPinPads();

        if (isAdmin) {
            loadAdminData();
        }

        // Rafraîchir automatiquement toutes les 10 secondes
        setInterval(loadOrders, 10000);

        async function loadOrders() {
            const orders = await db.getOrders();
            displayOrders(orders);
        }

        function filterOrders(status) {
            currentFilter = status;
            
            // Mettre à jour les tabs
            const tabs = document.querySelectorAll('#tab-commandes .tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
            
            loadOrders();
        }

        function displayOrders(orders) {
            const filtered = orders.filter(o => o.status === currentFilter);
            const ordersList = document.getElementById('ordersList');

            if (filtered.length === 0) {
                ordersList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🍽️</div>
                        <p>Aucune commande ${getStatusText(currentFilter)}</p>
                    </div>
                `;
                return;
            }

            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            ordersList.innerHTML = filtered.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <div class="order-id">Commande #${order.id}</div>
                            <div class="order-time">${formatDate(order.createdAt)}</div>
                        </div>
                        <span class="status-badge status-${order.status}">${getStatusText(order.status)}</span>
                    </div>
                    
                    <div class="order-client">
                        👤 Client: <strong>${order.clientName}</strong><br>
                        ${order.orderType === 'a-emporter' ? `📦 À emporter - ${order.deliveryLocation}` : '🍽️ Sur place'}
                    </div>

                    ${order.clientInfo ? `
                        <div style="color: var(--cream); font-size: 0.9rem; margin-bottom: 10px;">
                            📞 ${order.clientInfo.phone} | 💬 ${order.clientInfo.discord}
                        </div>
                    ` : ''}

                    ${order.assignedTo ? `
                        <div style="padding: 10px; background: rgba(212, 175, 55, 0.15); border-left: 3px solid var(--accent-gold); border-radius: 5px; margin-bottom: 10px;">
                            <strong style="color: var(--accent-gold);">👨‍🍳 Prise en charge par:</strong><br>
                            <span style="color: var(--cream);">${order.assignedTo.name}</span><br>
                            <span style="font-size: 0.9rem; color: var(--light-brown);">
                                📞 ${order.assignedTo.phone} | 💬 ${order.assignedTo.discord}
                            </span>
                        </div>
                    ` : ''}

                    <div class="order-items">
                        ${order.items.map(item => `
                            <div class="order-item">
                                <span class="order-item-name">${item.name}</span>
                                <span class="order-item-qty">×${item.quantity}</span>
                                <span class="order-item-price">${item.price * item.quantity}$</span>
                            </div>
                        `).join('')}
                    </div>

                    ${order.deliveryFee ? `
                        <div style="color: var(--cream); margin-top: 10px;">
                            Frais de livraison: +${order.deliveryFee}$
                        </div>
                    ` : ''}

                    <div class="order-total">
                        <span>Total:</span>
                        <span>${order.total}$</span>
                    </div>

                    ${order.notes ? `
                        <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; color: var(--cream);">
                            📝 Note: ${order.notes}
                        </div>
                    ` : ''}

                    <div class="order-actions">
                        ${getOrderActions(order)}
                    </div>
                </div>
            `).join('');
        }

        function getOrderActions(order) {
            // Les admins ont accès à tout
            const userRoles = currentUser.roles || [];
            const canPrepare = isAdmin || userRoles.includes('Préparation');
            const canDeliver = isAdmin || userRoles.includes('Livraison');
            const canCounter = isAdmin || userRoles.includes('Comptoir');
            
            const isAssignedToMe = order.assignedTo && order.assignedTo.id === currentUser.id;
            const isAssignedToOther = order.assignedTo && order.assignedTo.id !== currentUser.id;

            // Si la commande est assignée à quelqu'un d'autre, désactiver les actions (sauf pour admin)
            if (isAssignedToOther && !isAdmin) {
                return `<div style="color: var(--light-brown); font-style: italic;">🔒 Commande prise en charge par ${order.assignedTo.name}</div>`;
            }

            let actions = '';

            switch(order.status) {
                case 'pending':
                    if (canPrepare) {
                        if (!order.assignedTo) {
                            actions += `
                                <button class="btn-action" style="background: var(--accent-gold); color: var(--dark-brown);" onclick="assignOrderToMe(${order.id})">
                                    ✋ Prendre la commande
                                </button>
                            `;
                        } else if (isAssignedToMe) {
                            actions += `
                                <button class="btn-action btn-accept" onclick="updateOrderStatus(${order.id}, 'preparing')">
                                    👨‍🍳 Commencer la préparation
                                </button>
                                <button class="btn-action btn-cancel" onclick="updateOrderStatus(${order.id}, 'cancelled')">
                                    ❌ Annuler
                                </button>
                            `;
                        }
                    }
                    return actions;
                case 'preparing':
                    if (canPrepare && (isAssignedToMe || !order.assignedTo)) {
                        return `
                            <button class="btn-action btn-complete" onclick="updateOrderStatus(${order.id}, 'ready')">
                                ✅ Marquer comme prête
                            </button>
                            <button class="btn-action btn-cancel" onclick="updateOrderStatus(${order.id}, 'cancelled')">
                                ❌ Annuler
                            </button>
                        `;
                    }
                    return actions;
                case 'ready':
                    if ((canCounter || canDeliver) && (isAssignedToMe || !order.assignedTo)) {
                        return `
                            <button class="btn-action btn-accept" onclick="updateOrderStatus(${order.id}, 'completed')">
                                ✔️ Marquer comme livrée
                            </button>
                        `;
                    }
                    return actions;
                default:
                    return '';
            }
        }

        async function assignOrderToMe(orderId) {
            await db.assignOrder(orderId, currentUser.id);
            await loadOrders();
            showNotification('✅ Commande prise en charge !');
        }

        async function updateOrderStatus(orderId, newStatus) {
            await db.updateOrderStatus(orderId, newStatus);
            await loadOrders();
            showNotification('✅ Statut mis à jour !');
        }

        // Commande employé avec réduction 25%
        async function loadEmployeeOrderMenu() {
            employeeMenu = await db.getMenu();
            displayEmployeeOrderMenu();
        }

        function displayEmployeeOrderMenu() {
            const container = document.getElementById('employeeOrderContainer');
            
            const categories = {
                'plats': '⭐ Nos Plats ⭐',
                'boissons': '🍹 Boissons 🍹',
                'gourmandises': '🧁 Gourmandise 🧁'
            };

            let html = '<div style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px;">';
            html += '<div>';
            
            for (const [categoryKey, categoryName] of Object.entries(categories)) {
                const items = employeeMenu.filter(item => item.category === categoryKey);
                if (items.length > 0) {
                    html += `<h3>${categoryName}</h3>`;
                    items.forEach(item => {
                        const discountedPrice = Math.floor(item.price * 0.75);
                        html += `
                            <div class="menu-item-order" style="margin-bottom: 15px;">
                                <div class="item-info">
                                    <div class="item-name">${item.name}</div>
                                    <div style="color: var(--cream); font-size: 0.9rem;">
                                        <span style="text-decoration: line-through;">${item.price}$</span>
                                        <span class="discount-badge">-25%</span>
                                        <strong style="color: var(--accent-gold); margin-left: 10px;">${discountedPrice}$</strong>
                                    </div>
                                </div>
                                <div class="quantity-controls">
                                    <button class="btn-qty" onclick="changeEmployeeQuantity(${item.id}, -1)">−</button>
                                    <div class="qty-display" id="emp-qty-${item.id}">0</div>
                                    <button class="btn-qty" onclick="changeEmployeeQuantity(${item.id}, 1)">+</button>
                                </div>
                            </div>
                        `;
                    });
                }
            }
            
            html += '</div><div id="employeeCartDisplay"></div></div>';
            container.innerHTML = html;
            updateEmployeeCartDisplay();
        }

        function changeEmployeeQuantity(itemId, change) {
            const cartItem = employeeCart.find(item => item.id === itemId);
            
            if (cartItem) {
                cartItem.quantity += change;
                if (cartItem.quantity <= 0) {
                    employeeCart = employeeCart.filter(item => item.id !== itemId);
                }
            } else if (change > 0) {
                const menuItem = employeeMenu.find(item => item.id === itemId);
                if (menuItem) {
                    employeeCart.push({
                        ...menuItem,
                        quantity: 1,
                        discountedPrice: Math.floor(menuItem.price * 0.75)
                    });
                }
            }

            updateEmployeeQuantityDisplays();
            updateEmployeeCartDisplay();
        }

        function updateEmployeeQuantityDisplays() {
            employeeMenu.forEach(item => {
                const qtyDisplay = document.getElementById(`emp-qty-${item.id}`);
                if (qtyDisplay) {
                    const cartItem = employeeCart.find(ci => ci.id === item.id);
                    qtyDisplay.textContent = cartItem ? cartItem.quantity : 0;
                }
            });
        }

        function updateEmployeeCartDisplay() {
            const display = document.getElementById('employeeCartDisplay');
            
            if (employeeCart.length === 0) {
                display.innerHTML = '<div class="empty-cart"><div class="empty-cart-icon">🛒</div><p>Panier vide</p></div>';
                return;
            }

            const total = employeeCart.reduce((sum, item) => sum + (item.discountedPrice * item.quantity), 0);

            display.innerHTML = `
                <div class="card" style="position: sticky; top: 20px;">
                    <h3>🛒 Mon Panier</h3>
                    ${employeeCart.map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: #1a1410; border-radius: 5px; margin-bottom: 10px;">
                            <span>${item.name} x${item.quantity}</span>
                            <span style="color: var(--accent-gold); font-weight: bold;">${item.discountedPrice * item.quantity}$</span>
                        </div>
                    `).join('')}
                    <div style="padding-top: 15px; margin-top: 15px; border-top: 2px solid var(--accent-gold); display: flex; justify-content: space-between; font-size: 1.3rem; font-weight: bold; color: var(--accent-gold);">
                        <span>Total:</span>
                        <span>${total}$</span>
                    </div>
                    <button class="btn-primary" style="width: 100%; margin-top: 15px;" onclick="placeEmployeeOrder()">
                        🛎️ Commander - ${total}$
                    </button>
                </div>
            `;
        }

        async function placeEmployeeOrder() {
            if (employeeCart.length === 0) return;

            const total = employeeCart.reduce((sum, item) => sum + (item.discountedPrice * item.quantity), 0);

            const order = {
                clientId: currentUser.id,
                clientName: `${currentUser.personalInfo.firstName} ${currentUser.personalInfo.lastName} (Employé)`,
                clientInfo: currentUser.personalInfo,
                orderType: 'sur-place',
                items: employeeCart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.discountedPrice,
                    quantity: item.quantity
                })),
                subtotal: total,
                deliveryFee: 0,
                total,
                notes: '🎉 Commande employé avec réduction de 25%'
            };

            try {
                await db.createOrder(order);
                showNotification('✅ Commande passée avec succès !');
                employeeCart = [];
                updateEmployeeQuantityDisplays();
                updateEmployeeCartDisplay();
                
                // Recharger l'historique des commandes
                await loadEmployeeOrderHistory();
            } catch (error) {
                showNotification('❌ Erreur lors de la commande', true);
            }
        }

        // ==================== HISTORIQUE COMMANDES EMPLOYÉ ====================
        async function loadEmployeeOrderHistory() {
            const orders = await db.getOrders();
            const myOrders = orders.filter(o => o.clientId === currentUser.id);
            
            const historyContainer = document.getElementById('employeeOrdersHistory');
            
            if (myOrders.length === 0) {
                historyContainer.innerHTML = '<p style="color: var(--cream); text-align: center; padding: 40px;">Aucune commande pour le moment</p>';
                return;
            }

            myOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            historyContainer.innerHTML = myOrders.map(order => {
                const canEditFull = !order.assignedTo;
                const canEditLocation = order.assignedTo && order.status === 'preparing';
                const canEdit = canEditFull || canEditLocation;
                const isCompleted = order.status === 'ready' || order.status === 'completed';
                
                return `
                    <div style="background: #2a2420; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid var(--accent-gold);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                            <div>
                                <strong style="color: var(--accent-gold);">Commande #${order.id}</strong>
                                <div style="color: var(--cream); font-size: 0.9rem;">${formatDate(order.createdAt)}</div>
                            </div>
                            <span style="padding: 5px 15px; background: ${getStatusColor(order.status)}; border-radius: 15px; font-size: 0.9rem;">
                                ${getStatusText(order.status)}
                            </span>
                        </div>
                        
                        ${order.assignedTo ? `
                            <div style="padding: 10px; background: rgba(212, 175, 55, 0.15); border-left: 3px solid var(--accent-gold); border-radius: 5px; margin-bottom: 10px;">
                                <strong style="color: var(--accent-gold);">👨‍🍳 Employé en charge:</strong><br>
                                <span style="color: var(--cream);">${order.assignedTo.name}</span><br>
                                <span style="font-size: 0.9rem; color: var(--light-brown);">
                                    📞 ${order.assignedTo.phone} | 💬 ${order.assignedTo.discord}
                                </span>
                            </div>
                        ` : ''}
                        
                        <div style="color: var(--text-light); margin-bottom: 10px;">
                            ${order.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
                        </div>
                        
                        ${order.notes ? `
                            <div style="color: var(--cream); font-size: 0.9rem; margin-bottom: 10px; font-style: italic;">
                                📝 ${order.notes}
                            </div>
                        ` : ''}
                        
                        <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid rgba(212, 175, 55, 0.2);">
                            <span style="color: var(--cream);">${order.orderType === 'a-emporter' ? '📦 À emporter' : '🍽️ Sur place'}</span>
                            <strong style="color: var(--accent-gold); font-size: 1.2rem;">${order.total}$</strong>
                        </div>
                        
                        ${canEdit && !isCompleted && order.status !== 'cancelled' ? `
                            <div style="display: flex; gap: 10px; margin-top: 10px;">
                                <button onclick="openEmployeeEditModal(${order.id})" style="flex: 1; padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer;">
                                    ✏️ Modifier ${canEditLocation ? 'le lieu' : 'la commande'}
                                </button>
                                ${order.status !== 'ready' && order.status !== 'completed' ? `
                                    <button onclick="cancelEmployeeOrder(${order.id})" style="flex: 1; padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
                                        ❌ Annuler
                                    </button>
                                ` : ''}
                            </div>
                        ` : ''}
                        
                        ${order.status === 'cancelled' ? `
                            <div style="margin-top: 10px; padding: 10px; background: rgba(220, 53, 69, 0.1); border-left: 3px solid #dc3545; border-radius: 5px; color: #dc3545; text-align: center; font-weight: bold;">
                                ❌ Commande annulée
                            </div>
                        ` : ''}
                        
                        ${isCompleted && !canEdit && order.status !== 'cancelled' ? `
                            <div style="margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; color: var(--light-brown); text-align: center; font-style: italic;">
                                🔒 Cette commande ne peut plus être modifiée
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }

        async function cancelEmployeeOrder(orderId) {
            if (!confirm('⚠️ Êtes-vous sûr de vouloir annuler cette commande ?')) {
                return;
            }
            
            try {
                await db.updateOrderStatus(orderId, 'cancelled');
                await loadEmployeeOrderHistory();
                showNotification('✅ Commande annulée avec succès');
            } catch (error) {
                showNotification('❌ Erreur lors de l\'annulation', true);
            }
        }

        // ==================== MODIFICATION COMMANDE EMPLOYÉ ====================
        let currentEditEmployeeOrder = null;

        async function openEmployeeEditModal(orderId) {
            const orders = await db.getOrders();
            currentEditEmployeeOrder = orders.find(o => o.id === orderId);
            
            if (!currentEditEmployeeOrder) return;
            
            const canEditFull = !currentEditEmployeeOrder.assignedTo;
            const canEditLocation = currentEditEmployeeOrder.assignedTo && currentEditEmployeeOrder.status === 'preparing';
            
            let content = '';
            
            if (canEditFull) {
                content = `
                    <div style="color: var(--cream); margin-bottom: 20px;">
                        ℹ️ Vous pouvez modifier tous les aspects de votre commande car elle n'a pas encore été prise en charge par un employé.
                    </div>
                    
                    <h3 style="color: var(--accent-gold); margin-bottom: 15px;">Articles</h3>
                    <div id="editEmployeeItems" style="margin-bottom: 20px;">
                        ${currentEditEmployeeOrder.items.map((item, index) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; margin-bottom: 10px;">
                                <span style="color: var(--text-light);">${item.name} (${item.price}$ / unité)</span>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <button onclick="editEmployeeItemQty(${index}, -1)" style="padding: 5px 10px; background: var(--primary-color); color: white; border: none; border-radius: 3px; cursor: pointer;">−</button>
                                    <span id="editEmpQty-${index}" style="color: var(--accent-gold); font-weight: bold; min-width: 30px; text-align: center;">${item.quantity}</span>
                                    <button onclick="editEmployeeItemQty(${index}, 1)" style="padding: 5px 10px; background: var(--primary-color); color: white; border: none; border-radius: 3px; cursor: pointer;">+</button>
                                    <button onclick="removeEmployeeEditItem(${index})" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <button onclick="toggleEmployeeAddItemsSection()" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; width: 100%;">
                            ➕ Ajouter d'autres articles
                        </button>
                        <div id="addEmployeeItemsSection" style="display: none; margin-top: 15px; padding: 15px; background: rgba(40, 167, 69, 0.1); border: 2px solid #28a745; border-radius: 5px;">
                            <h4 style="color: var(--accent-gold); margin-bottom: 10px;">Menu disponible</h4>
                            <div id="availableEmployeeMenuItems"></div>
                        </div>
                    </div>
                    
                    <h3 style="color: var(--accent-gold); margin-bottom: 15px;">Lieu de livraison</h3>
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <label style="flex: 1; cursor: pointer;">
                            <input type="radio" name="editEmployeeDelivery" value="sur-place" ${currentEditEmployeeOrder.orderType === 'sur-place' ? 'checked' : ''} onchange="toggleEmployeeDeliveryAddress()" style="margin-right: 5px;">
                            <span style="color: var(--text-light);">🍽️ Sur place</span>
                        </label>
                        <label style="flex: 1; cursor: pointer;">
                            <input type="radio" name="editEmployeeDelivery" value="a-emporter" ${currentEditEmployeeOrder.orderType === 'a-emporter' ? 'checked' : ''} onchange="toggleEmployeeDeliveryAddress()" style="margin-right: 5px;">
                            <span style="color: var(--text-light);">📦 À emporter (+500$)</span>
                        </label>
                    </div>
                    <div id="employeeDeliveryAddressField" style="display: ${currentEditEmployeeOrder.orderType === 'a-emporter' ? 'block' : 'none'};">
                        <input type="text" id="editEmployeeDeliveryAddress" placeholder="📍 Adresse de livraison" value="${currentEditEmployeeOrder.deliveryLocation || ''}" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--primary-color); border-radius: 5px; color: var(--text-light); font-family: inherit;">
                    </div>
                `;
            } else if (canEditLocation) {
                content = `
                    <div style="color: var(--cream); margin-bottom: 20px;">
                        ℹ️ Votre commande est en cours de préparation. Vous pouvez uniquement modifier le lieu de livraison.
                    </div>
                    
                    <h3 style="color: var(--accent-gold); margin-bottom: 15px;">Lieu de livraison</h3>
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <label style="flex: 1; cursor: pointer;">
                            <input type="radio" name="editEmployeeDelivery" value="sur-place" ${currentEditEmployeeOrder.orderType === 'sur-place' ? 'checked' : ''} onchange="toggleEmployeeDeliveryAddress()" style="margin-right: 5px;">
                            <span style="color: var(--text-light);">🍽️ Sur place</span>
                        </label>
                        <label style="flex: 1; cursor: pointer;">
                            <input type="radio" name="editEmployeeDelivery" value="a-emporter" ${currentEditEmployeeOrder.orderType === 'a-emporter' ? 'checked' : ''} onchange="toggleEmployeeDeliveryAddress()" style="margin-right: 5px;">
                            <span style="color: var(--text-light);">📦 À emporter (+500$)</span>
                        </label>
                    </div>
                    <div id="employeeDeliveryAddressField" style="display: ${currentEditEmployeeOrder.orderType === 'a-emporter' ? 'block' : 'none'};">
                        <input type="text" id="editEmployeeDeliveryAddress" placeholder="📍 Adresse de livraison" value="${currentEditEmployeeOrder.deliveryLocation || ''}" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--primary-color); border-radius: 5px; color: var(--text-light); font-family: inherit;">
                    </div>
                `;
            }
            
            document.getElementById('editEmployeeOrderContent').innerHTML = content;
            document.getElementById('editEmployeeOrderModal').style.display = 'block';
            
            // Charger le menu si modification complète
            if (canEditFull) {
                loadAvailableEmployeeMenuItems();
            }
        }

        function toggleEmployeeDeliveryAddress() {
            const deliveryOption = document.querySelector('input[name="editEmployeeDelivery"]:checked').value;
            const addressField = document.getElementById('employeeDeliveryAddressField');
            if (addressField) {
                addressField.style.display = deliveryOption === 'a-emporter' ? 'block' : 'none';
            }
        }

        async function toggleEmployeeAddItemsSection() {
            const section = document.getElementById('addEmployeeItemsSection');
            section.style.display = section.style.display === 'none' ? 'block' : 'none';
        }

        async function loadAvailableEmployeeMenuItems() {
            const menuItems = await db.getMenu();
            const container = document.getElementById('availableEmployeeMenuItems');
            
            container.innerHTML = menuItems.map(item => {
                const discountedPrice = Math.floor(item.price * 0.75);
                const safeName = item.name.replace(/'/g, "\\'");
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 5px; margin-bottom: 8px;">
                        <span style="color: var(--text-light);">${item.name} - ${discountedPrice}$ <span style="font-size: 0.8rem; color: #28a745;">(-25%)</span></span>
                        <button onclick="addItemToEmployeeEditOrder(${item.id}, '${safeName}', ${discountedPrice})" style="padding: 5px 15px; background: var(--accent-gold); color: var(--dark-brown); border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">
                            + Ajouter
                        </button>
                    </div>
                `;
            }).join('');
        }

        function addItemToEmployeeEditOrder(itemId, itemName, itemPrice) {
            // Vérifier si l'item existe déjà
            const existingIndex = currentEditEmployeeOrder.items.findIndex(i => i.id === itemId);
            
            if (existingIndex !== -1) {
                // Augmenter la quantité
                currentEditEmployeeOrder.items[existingIndex].quantity += 1;
                // Mettre à jour uniquement l'affichage de cet item
                const qtyDisplay = document.getElementById(`editEmpQty-${existingIndex}`);
                if (qtyDisplay) {
                    qtyDisplay.textContent = currentEditEmployeeOrder.items[existingIndex].quantity;
                }
                showNotification('✅ Quantité augmentée !');
            } else {
                // Ajouter nouvel item
                currentEditEmployeeOrder.items.push({
                    id: itemId,
                    name: itemName,
                    price: itemPrice,
                    quantity: 1
                });
                
                // Ajouter visuellement le nouvel item à la liste
                const editItemsContainer = document.getElementById('editEmployeeItems');
                const newIndex = currentEditEmployeeOrder.items.length - 1;
                const newItemHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; margin-bottom: 10px;">
                        <span style="color: var(--text-light);">${itemName} (${itemPrice}$ / unité)</span>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <button onclick="editEmployeeItemQty(${newIndex}, -1)" style="padding: 5px 10px; background: var(--primary-color); color: white; border: none; border-radius: 3px; cursor: pointer;">−</button>
                            <span id="editEmpQty-${newIndex}" style="color: var(--accent-gold); font-weight: bold; min-width: 30px; text-align: center;">1</span>
                            <button onclick="editEmployeeItemQty(${newIndex}, 1)" style="padding: 5px 10px; background: var(--primary-color); color: white; border: none; border-radius: 3px; cursor: pointer;">+</button>
                            <button onclick="removeEmployeeEditItem(${newIndex})" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">🗑️</button>
                        </div>
                    </div>
                `;
                editItemsContainer.insertAdjacentHTML('beforeend', newItemHTML);
                showNotification('✅ Article ajouté !');
            }
        }

        function closeEmployeeEditModal() {
            document.getElementById('editEmployeeOrderModal').style.display = 'none';
            currentEditEmployeeOrder = null;
        }

        function editEmployeeItemQty(index, change) {
            currentEditEmployeeOrder.items[index].quantity += change;
            if (currentEditEmployeeOrder.items[index].quantity < 1) {
                currentEditEmployeeOrder.items[index].quantity = 1;
            }
            // Mettre à jour uniquement l'affichage de la quantité
            const qtyDisplay = document.getElementById(`editEmpQty-${index}`);
            if (qtyDisplay) {
                qtyDisplay.textContent = currentEditEmployeeOrder.items[index].quantity;
            }
        }

        function removeEmployeeEditItem(index) {
            if (currentEditEmployeeOrder.items.length <= 1) {
                showNotification('❌ Vous devez avoir au moins un article', true);
                return;
            }
            currentEditEmployeeOrder.items.splice(index, 1);
            openEmployeeEditModal(currentEditEmployeeOrder.id);
        }

        async function saveEmployeeOrderEdit() {
            if (!currentEditEmployeeOrder) return;
            
            const canEditFull = !currentEditEmployeeOrder.assignedTo;
            const canEditLocation = currentEditEmployeeOrder.assignedTo && currentEditEmployeeOrder.status === 'preparing';
            
            try {
                let updates = {};
                
                if (canEditFull) {
                    const deliveryOption = document.querySelector('input[name="editEmployeeDelivery"]:checked').value;
                    const deliveryAddress = document.getElementById('editEmployeeDeliveryAddress')?.value || '';
                    
                    const itemsTotal = currentEditEmployeeOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const deliveryFee = deliveryOption === 'a-emporter' ? 500 : 0;
                    const total = itemsTotal + deliveryFee;
                    
                    updates = {
                        items: currentEditEmployeeOrder.items,
                        orderType: deliveryOption,
                        deliveryOption: deliveryOption,
                        deliveryLocation: deliveryOption === 'a-emporter' ? deliveryAddress : '',
                        total: total,
                        deliveryFee: deliveryFee
                    };
                } else if (canEditLocation) {
                    const deliveryOption = document.querySelector('input[name="editEmployeeDelivery"]:checked').value;
                    const deliveryAddress = document.getElementById('editEmployeeDeliveryAddress')?.value || '';
                    
                    const itemsTotal = currentEditEmployeeOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const deliveryFee = deliveryOption === 'a-emporter' ? 500 : 0;
                    const total = itemsTotal + deliveryFee;
                    
                    updates = {
                        orderType: deliveryOption,
                        deliveryOption: deliveryOption,
                        deliveryLocation: deliveryOption === 'a-emporter' ? deliveryAddress : '',
                        total: total,
                        deliveryFee: deliveryFee
                    };
                }
                
                await db.updateOrder(currentEditEmployeeOrder.id, updates, currentUser.id);
                closeEmployeeEditModal();
                await loadEmployeeOrderHistory();
                showNotification('✅ Commande modifiée avec succès !');
            } catch (error) {
                showNotification('❌ ' + error.message, true);
            }
        }

        // Paramètres
        function loadSettings() {
            if (currentUser.personalInfo) {
                document.getElementById('settingsFirstName').value = currentUser.personalInfo.firstName || '';
                document.getElementById('settingsLastName').value = currentUser.personalInfo.lastName || '';
                document.getElementById('settingsGameId').value = currentUser.personalInfo.gameId || '';
                document.getElementById('settingsPhone').value = currentUser.personalInfo.phone || '';
                document.getElementById('settingsDiscord').value = currentUser.personalInfo.discord || '';
            }

            const myRolesDisplay = document.getElementById('myRolesDisplay');
            if (isAdmin) {
                myRolesDisplay.innerHTML = '<div class="role-badge">ADMIN (Tous les rôles)</div>';
                document.getElementById('roleRequestSection').style.display = 'none';
            } else {
                const roles = currentUser.roles || [];
                myRolesDisplay.innerHTML = roles.length > 0 ?
                    roles.map(r => `<div class="role-badge" style="display: inline-block; margin: 5px;">${r}</div>`).join('') :
                    '<p style="color: var(--cream);">Aucun rôle assigné</p>';
                
                // Afficher la section de demande de rôle pour les employés
                document.getElementById('roleRequestSection').style.display = 'block';
                
                // Pré-cocher les rôles déjà possédés (disabled)
                document.querySelectorAll('#roleRequestForm input[name="role"]').forEach(checkbox => {
                    if (roles.includes(checkbox.value)) {
                        checkbox.checked = true;
                        checkbox.disabled = true;
                        checkbox.parentElement.style.opacity = '0.5';
                    }
                });
            }
        }

        document.getElementById('personalInfoForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const personalInfo = {
                firstName: document.getElementById('settingsFirstName').value.trim(),
                lastName: document.getElementById('settingsLastName').value.trim(),
                gameId: document.getElementById('settingsGameId').value.trim(),
                phone: document.getElementById('settingsPhone').value.trim(),
                discord: document.getElementById('settingsDiscord').value.trim()
            };

            try {
                await db.updateUser(currentUser.id, { personalInfo });
                currentUser.personalInfo = personalInfo;
                localStorage.setItem('blackwoods_session', JSON.stringify(currentUser));
                
                document.getElementById('employeeName').textContent = `${personalInfo.firstName} ${personalInfo.lastName}`;
                showNotification('✅ Informations mises à jour !');
            } catch (error) {
                showNotification('❌ Erreur lors de la mise à jour', true);
            }
        });

        function initPinPads() {
            const pads = ['current', 'new', 'confirm'];
            
            pads.forEach(pad => {
                const padElement = document.getElementById(`${pad}PinPad`);
                padElement.innerHTML = `
                    ${[1,2,3,4,5,6,7,8,9].map(n => `
                        <button type="button" class="pin-btn-small" onclick="addPinDigit('${pad}', '${n}')">${n}</button>
                    `).join('')}
                    <button type="button" class="pin-btn-small" onclick="clearPinInput('${pad}')">✕</button>
                    <button type="button" class="pin-btn-small" onclick="addPinDigit('${pad}', '0')">0</button>
                    <button type="button" class="pin-btn-small" onclick="deletePinDigit('${pad}')">⌫</button>
                `;
            });
        }

        function addPinDigit(type, digit) {
            if (type === 'current' && currentPinInput.length < 6) currentPinInput += digit;
            else if (type === 'new' && newPinInput.length < 6) newPinInput += digit;
            else if (type === 'confirm' && confirmPinInput.length < 6) confirmPinInput += digit;
            updatePinDisplay(type);
        }

        function deletePinDigit(type) {
            if (type === 'current') currentPinInput = currentPinInput.slice(0, -1);
            else if (type === 'new') newPinInput = newPinInput.slice(0, -1);
            else if (type === 'confirm') confirmPinInput = confirmPinInput.slice(0, -1);
            updatePinDisplay(type);
        }

        function clearPinInput(type) {
            if (type === 'current') currentPinInput = '';
            else if (type === 'new') newPinInput = '';
            else if (type === 'confirm') confirmPinInput = '';
            updatePinDisplay(type);
        }

        function updatePinDisplay(type) {
            const input = type === 'current' ? currentPinInput : (type === 'new' ? newPinInput : confirmPinInput);
            const display = document.getElementById(`${type}PinDisplay`);
            display.textContent = input.length === 0 ? '••••••' : '•'.repeat(input.length) + '•'.repeat(6 - input.length);
        }

        document.getElementById('changePinForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            if (currentPinInput.length !== 6 || newPinInput.length !== 6 || confirmPinInput.length !== 6) {
                showNotification('Les codes PIN doivent contenir 6 chiffres', true);
                return;
            }

            const users = await db.getUsers();
            const user = users.find(u => u.id === currentUser.id);
            
            if (user.pin !== currentPinInput) {
                showNotification('Code PIN actuel incorrect', true);
                clearPinInput('current');
                return;
            }

            if (newPinInput !== confirmPinInput) {
                showNotification('Les nouveaux codes PIN ne correspondent pas', true);
                clearPinInput('new');
                clearPinInput('confirm');
                return;
            }

            try {
                await db.updateUserPIN(currentUser.id, newPinInput);
                showNotification('✅ Code PIN modifié avec succès !');
                currentPinInput = '';
                newPinInput = '';
                confirmPinInput = '';
                updatePinDisplay('current');
                updatePinDisplay('new');
                updatePinDisplay('confirm');
            } catch (error) {
                showNotification('❌ Erreur lors du changement de PIN', true);
            }
        });

        // Demande de rôle supplémentaire
        document.getElementById('roleRequestForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const checkboxes = document.querySelectorAll('#roleRequestForm input[name="role"]:checked:not(:disabled)');
            const requestedRoles = Array.from(checkboxes).map(cb => cb.value);
            
            if (requestedRoles.length === 0) {
                showNotification('Sélectionnez au moins un rôle', true);
                return;
            }
            
            const message = document.getElementById('roleRequestMessage').value.trim();
            
            try {
                await db.createRoleRequest(currentUser.id, requestedRoles, message);
                showNotification('✅ Demande envoyée avec succès !');
                document.getElementById('roleRequestForm').reset();
                loadSettings(); // Recharger pour mettre à jour l'affichage
            } catch (error) {
                showNotification('❌ Erreur lors de l\'envoi de la demande', true);
            }
        });

        // ADMIN FUNCTIONS
        async function loadAdminData() {
            loadAdminStats();
            loadEmployeeRequests();
            loadRoleRequests();
            loadUsersList();
            loadClientsList();
            loadAdminMenu();
        }

        async function loadAdminStats() {
            const orders = await db.getOrders();
            const menu = await db.getMenu();
            
            const pending = orders.filter(o => o.status === 'pending').length;
            const completed = orders.filter(o => o.status === 'completed').length;
            
            const today = new Date().toDateString();
            const todayOrders = orders.filter(o => 
                o.status === 'completed' && 
                new Date(o.createdAt).toDateString() === today
            );
            const revenue = todayOrders.reduce((sum, order) => sum + order.total, 0);

            document.getElementById('adminPendingOrders').textContent = pending;
            document.getElementById('adminCompletedOrders').textContent = completed;
            document.getElementById('adminMenuItemsCount').textContent = menu.length;
            document.getElementById('adminTodayRevenue').textContent = revenue + '$';
        }

        async function loadEmployeeRequests() {
            const requests = await db.getEmployeeRequests();
            const pendingRequests = requests.filter(r => r.status === 'pending');
            
            const container = document.getElementById('employeeRequestsList');
            
            if (pendingRequests.length === 0) {
                container.innerHTML = '<p style="color: var(--cream); text-align: center; padding: 20px;">Aucune demande en attente</p>';
                return;
            }

            container.innerHTML = pendingRequests.map(request => `
                <div class="request-card">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <div>
                            <strong style="color: var(--text-light); font-size: 1.1rem;">${request.userInfo.firstName} ${request.userInfo.lastName}</strong>
                            <div style="color: var(--cream); font-size: 0.9rem;">
                                ID: ${request.userInfo.gameId} | ${request.userInfo.discord}
                            </div>
                        </div>
                        <div style="color: var(--cream); font-size: 0.9rem;">${formatDate(request.createdAt)}</div>
                    </div>
                    <div style="color: var(--text-light); margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 5px;">
                        ${request.message}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-action btn-accept" onclick="approveEmployeeRequest(${request.id})">
                            ✅ Approuver
                        </button>
                        <button class="btn-action btn-cancel" onclick="rejectEmployeeRequest(${request.id})">
                            ❌ Refuser
                        </button>
                    </div>
                </div>
            `).join('');
        }

        async function approveEmployeeRequest(requestId) {
            await db.updateEmployeeRequest(requestId, 'approved');
            showNotification('✅ Demande approuvée !');
            loadEmployeeRequests();
            loadUsersList();
        }

        async function rejectEmployeeRequest(requestId) {
            await db.updateEmployeeRequest(requestId, 'rejected');
            showNotification('❌ Demande refusée');
            loadEmployeeRequests();
        }

        async function loadRoleRequests() {
            const requests = await db.getRoleRequests();
            const pendingRequests = requests.filter(r => r.status === 'pending');
            
            const container = document.getElementById('roleRequestsList');
            
            if (pendingRequests.length === 0) {
                container.innerHTML = '<p style="color: var(--cream); text-align: center; padding: 20px;">Aucune demande de rôle en attente</p>';
                return;
            }

            container.innerHTML = pendingRequests.map(request => `
                <div class="request-card">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <div>
                            <strong style="color: var(--text-light); font-size: 1.1rem;">${request.userInfo.firstName} ${request.userInfo.lastName}</strong>
                            <div style="color: var(--cream); font-size: 0.9rem;">
                                @${request.username} | ${request.userInfo.discord}
                            </div>
                            <div style="margin-top: 8px;">
                                <strong style="color: var(--accent-gold);">Rôles actuels:</strong> 
                                ${request.currentRoles.length > 0 ? request.currentRoles.join(', ') : 'Aucun'}
                            </div>
                            <div>
                                <strong style="color: #28a745);">Rôles demandés:</strong> 
                                ${request.requestedRoles.join(', ')}
                            </div>
                        </div>
                        <div style="color: var(--cream); font-size: 0.9rem;">${formatDate(request.createdAt)}</div>
                    </div>
                    ${request.message ? `
                        <div style="color: var(--text-light); margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 5px;">
                            "${request.message}"
                        </div>
                    ` : ''}
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-action btn-accept" onclick="approveRoleRequest(${request.id})">
                            ✅ Approuver
                        </button>
                        <button class="btn-action btn-cancel" onclick="rejectRoleRequest(${request.id})">
                            ❌ Refuser
                        </button>
                    </div>
                </div>
            `).join('');
        }

        async function approveRoleRequest(requestId) {
            await db.updateRoleRequest(requestId, 'approved');
            showNotification('✅ Rôles accordés !');
            loadRoleRequests();
            loadUsersList();
        }

        async function rejectRoleRequest(requestId) {
            await db.updateRoleRequest(requestId, 'rejected');
            showNotification('❌ Demande refusée');
            loadRoleRequests();
        }

        async function loadUsersList() {
            const users = await db.getUsers();
            const employees = users.filter(u => u.role === 'employee' || u.role === 'admin');
            
            const container = document.getElementById('usersList');
            
            if (employees.length === 0) {
                container.innerHTML = '<p style="color: var(--cream); text-align: center; padding: 20px;">Aucun employé enregistré</p>';
                return;
            }
            
            container.innerHTML = employees.map(user => `
                <div class="user-card">
                    <div class="user-header">
                        <div>
                            <div class="user-name">
                                ${user.personalInfo ? `${user.personalInfo.firstName} ${user.personalInfo.lastName}` : user.username}
                            </div>
                            <div style="color: var(--cream); font-size: 0.9rem;">
                                @${user.username}${user.personalInfo ? ` | ID: ${user.personalInfo.gameId} | ${user.personalInfo.discord}` : ''}
                            </div>
                        </div>
                        <div class="user-role" style="background: ${user.role === 'admin' ? '#DC143C' : 'var(--accent-gold)'}; color: ${user.role === 'admin' ? 'white' : 'var(--dark-brown)'}; padding: 5px 15px; border-radius: 15px; font-weight: bold;">
                            ${user.role === 'admin' ? '👑 ADMIN' : '👨‍🍳 EMPLOYÉ'}
                        </div>
                    </div>
                    
                    ${user.role === 'employee' ? `
                        <div style="margin-top: 15px;">
                            <strong style="color: var(--accent-gold);">Rôles:</strong>
                            <div style="margin-top: 10px;">
                                <label class="checkbox-label">
                                    <input type="checkbox" ${user.roles && user.roles.includes('Comptoir') ? 'checked' : ''} 
                                           onchange="toggleUserRole(${user.id}, 'Comptoir', this.checked)">
                                    Comptoir
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" ${user.roles && user.roles.includes('Livraison') ? 'checked' : ''} 
                                           onchange="toggleUserRole(${user.id}, 'Livraison', this.checked)">
                                    Livraison
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" ${user.roles && user.roles.includes('Préparation') ? 'checked' : ''} 
                                           onchange="toggleUserRole(${user.id}, 'Préparation', this.checked)">
                                    Préparation
                                </label>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="margin-top: 15px; display: flex; gap: 10px;">
                        ${user.role === 'employee' ? `
                            <button class="btn-action btn-accept" style="flex: 1; background: #DC143C;" onclick="promoteToAdmin(${user.id})">
                                👑 Promouvoir Admin
                            </button>
                        ` : user.id !== currentUser.id ? `
                            <button class="btn-action btn-cancel" style="flex: 1;" onclick="demoteFromAdmin(${user.id})">
                                ⬇️ Rétrograder Employé
                            </button>
                        ` : `
                            <div style="flex: 1; text-align: center; color: var(--cream); font-style: italic; padding: 10px;">
                                (C'est vous)
                            </div>
                        `}
                        ${user.id !== currentUser.id ? `
                            <button class="btn-action btn-cancel" style="flex: 1;" onclick="deleteUser(${user.id})">
                                🗑️ Supprimer
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }

        async function toggleUserRole(userId, role, isChecked) {
            const users = await db.getUsers();
            const user = users.find(u => u.id === userId);
            let roles = user.roles || [];
            
            if (isChecked) {
                if (!roles.includes(role)) {
                    roles.push(role);
                }
            } else {
                roles = roles.filter(r => r !== role);
            }
            
            await db.updateUserRoles(userId, roles);
            showNotification(`✅ Rôles mis à jour pour ${user.personalInfo ? user.personalInfo.firstName : user.username}`);
        }

        async function loadClientsList() {
            const users = await db.getUsers();
            const clients = users.filter(u => u.role === 'client');
            
            const container = document.getElementById('clientsList');
            
            if (clients.length === 0) {
                container.innerHTML = '<p style="color: var(--cream); text-align: center; padding: 20px;">Aucun client enregistré</p>';
                return;
            }
            
            container.innerHTML = clients.map(client => `
                <div class="user-card">
                    <div class="user-header">
                        <div>
                            <div class="user-name">
                                ${client.personalInfo ? `${client.personalInfo.firstName} ${client.personalInfo.lastName}` : client.username}
                            </div>
                            <div style="color: var(--cream); font-size: 0.9rem;">
                                ${client.personalInfo ? `ID: ${client.personalInfo.gameId} | 📞 ${client.personalInfo.phone} | 💬 ${client.personalInfo.discord}` : 'Informations non complétées'}
                            </div>
                        </div>
                        <div class="user-role">CLIENT</div>
                    </div>
                    <div style="margin-top: 10px; display: flex; gap: 10px;">
                        <button class="btn-action btn-accept" style="flex: 1;" onclick="promoteToEmployee(${client.id})">
                            ⬆️ Promouvoir employé
                        </button>
                        <button class="btn-action btn-cancel" style="flex: 1;" onclick="deleteUser(${client.id})">
                            🗑️ Supprimer
                        </button>
                    </div>
                </div>
            `).join('');
        }

        async function promoteToEmployee(userId) {
            if (confirm('Promouvoir ce client en employé ?')) {
                await db.updateUserRole(userId, 'employee');
                await db.updateUserRoles(userId, ['Comptoir']);
                showNotification('✅ Client promu employé !');
                loadClientsList();
                loadUsersList();
            }
        }

        async function promoteToAdmin(userId) {
            if (confirm('⚠️ Promouvoir cet employé en administrateur ? Il aura accès à toutes les fonctionnalités d\'administration.')) {
                await db.updateUserRole(userId, 'admin');
                showNotification('👑 Employé promu administrateur !');
                loadUsersList();
            }
        }

        async function demoteFromAdmin(userId) {
            if (confirm('⚠️ Rétrograder cet administrateur en employé ? Il perdra tous les privilèges d\'administration.')) {
                await db.updateUserRole(userId, 'employee');
                await db.updateUserRoles(userId, ['Comptoir']); // Donner au moins un rôle par défaut
                showNotification('✅ Administrateur rétrogradé en employé');
                loadUsersList();
            }
        }

        async function deleteUser(userId) {
            if (confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
                const users = await db.getUsers();
                const filteredUsers = users.filter(u => u.id !== userId);
                localStorage.setItem('blackwoods_users', JSON.stringify(filteredUsers));
                showNotification('✅ Utilisateur supprimé');
                loadClientsList();
                loadUsersList();
            }
        }

        async function loadAdminMenu() {
            const menu = await db.getMenu();
            const container = document.getElementById('menuAdminList');
            
            container.innerHTML = menu.map(item => `
                <div class="menu-admin-item">
                    <input type="text" value="${item.name}" id="admin-name-${item.id}">
                    <input type="number" value="${item.price}" id="admin-price-${item.id}">
                    <input type="number" value="${item.calories || 0}" id="admin-calories-${item.id}">
                    <select id="admin-category-${item.id}">
                        <option value="plats" ${item.category === 'plats' ? 'selected' : ''}>Plats</option>
                        <option value="boissons" ${item.category === 'boissons' ? 'selected' : ''}>Boissons</option>
                        <option value="gourmandises" ${item.category === 'gourmandises' ? 'selected' : ''}>Gourmandises</option>
                    </select>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-update" onclick="updateMenuItem(${item.id})">💾</button>
                        <button class="btn-delete" onclick="deleteMenuItem(${item.id})">🗑️</button>
                    </div>
                </div>
            `).join('');
        }

        async function updateMenuItem(id) {
            const name = document.getElementById(`admin-name-${id}`).value;
            const price = parseInt(document.getElementById(`admin-price-${id}`).value);
            const calories = parseInt(document.getElementById(`admin-calories-${id}`).value);
            const category = document.getElementById(`admin-category-${id}`).value;

            await db.updateMenuItem(id, { name, price, calories, category });
            showNotification('✅ Article mis à jour !');
            loadAdminStats();
            loadEmployeeOrderMenu();
        }

        async function deleteMenuItem(id) {
            if (confirm('Supprimer cet article ?')) {
                await db.deleteMenuItem(id);
                showNotification('✅ Article supprimé !');
                loadAdminMenu();
                loadAdminStats();
                loadEmployeeOrderMenu();
            }
        }

        async function addMenuItem() {
            const name = document.getElementById('newItemName').value;
            const price = parseInt(document.getElementById('newItemPrice').value);
            const calories = parseInt(document.getElementById('newItemCalories').value) || 0;
            const category = document.getElementById('newItemCategory').value;

            if (!name || !price) {
                showNotification('Remplissez tous les champs requis', true);
                return;
            }

            await db.addMenuItem({ name, price, calories, category });
            showNotification('✅ Article ajouté !');
            
            document.getElementById('newItemName').value = '';
            document.getElementById('newItemPrice').value = '';
            document.getElementById('newItemCalories').value = '';
            
            loadAdminMenu();
            loadAdminStats();
            loadEmployeeOrderMenu();
        }

        function switchTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            document.querySelectorAll('.tabs > .tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            document.getElementById(`tab-${tabName}`).classList.add('active');
            event.target.classList.add('active');

            if (tabName === 'admin' && isAdmin) {
                loadAdminData();
            }
        }

        function showNotification(message, isError = false) {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.style.background = isError ? '#dc3545' : '#28a745';
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }

        function getStatusText(status) {
            const statusTexts = {
                'pending': 'en attente',
                'preparing': 'en préparation',
                'ready': 'prêtes',
                'completed': 'terminées',
                'cancelled': 'annulées'
            };
            return statusTexts[status] || status;
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            
            if (minutes < 1) return 'À l\'instant';
            if (minutes < 60) return `Il y a ${minutes} min`;
            
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `Il y a ${hours}h ${minutes % 60}min`;
            
            return date.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function logout() {
            db.logout();
            window.location.href = '../login/login.html';
        }
    