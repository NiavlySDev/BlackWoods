// ==================== Mobile Navigation ====================
const burger = document.querySelector('.burger');
const nav = document.querySelector('.nav-links');
const navLinks = document.querySelectorAll('.nav-links li');

burger.addEventListener('click', () => {
    // Toggle Nav
    nav.classList.toggle('active');
    
    // Burger Animation
    burger.classList.toggle('toggle');
});

// Close menu when clicking on a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        nav.classList.remove('active');
    });
});

// ==================== Smooth Scrolling ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 70;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// ==================== Navbar Scroll Effect ====================
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.padding = '0.5rem 0';
        navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    } else {
        navbar.style.padding = '1rem 0';
        navbar.style.boxShadow = 'none';
    }
    
    lastScroll = currentScroll;
});

// ==================== Form Submission ====================
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form values
    const formData = new FormData(contactForm);
    
    // Simulate form submission
    showNotification('Message envoyé avec succès! Nous vous recontacterons bientôt.', 'success');
    
    // Reset form
    contactForm.reset();
});

// ==================== Notification System ====================
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="close-notification">&times;</button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 15px;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.close-notification');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
    `;
    
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Add to document
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==================== Scroll Animations ====================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.8s ease forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe menu items
document.querySelectorAll('.menu-item').forEach(item => {
    item.style.opacity = '0';
    observer.observe(item);
});

// Observe menu categories
document.querySelectorAll('.menu-category').forEach(category => {
    category.style.opacity = '0';
    observer.observe(category);
});

// ==================== Dynamic Date in Footer ====================
const footerDate = document.querySelector('.footer-bottom p');
if (footerDate) {
    const currentYear = new Date().getFullYear();
    footerDate.innerHTML = `&copy; ${currentYear} Black Woods. Tous droits réservés.`;
}

// ==================== Parallax Effect ====================
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.backgroundPositionY = scrolled * 0.5 + 'px';
    }
});

// ==================== Menu Item Hover Effect ====================
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.transform = 'translateX(10px) scale(1.02)';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.transform = 'translateX(10px) scale(1)';
    });
});

// ==================== Load Menu from Database ====================
async function loadHomeMenu() {
    try {
        const db = new BlackWoodsDB();
        await db.initialize();
        const menuItems = await db.getMenu();
        
        // Grouper les items par catégorie
        const categories = {
            plats: { title: '⭐ Nos Plats ⭐', items: [] },
            boissons: { title: '🍹 Boissons 🍹', items: [] },
            gourmandises: { title: '🧁 Gourmandise 🧁', items: [] }
        };
        
        menuItems.forEach(item => {
            if (item.available && categories[item.category]) {
                categories[item.category].items.push(item);
            }
        });
        
        // Générer le HTML du menu
        const menuContainer = document.querySelector('.menu-categories');
        if (menuContainer) {
            menuContainer.innerHTML = Object.values(categories).map(category => {
                if (category.items.length === 0) return '';
                
                return `
                    <div class="menu-category">
                        <h3>${category.title}</h3>
                        <div class="menu-items">
                            ${category.items.map(item => `
                                <div class="menu-item">
                                    <div class="item-header">
                                        <h4>${item.name}</h4>
                                        <span class="price">${item.price}$</span>
                                    </div>
                                    ${item.calories ? `<p>${item.calories} kcal</p>` : ''}
                                    ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('');
            
            // Réappliquer les animations après chargement
            document.querySelectorAll('.menu-item').forEach(item => {
                item.style.opacity = '0';
                observer.observe(item);
                
                item.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateX(10px) scale(1.02)';
                });
                
                item.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateX(10px) scale(1)';
                });
            });
            
            document.querySelectorAll('.menu-category').forEach(category => {
                category.style.opacity = '0';
                observer.observe(category);
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement du menu:', error);
    }
}

// ==================== Initialize ====================
// Charger le menu depuis la base de données au chargement de la page
if (document.querySelector('.menu-categories')) {
    loadHomeMenu();
}
