
        const loginForm = document.getElementById('loginForm');
        const errorMessage = document.getElementById('errorMessage');
        const pinDisplay = document.getElementById('pinDisplay');
        let currentPin = '';

        // Debug: afficher les utilisateurs au chargement
        window.addEventListener('load', async () => {
            await db.ensureInitialized();
        });

        function resetDatabase() {
            if (confirm('⚠️ Cela va supprimer toutes les données et réinitialiser la base. Continuer ?')) {
                localStorage.removeItem('blackwoods_users');
                localStorage.removeItem('blackwoods_menu');
                localStorage.removeItem('blackwoods_orders');
                localStorage.removeItem('blackwoods_employee_requests');
                localStorage.removeItem('blackwoods_session');
                alert('✅ Base de données réinitialisée ! Rechargez la page.');
                window.location.reload();
            }
        }

        function addDigit(digit) {
            if (currentPin.length < 6) {
                currentPin += digit;
                updatePinDisplay();
            }
        }

        function deleteDigit() {
            if (currentPin.length > 0) {
                currentPin = currentPin.slice(0, -1);
                updatePinDisplay();
            }
        }

        function clearPin() {
            currentPin = '';
            updatePinDisplay();
        }

        function updatePinDisplay() {
            // Mettre à jour les points visuels
            for (let i = 1; i <= 6; i++) {
                const dot = document.getElementById(`dot${i}`);
                if (i <= currentPin.length) {
                    dot.classList.add('filled');
                } else {
                    dot.classList.remove('filled');
                }
            }
        }

        // Support clavier numérique
        document.addEventListener('keydown', (e) => {
            if (e.key >= '0' && e.key <= '9') {
                addDigit(e.key);
            } else if (e.key === 'Backspace') {
                deleteDigit();
            } else if (e.key === 'Delete' || e.key === 'Escape') {
                clearPin();
            }
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;

            errorMessage.style.display = 'none';

            if (!username || currentPin.length !== 6) {
                errorMessage.textContent = 'Veuillez entrer votre nom d\'utilisateur et un code PIN à 6 chiffres';
                errorMessage.style.display = 'block';
                return;
            }

            try {
                const user = await db.authenticate(username, currentPin);
                
                if (user) {
                    // Redirection selon le rôle
                    switch(user.role) {
                        case 'admin':
                            window.location.href = '../employee/employee.html'; // Admin va sur employee.html
                            break;
                        case 'employee':
                            window.location.href = '../employee/employee.html';
                            break;
                        case 'client':
                            window.location.href = '../client/client.html';
                            break;
                        default:
                            throw new Error('Rôle inconnu');
                    }
                } else {
                    errorMessage.textContent = 'Nom d\'utilisateur ou code PIN incorrect';
                    errorMessage.style.display = 'block';
                    clearPin();
                }
            } catch (error) {
                errorMessage.textContent = 'Erreur de connexion. Veuillez réessayer.';
                errorMessage.style.display = 'block';
                clearPin();
            }
        });
    