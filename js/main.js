// Funcionalidades generales de la aplicación - SPA para GitHub Pages

// Estado global de la aplicación
let currentSection = 'home';
let currentProductId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar funcionalidades generales
    initMobileMenu();
    initGeneralInteractions();
    initSPA();
    
    // Mostrar sección inicial basada en hash URL
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        showSection(hash);
    } else {
        showSection('home');
    }
});

// Inicializar Single Page Application
function initSPA() {
    // Manejar cambios en el hash de la URL
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            showSection(hash);
        }
    });
}

// Mostrar sección específica
function showSection(sectionName) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Actualizar estado actual
    currentSection = sectionName;
    
    // Actualizar URL sin recargar la página
    window.history.replaceState(null, null, `#${sectionName}`);
    
    // Mostrar sección específica
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Ejecutar código específico de cada sección al mostrarse
        handleSectionChange(sectionName);
    } else {
        // Si no existe la sección, mostrar home
        showSection('home');
    }
    
    // Cerrar menú móvil si está abierto
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    if (hamburger && navMenu) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }
}

// Manejar cambios de sección
function handleSectionChange(sectionName) {
    switch(sectionName) {
        case 'products':
            // Cargar productos cuando se muestra la sección
            if (typeof loadAllProducts === 'function') {
                loadAllProducts();
            }
            break;
        case 'cart':
            // Cargar carrito cuando se muestra la sección
            if (typeof loadCart === 'function') {
                loadCart();
            }
            break;
        case 'profile-vendedor':
            // Cargar perfil vendedor
            if (typeof loadVendedorProfile === 'function') {
                loadVendedorProfile();
            }
            break;
        case 'profile-comprador':
            // Cargar perfil comprador
            if (typeof loadCompradorProfile === 'function') {
                loadCompradorProfile();
            }
            break;
    }
}

// Mostrar perfil según tipo de usuario
async function showProfile() {
    const client = window.supabase || window.supabaseClient;
    if (!client) return;
    
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
        showSection('login');
        return;
    }
    
    // Obtener tipo de usuario
    const userType = await getUserType(user.id);
    if (userType === 'vendedor') {
        showSection('profile-vendedor');
    } else {
        showSection('profile-comprador');
    }
}

// Obtener tipo de usuario
async function getUserType(userId) {
    const client = window.supabase || window.supabaseClient;
    if (!client) return null;
    
    const { data, error } = await client
        .from('profiles')
        .select('user_type')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('Error al obtener tipo de usuario:', error);
        return null;
    }
    
    return data.user_type;
}

// Mostrar detalle de producto
function showProductDetail(productId) {
    currentProductId = productId;
    showSection('product-detail');
    
    // Cargar detalle del producto
    if (typeof loadProductDetail === 'function') {
        loadProductDetail(productId);
    }
}

// Inicializar menú móvil
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Cerrar menú al hacer clic en un enlace
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
        
        // Cerrar menú al hacer clic fuera de él
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.nav-container')) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
}

// Inicializar interacciones generales
function initGeneralInteractions() {
    // Prevenir envío de formularios vacíos
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredFields = this.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.style.borderColor = '#dc3545';
                } else {
                    field.style.borderColor = '';
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                alert('Por favor, completa todos los campos requeridos.');
            }
        });
    });
    
    // Mejorar experiencia de formularios
    document.querySelectorAll('input, textarea, select').forEach(field => {
        field.addEventListener('invalid', function() {
            this.style.borderColor = '#dc3545';
        });
        
        field.addEventListener('input', function() {
            if (this.checkValidity()) {
                this.style.borderColor = '';
            }
        });
    });
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Estilos para la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    
    // Agregar al documento
    document.body.appendChild(notification);
    
    // Configurar cierre automático
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // Cerrar automáticamente después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Función para formatear fechas
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Función para formatear números como precios
function formatPrice(price) {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

// Función para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Exportar funciones para uso global
window.showSection = showSection;
window.showProfile = showProfile;
window.showProductDetail = showProductDetail;
window.showNotification = showNotification;
window.formatDate = formatDate;
window.formatPrice = formatPrice;
window.isValidEmail = isValidEmail;