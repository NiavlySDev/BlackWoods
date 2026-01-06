
        const registerForm = document.getElementById('registerForm');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        const pinDisplay = document.getElementById('pinDisplay');
        const submitBtn = document.getElementById('submitBtn');

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';

            const userData = {
                firstName: document.getElementById('firstName').value.trim(),
                lastName: document.getElementById('lastName').value.trim(),
                gameId: document.getElementById('gameId').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                discord: document.getElementById('discord').value.trim(),
                username: document.getElementById('username').value.trim()
            };

            // Validation
            if (!userData.firstName || !userData.lastName || !userData.gameId || 
                !userData.phone || !userData.discord || !userData.username) {
                showError('Veuillez remplir tous les champs obligatoires');
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Création en cours...';

                const newUser = await db.registerUser(userData);
                
                // Afficher le PIN
                document.getElementById('pinCode').textContent = newUser.pin;
                registerForm.style.display = 'none';
                pinDisplay.style.display = 'block';
                
                successMessage.textContent = 'Compte créé avec succès !';
                successMessage.style.display = 'block';

            } catch (error) {
                showError(error.message || 'Erreur lors de la création du compte');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Créer mon compte';
            }
        });

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
        }
    