
        // Vérification de l'authentification
        const currentUser = db.getCurrentUser();
        if (!currentUser || currentUser.role !== 'client') {
            window.location.href = '../login/login.html';
        }

        document.getElementById('clientName').textContent = 
            currentUser.personalInfo ? 
            `${currentUser.personalInfo.firstName} ${currentUser.personalInfo.lastName}` : 
            currentUser.username;

        let cart = [];
        let menu = [];
        let orderInfo = {
            firstName: '',
            lastName: '',
            gameId: '',
            phone: '',
            discord: '',
            orderType: 'sur-place',
            deliveryLocation: '',
            notes: ''
        };

        let currentPinInput = '';
        let newPinInput = '';
        let confirmPinInput = '';

        // Charger les données sauvegardées
        loadSavedData();

        // Charger le menu
        loadMenu();

        // Charger l'historique des commandes
        loadOrderHistory();

        // Charger les paramètres
        loadSettings();

        // Initialiser les pads numériques
        initPinPads();

        async function loadSavedData() {
            const users = await db.getUsers();
            const user = users.find(u => u.id === currentUser.id);
            if (user && user.savedOrderInfo) {
                orderInfo = user.savedOrderInfo;
            } else if (user && user.personalInfo) {
                orderInfo = {
                    ...orderInfo,
                    ...user.personalInfo
                };
            }
        }

        async function loadMenu() {
            menu = await db.getMenu();
            displayMenu();
        }

        function displayMenu() {
            const categories = {
                'plats': '⭐ Nos Plats ⭐',
                'boissons': '🍹 Boissons 🍹',
                'gourmandises': '🧁 Gourmandise 🧁'
            };

            const menuContainer = document.getElementById('menuContainer');
            
            let html = '';
            for (const [categoryKey, categoryName] of Object.entries(categories)) {
                const items = menu.filter(item => item.category === categoryKey);
                if (items.length > 0) {
                    html += `
                        <div class="menu-category">
                            <h3>${categoryName}</h3>
                            ${items.map(item => `
                                <div class="menu-item-order">
                                    <div class="item-info">
                                        <div class="item-name">${item.name}</div>
                                        <div class="item-details">${item.calories ? item.calories + ' kcal' : ''}</div>
                                    </div>
                                    <div class="item-price">${item.price}$</div>
                                    <div class="quantity-controls">
                                        <button class="btn-qty" onclick="changeQuantity('${item.id}', -1)">−</button>
                                        <div class="qty-display" id="qty-${item.id}">0</div>
                                        <button class="btn-qty" onclick="changeQuantity('${item.id}', 1)">+</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
            }

            menuContainer.innerHTML = html;
            updateQuantityDisplays();
        }

        function changeQuantity(itemId, change) {
            const cartItem = cart.find(item => item.id === itemId);
            
            if (cartItem) {
                cartItem.quantity += change;
                if (cartItem.quantity <= 0) {
                    cart = cart.filter(item => item.id !== itemId);
                }
            } else if (change > 0) {
                const menuItem = menu.find(item => item.id === itemId);
                if (menuItem) {
                    cart.push({
                        ...menuItem,
                        quantity: 1
                    });
                }
            }

            updateQuantityDisplays();
            updateCart();
        }

        function updateQuantityDisplays() {
            menu.forEach(item => {
                const qtyDisplay = document.getElementById(`qty-${item.id}`);
                if (qtyDisplay) {
                    const cartItem = cart.find(ci => ci.id === item.id);
                    qtyDisplay.textContent = cartItem ? cartItem.quantity : 0;
                }
            });
        }

        function updateCart() {
            const cartContent = document.getElementById('cartContent');

            if (cart.length === 0) {
                cartContent.innerHTML = `
                    <div class="empty-cart">
                        <div class="empty-cart-icon">🛒</div>
                        <p>Votre panier est vide</p>
                    </div>
                `;
                return;
            }

            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const deliveryFee = orderInfo.orderType === 'a-emporter' ? 500 : 0;
            const total = subtotal + deliveryFee;

            cartContent.innerHTML = `
                <div class="order-form">
                    <h3 style="margin-top: 0;">📝 Informations de commande</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Prénom</label>
                            <input type="text" id="orderFirstName" value="${orderInfo.firstName || ''}" placeholder="John">
                        </div>
                        <div class="form-group">
                            <label>Nom</label>
                            <input type="text" id="orderLastName" value="${orderInfo.lastName || ''}" placeholder="Doe">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>ID du jeu</label>
                        <input type="text" id="orderGameId" value="${orderInfo.gameId || ''}" placeholder="12345">
                    </div>
                    <div class="form-group">
                        <label>Téléphone</label>
                        <input type="tel" id="orderPhone" value="${orderInfo.phone || ''}" placeholder="37833-12345">
                    </div>
                    <div class="form-group">
                        <label>Discord</label>
                        <input type="text" id="orderDiscord" value="${orderInfo.discord || ''}" placeholder="username">
                    </div>
                    <div class="form-group">
                        <label>Type de commande</label>
                        <select id="orderType" onchange="updateOrderType()">
                            <option value="sur-place" ${orderInfo.orderType === 'sur-place' ? 'selected' : ''}>Sur place</option>
                            <option value="a-emporter" ${orderInfo.orderType === 'a-emporter' ? 'selected' : ''}>À emporter (+500$)</option>
                        </select>
                    </div>
                    <div class="form-group" id="deliveryLocationGroup" style="display: ${orderInfo.orderType === 'a-emporter' ? 'block' : 'none'};">
                        <label>Lieu de livraison</label>
                        <input type="text" id="deliveryLocation" value="${orderInfo.deliveryLocation || ''}" placeholder="Adresse de livraison">
                    </div>
                    <div class="form-group">
                        <label>Instructions spéciales</label>
                        <textarea id="orderNotes" rows="3" placeholder="Commentaires...">${orderInfo.notes || ''}</textarea>
                    </div>
                    <div class="checkbox-group">
                        <input type="checkbox" id="saveOrderInfo">
                        <label for="saveOrderInfo" style="margin: 0;">Sauvegarder mes informations pour la prochaine fois</label>
                    </div>
                </div>

                <div class="cart-items">
                    <h3>Articles</h3>
                    ${cart.map(item => `
                        <div class="cart-item">
                            <div class="cart-item-info">
                                <div class="cart-item-name">${item.name}</div>
                                <div class="cart-item-qty">Quantité: ${item.quantity}</div>
                            </div>
                            <div class="cart-item-price">${item.price * item.quantity}$</div>
                            <button class="btn-remove" onclick="removeFromCart('${item.id}')">×</button>
                        </div>
                    `).join('')}
                </div>

                <div class="cart-total">
                    <div class="cart-total-line">
                        <span>Sous-total:</span>
                        <span>${subtotal}$</span>
                    </div>
                    ${deliveryFee > 0 ? `
                        <div class="cart-total-line">
                            <span>Frais de livraison:</span>
                            <span>${deliveryFee}$</span>
                        </div>
                    ` : ''}
                    <div class="cart-total-final">
                        <span>Total:</span>
                        <span>${total}$</span>
                    </div>
                </div>

                <button class="btn-order" onclick="placeOrder()">
                    🛎️ Commander - ${total}$
                </button>
            `;
        }

        function updateOrderType() {
            orderInfo.orderType = document.getElementById('orderType').value;
            const deliveryGroup = document.getElementById('deliveryLocationGroup');
            if (deliveryGroup) {
                deliveryGroup.style.display = orderInfo.orderType === 'a-emporter' ? 'block' : 'none';
            }
            updateCart();
        }

        function removeFromCart(itemId) {
            cart = cart.filter(item => item.id !== itemId);
            updateQuantityDisplays();
            updateCart();
        }

        async function placeOrder() {
            if (cart.length === 0) return;

            // Récupérer les informations du formulaire
            const firstName = document.getElementById('orderFirstName')?.value.trim();
            const lastName = document.getElementById('orderLastName')?.value.trim();
            const gameId = document.getElementById('orderGameId')?.value.trim();
            const phone = document.getElementById('orderPhone')?.value.trim();
            const discord = document.getElementById('orderDiscord')?.value.trim();
            const orderType = document.getElementById('orderType')?.value;
            const deliveryLocation = document.getElementById('deliveryLocation')?.value.trim();
            const notes = document.getElementById('orderNotes')?.value.trim();
            const saveInfo = document.getElementById('saveOrderInfo')?.checked;

            // Validation
            if (!firstName || !lastName || !gameId || !phone || !discord) {
                showNotification('Veuillez remplir toutes les informations requises', true);
                return;
            }

            if (orderType === 'a-emporter' && !deliveryLocation) {
                showNotification('Veuillez indiquer le lieu de livraison', true);
                return;
            }

            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const deliveryFee = orderType === 'a-emporter' ? 500 : 0;
            const total = subtotal + deliveryFee;

            const order = {
                clientId: currentUser.id,
                clientName: `${firstName} ${lastName}`,
                clientInfo: {
                    firstName,
                    lastName,
                    gameId,
                    phone,
                    discord
                },
                orderType,
                deliveryLocation: orderType === 'a-emporter' ? deliveryLocation : null,
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })),
                subtotal,
                deliveryFee,
                total,
                notes
            };

            try {
                const btn = event.target;
                btn.disabled = true;
                btn.textContent = 'Commande en cours...';

                await db.createOrder(order);

                // Sauvegarder les infos si demandé
                if (saveInfo) {
                    const savedInfo = {
                        firstName,
                        lastName,
                        gameId,
                        phone,
                        discord,
                        orderType,
                        deliveryLocation,
                        notes
                    };
                    await db.updateUser(currentUser.id, { savedOrderInfo: savedInfo });
                    orderInfo = savedInfo;
                }
                
                showNotification('✅ Commande passée avec succès!');
                
                // Vider le panier
                cart = [];
                updateQuantityDisplays();
                updateCart();
                
                // Recharger l'historique
                loadOrderHistory();

            } catch (error) {
                showNotification('❌ Erreur lors de la commande', true);
                btn.disabled = false;
                btn.textContent = `🛎️ Commander - ${total}$`;
            }
        }

        async function loadOrderHistory() {
            const orders = await db.getOrders();
            const myOrders = orders.filter(o => o.clientId === currentUser.id);
            
            const ordersHistory = document.getElementById('ordersHistory');
            
            if (myOrders.length === 0) {
                ordersHistory.innerHTML = '<p style="color: var(--cream); text-align: center; padding: 40px;">Aucune commande pour le moment</p>';
                return;
            }

            myOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            ordersHistory.innerHTML = myOrders.map(order => {
                // Déterminer si la commande peut être modifiée
                const canEditFull = !order.assignedTo; // Modification complète si pas prise en charge
                const canEditLocation = order.assignedTo && order.status === 'preparing'; // Uniquement lieu si en préparation
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
                        <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid rgba(212, 175, 55, 0.2);">
                            <span style="color: var(--cream);">${order.orderType === 'a-emporter' ? '📦 À emporter' : '🍽️ Sur place'}</span>
                            <strong style="color: var(--accent-gold); font-size: 1.2rem;">${order.total}$</strong>
                        </div>
                        
                        ${canEdit && !isCompleted && order.status !== 'cancelled' ? `
                            <div style="display: flex; gap: 10px; margin-top: 10px;">
                                <button onclick="openEditModal('${order.id}')" style="flex: 1; padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer;">
                                    ✏️ Modifier ${canEditLocation ? 'le lieu' : 'la commande'}
                                </button>
                                ${order.status !== 'ready' && order.status !== 'completed' ? `
                                    <button onclick="cancelOrder('${order.id}')" style="flex: 1; padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
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

        async function cancelOrder(orderId) {
            if (!confirm('⚠️ Êtes-vous sûr de vouloir annuler cette commande ?')) {
                return;
            }
            
            try {
                await db.updateOrderStatus(orderId, 'cancelled');
                await loadOrderHistory();
                showNotification('✅ Commande annulée avec succès');
            } catch (error) {
                showNotification('❌ Erreur lors de l\'annulation', true);
            }
        }

        function loadSettings() {
            if (currentUser.personalInfo) {
                document.getElementById('settingsFirstName').value = currentUser.personalInfo.firstName || '';
                document.getElementById('settingsLastName').value = currentUser.personalInfo.lastName || '';
                document.getElementById('settingsGameId').value = currentUser.personalInfo.gameId || '';
                document.getElementById('settingsPhone').value = currentUser.personalInfo.phone || '';
                document.getElementById('settingsDiscord').value = currentUser.personalInfo.discord || '';
            }

            // Vérifier le statut de la demande employé
            checkEmployeeRequestStatus();
        }

        async function checkEmployeeRequestStatus() {
            const requests = await db.getEmployeeRequests();
            const myRequest = requests.find(r => r.userId === currentUser.id);
            
            const statusDiv = document.getElementById('requestStatus');
            if (myRequest) {
                const statusColors = {
                    'pending': '#ffc107',
                    'approved': '#28a745',
                    'rejected': '#dc3545'
                };
                const statusTexts = {
                    'pending': '⏳ Demande en attente de validation',
                    'approved': '✅ Demande approuvée ! Reconnectez-vous pour accéder à l\'espace employé.',
                    'rejected': '❌ Demande refusée'
                };
                
                statusDiv.innerHTML = `
                    <div style="padding: 15px; background: rgba(255,255,255,0.05); border-left: 4px solid ${statusColors[myRequest.status]}; border-radius: 5px;">
                        ${statusTexts[myRequest.status]}
                    </div>
                `;
                
                if (myRequest.status !== 'pending') {
                    document.getElementById('employeeRequestForm').style.display = 'none';
                }
            }
        }

        // Formulaire informations personnelles
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
                
                document.getElementById('clientName').textContent = `${personalInfo.firstName} ${personalInfo.lastName}`;
                showNotification('✅ Informations mises à jour !');
            } catch (error) {
                showNotification('❌ Erreur lors de la mise à jour', true);
            }
        });

        // Demande employé
        document.getElementById('employeeRequestForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const message = document.getElementById('employeeRequestMessage').value.trim();
            
            if (!message) {
                showNotification('Veuillez écrire un message', true);
                return;
            }

            try {
                await db.createEmployeeRequest(currentUser.id, message);
                showNotification('✅ Demande envoyée avec succès !');
                document.getElementById('employeeRequestMessage').value = '';
                checkEmployeeRequestStatus();
            } catch (error) {
                showNotification('❌ Erreur lors de l\'envoi', true);
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
            if (type === 'current' && currentPinInput.length < 6) {
                currentPinInput += digit;
                updatePinDisplay('current');
            } else if (type === 'new' && newPinInput.length < 6) {
                newPinInput += digit;
                updatePinDisplay('new');
            } else if (type === 'confirm' && confirmPinInput.length < 6) {
                confirmPinInput += digit;
                updatePinDisplay('confirm');
            }
        }

        function deletePinDigit(type) {
            if (type === 'current') {
                currentPinInput = currentPinInput.slice(0, -1);
                updatePinDisplay('current');
            } else if (type === 'new') {
                newPinInput = newPinInput.slice(0, -1);
                updatePinDisplay('new');
            } else if (type === 'confirm') {
                confirmPinInput = confirmPinInput.slice(0, -1);
                updatePinDisplay('confirm');
            }
        }

        function clearPinInput(type) {
            if (type === 'current') {
                currentPinInput = '';
                updatePinDisplay('current');
            } else if (type === 'new') {
                newPinInput = '';
                updatePinDisplay('new');
            } else if (type === 'confirm') {
                confirmPinInput = '';
                updatePinDisplay('confirm');
            }
        }

        function updatePinDisplay(type) {
            const input = type === 'current' ? currentPinInput : (type === 'new' ? newPinInput : confirmPinInput);
            const display = document.getElementById(`${type}PinDisplay`);
            
            if (input.length === 0) {
                display.textContent = '••••••';
            } else {
                display.textContent = '•'.repeat(input.length) + '•'.repeat(6 - input.length);
            }
        }

        // Changement de PIN
        document.getElementById('changePinForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            if (currentPinInput.length !== 6 || newPinInput.length !== 6 || confirmPinInput.length !== 6) {
                showNotification('Les codes PIN doivent contenir 6 chiffres', true);
                return;
            }

            // Vérifier le PIN actuel
            const users = await db.getUsers();
            const user = users.find(u => u.id === currentUser.id);
            
            if (user.pin !== currentPinInput) {
                showNotification('Code PIN actuel incorrect', true);
                clearPinInput('current');
                return;
            }

            // Vérifier que les nouveaux PIN correspondent
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

        function switchTab(tabName) {
            // Masquer tous les contenus
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Désactiver tous les tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Activer le tab sélectionné
            document.getElementById(`tab-${tabName}`).classList.add('active');
            event.target.classList.add('active');
        }

        // ==================== MODIFICATION COMMANDE ====================
        let currentEditOrder = null;

        async function openEditModal(orderId) {
            const orders = await db.getOrders();
            currentEditOrder = orders.find(o => o.id === orderId);
            
            if (!currentEditOrder) return;
            
            const canEditFull = !currentEditOrder.assignedTo;
            const canEditLocation = currentEditOrder.assignedTo && currentEditOrder.status === 'preparing';
            
            let content = '';
            
            if (canEditFull) {
                // Modification complète
                content = `
                    <div style="color: var(--cream); margin-bottom: 20px;">
                        ℹ️ Vous pouvez modifier tous les aspects de votre commande car elle n'a pas encore été prise en charge par un employé.
                    </div>
                    
                    <h3 style="color: var(--accent-gold); margin-bottom: 15px;">Articles</h3>
                    <div id="editItems" style="margin-bottom: 20px;">
                        ${currentEditOrder.items.map((item, index) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; margin-bottom: 10px;">
                                <span style="color: var(--text-light);">${item.name} (${item.price}$ / unité)</span>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <button onclick="editItemQty(${index}, -1)" style="padding: 5px 10px; background: var(--primary-color); color: white; border: none; border-radius: 3px; cursor: pointer;">−</button>
                                    <span id="editQty-${index}" style="color: var(--accent-gold); font-weight: bold; min-width: 30px; text-align: center;">${item.quantity}</span>
                                    <button onclick="editItemQty(${index}, 1)" style="padding: 5px 10px; background: var(--primary-color); color: white; border: none; border-radius: 3px; cursor: pointer;">+</button>
                                    <button onclick="removeEditItem(${index})" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <button onclick="toggleAddItemsSection()" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; width: 100%;">
                            ➕ Ajouter d'autres articles
                        </button>
                        <div id="addItemsSection" style="display: none; margin-top: 15px; padding: 15px; background: rgba(40, 167, 69, 0.1); border: 2px solid #28a745; border-radius: 5px;">
                            <h4 style="color: var(--accent-gold); margin-bottom: 10px;">Menu disponible</h4>
                            <div id="availableMenuItems"></div>
                        </div>
                    </div>
                    
                    <h3 style="color: var(--accent-gold); margin-bottom: 15px;">Lieu de livraison</h3>
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <label style="flex: 1; cursor: pointer;">
                            <input type="radio" name="editDelivery" value="sur-place" ${currentEditOrder.orderType === 'sur-place' ? 'checked' : ''} onchange="toggleDeliveryAddress()" style="margin-right: 5px;">
                            <span style="color: var(--text-light);">🍽️ Sur place</span>
                        </label>
                        <label style="flex: 1; cursor: pointer;">
                            <input type="radio" name="editDelivery" value="a-emporter" ${currentEditOrder.orderType === 'a-emporter' ? 'checked' : ''} onchange="toggleDeliveryAddress()" style="margin-right: 5px;">
                            <span style="color: var(--text-light);">📦 À emporter (+500$)</span>
                        </label>
                    </div>
                    <div id="deliveryAddressField" style="display: ${currentEditOrder.orderType === 'a-emporter' ? 'block' : 'none'};">
                        <input type="text" id="editDeliveryAddress" placeholder="📍 Adresse de livraison" value="${currentEditOrder.deliveryLocation || ''}" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--primary-color); border-radius: 5px; color: var(--text-light); font-family: inherit; margin-bottom: 15px;">
                    </div>
                    
                    <h3 style="color: var(--accent-gold); margin-bottom: 15px;">Notes</h3>
                    <textarea id="editNotes" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--primary-color); border-radius: 5px; color: var(--text-light); font-family: inherit; resize: vertical;" rows="3">${currentEditOrder.notes || ''}</textarea>
                `;
            } else if (canEditLocation) {
                // Uniquement le lieu de livraison
                content = `
                    <div style="color: var(--cream); margin-bottom: 20px;">
                        ℹ️ Votre commande est en cours de préparation. Vous pouvez uniquement modifier le lieu de livraison.
                    </div>
                    
                    <h3 style="color: var(--accent-gold); margin-bottom: 15px;">Lieu de livraison</h3>
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <label style="flex: 1; cursor: pointer;">
                            <input type="radio" name="editDelivery" value="sur-place" ${currentEditOrder.orderType === 'sur-place' ? 'checked' : ''} onchange="toggleDeliveryAddress()" style="margin-right: 5px;">
                            <span style="color: var(--text-light);">🍽️ Sur place</span>
                        </label>
                        <label style="flex: 1; cursor: pointer;">
                            <input type="radio" name="editDelivery" value="a-emporter" ${currentEditOrder.orderType === 'a-emporter' ? 'checked' : ''} onchange="toggleDeliveryAddress()" style="margin-right: 5px;">
                            <span style="color: var(--text-light);">📦 À emporter (+500$)</span>
                        </label>
                    </div>
                    <div id="deliveryAddressField" style="display: ${currentEditOrder.orderType === 'a-emporter' ? 'block' : 'none'};">
                        <input type="text" id="editDeliveryAddress" placeholder="📍 Adresse de livraison" value="${currentEditOrder.deliveryLocation || ''}" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--primary-color); border-radius: 5px; color: var(--text-light); font-family: inherit;">
                    </div>
                `;
            }
            
            document.getElementById('editOrderContent').innerHTML = content;
            document.getElementById('editOrderModal').style.display = 'block';
            
            // Charger le menu si modification complète
            if (canEditFull) {
                loadAvailableMenuItems();
            }
        }

        function toggleDeliveryAddress() {
            const deliveryOption = document.querySelector('input[name="editDelivery"]:checked').value;
            const addressField = document.getElementById('deliveryAddressField');
            if (addressField) {
                addressField.style.display = deliveryOption === 'a-emporter' ? 'block' : 'none';
            }
        }

        async function toggleAddItemsSection() {
            const section = document.getElementById('addItemsSection');
            section.style.display = section.style.display === 'none' ? 'block' : 'none';
        }

        async function loadAvailableMenuItems() {
            const menuItems = await db.getMenu();
            const container = document.getElementById('availableMenuItems');
            
            container.innerHTML = menuItems.map(item => {
                const safeName = item.name.replace(/'/g, "\\'");
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 5px; margin-bottom: 8px;">
                        <span style="color: var(--text-light);">${item.name} - ${item.price}$</span>
                        <button onclick="addItemToEditOrder('${item.id}', '${safeName}', ${item.price})" style="padding: 5px 15px; background: var(--accent-gold); color: var(--dark-brown); border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">
                            + Ajouter
                        </button>
                    </div>
                `;
            }).join('');
        }

        function addItemToEditOrder(itemId, itemName, itemPrice) {
            // Vérifier si l'item existe déjà
            const existingIndex = currentEditOrder.items.findIndex(i => i.id === itemId);
            
            if (existingIndex !== -1) {
                // Augmenter la quantité
                currentEditOrder.items[existingIndex].quantity += 1;
                // Mettre à jour uniquement l'affichage de cet item
                const qtyDisplay = document.getElementById(`editQty-${existingIndex}`);
                if (qtyDisplay) {
                    qtyDisplay.textContent = currentEditOrder.items[existingIndex].quantity;
                }
                showNotification('✅ Quantité augmentée !');
            } else {
                // Ajouter nouvel item
                currentEditOrder.items.push({
                    id: itemId,
                    name: itemName,
                    price: itemPrice,
                    quantity: 1
                });
                
                // Ajouter visuellement le nouvel item à la liste
                const editItemsContainer = document.getElementById('editItems');
                const newIndex = currentEditOrder.items.length - 1;
                const newItemHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; margin-bottom: 10px;">
                        <span style="color: var(--text-light);">${itemName} (${itemPrice}$ / unité)</span>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <button onclick="editItemQty(${newIndex}, -1)" style="padding: 5px 10px; background: var(--primary-color); color: white; border: none; border-radius: 3px; cursor: pointer;">−</button>
                            <span id="editQty-${newIndex}" style="color: var(--accent-gold); font-weight: bold; min-width: 30px; text-align: center;">1</span>
                            <button onclick="editItemQty(${newIndex}, 1)" style="padding: 5px 10px; background: var(--primary-color); color: white; border: none; border-radius: 3px; cursor: pointer;">+</button>
                            <button onclick="removeEditItem(${newIndex})" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">🗑️</button>
                        </div>
                    </div>
                `;
                editItemsContainer.insertAdjacentHTML('beforeend', newItemHTML);
                showNotification('✅ Article ajouté !');
            }
        }

        function closeEditModal() {
            document.getElementById('editOrderModal').style.display = 'none';
            currentEditOrder = null;
        }

        function editItemQty(index, change) {
            currentEditOrder.items[index].quantity += change;
            if (currentEditOrder.items[index].quantity < 1) {
                currentEditOrder.items[index].quantity = 1;
            }
            // Mettre à jour uniquement l'affichage de la quantité
            const qtyDisplay = document.getElementById(`editQty-${index}`);
            if (qtyDisplay) {
                qtyDisplay.textContent = currentEditOrder.items[index].quantity;
            }
        }

        function removeEditItem(index) {
            if (currentEditOrder.items.length <= 1) {
                showNotification('❌ Vous devez avoir au moins un article', true);
                return;
            }
            currentEditOrder.items.splice(index, 1);
            // Recharger la modal pour réindexer correctement tous les items
            openEditModal(currentEditOrder.id);
        }

        async function saveOrderEdit() {
            if (!currentEditOrder) return;
            
            const canEditFull = !currentEditOrder.assignedTo;
            const canEditLocation = currentEditOrder.assignedTo && currentEditOrder.status === 'preparing';
            
            try {
                let updates = {};
                
                if (canEditFull) {
                    // Modification complète
                    const deliveryOption = document.querySelector('input[name="editDelivery"]:checked').value;
                    const notes = document.getElementById('editNotes')?.value || '';
                    const deliveryAddress = document.getElementById('editDeliveryAddress')?.value || '';
                    
                    // Recalculer le total
                    const itemsTotal = currentEditOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const deliveryFee = deliveryOption === 'a-emporter' ? 500 : 0;
                    const total = itemsTotal + deliveryFee;
                    
                    updates = {
                        items: currentEditOrder.items,
                        orderType: deliveryOption,
                        deliveryOption: deliveryOption,
                        deliveryLocation: deliveryOption === 'a-emporter' ? deliveryAddress : '',
                        notes: notes,
                        total: total,
                        deliveryFee: deliveryFee
                    };
                } else if (canEditLocation) {
                    // Uniquement le lieu
                    const deliveryOption = document.querySelector('input[name="editDelivery"]:checked').value;
                    const deliveryAddress = document.getElementById('editDeliveryAddress')?.value || '';
                    
                    // Recalculer le total avec nouveau frais de livraison
                    const itemsTotal = currentEditOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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
                
                await db.updateOrder(currentEditOrder.id, updates, currentUser.id);
                closeEditModal();
                await loadOrderHistory();
                showNotification('✅ Commande modifiée avec succès !');
            } catch (error) {
                showNotification('❌ ' + error.message, true);
            }
        }

        function showNotification(message, isError = false) {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = 'notification' + (isError ? ' error' : '');
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }

        function getStatusColor(status) {
            const colors = {
                'pending': '#ffc107',
                'preparing': '#17a2b8',
                'ready': '#28a745',
                'completed': '#6c757d',
                'cancelled': '#dc3545'
            };
            return colors[status] || '#6c757d';
        }

        function getStatusText(status) {
            const texts = {
                'pending': 'En attente',
                'preparing': 'En préparation',
                'ready': 'Prête',
                'completed': 'Terminée',
                'cancelled': 'Annulée'
            };
            return texts[status] || status;
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function logout() {
            db.logout();
            window.location.href = '../login/login.html';
        }
    