// Manejo de autenticación de usuarios - Adaptado para SPA

// Función para esperar a que Supabase esté listo
async function waitForSupabase(maxWaitTime = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkSupabase = () => {
            if (window.supabase && window.supabase !== null) {
                resolve(window.supabase);
            } else if (Date.now() - startTime > maxWaitTime) {
                reject(new Error('Timeout esperando por Supabase'));
            } else {
                setTimeout(checkSupabase, 100);
            }
        };
        
        checkSupabase();
    });
}

// Verificar estado de autenticación al cargar la página
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Esperar a que Supabase esté listo
        await waitForSupabase();
        
        // Configurar formulario de registro si existe
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            setupRegistration();
        }
        
        // Configurar formulario de login si existe
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            setupLogin();
        }
        
        // Configurar botón de logout si existe
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        // Verificar estado de autenticación
        await checkAuthState();
        
    } catch (error) {
        console.error('Error inicializando la aplicación:', error);
    }
});

// Verificar si el usuario está autenticado
async function checkAuthState() {
    // Asegurarse de que supabase esté disponible
    const client = window.supabase || window.supabaseClient;
    if (!client) {
        console.error('Supabase no está inicializado');
        return;
    }
    
    const { data: { user } } = await client.auth.getUser();
    
    const authLinks = document.getElementById('authLinks');
    const userMenu = document.getElementById('userMenu');
    const profileLink = document.getElementById('profileLink');
    
    if (user) {
        // Usuario autenticado
        if (authLinks) authLinks.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        
        // Actualizar contador del carrito
        updateCartCount();
    } else {
        // Usuario no autenticado
        if (authLinks) authLinks.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }
}

// Configurar el proceso de registro
function setupRegistration() {
    const accountTypeCards = document.querySelectorAll('.account-type-card');
    const registerForm = document.getElementById('registerForm');
    const userTypeInput = document.getElementById('userType');
    const vendedorFields = document.getElementById('vendedorFields');
    const compradorFields = document.getElementById('compradorFields');
    const formTitle = document.getElementById('formTitle');
    
    // Manejar selección de tipo de cuenta
    accountTypeCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remover clase activa de todas las tarjetas
            accountTypeCards.forEach(c => c.classList.remove('active'));
            
            // Agregar clase activa a la tarjeta seleccionada
            this.classList.add('active');
            
            // Obtener tipo de usuario seleccionado
            const selectedType = this.getAttribute('data-type');
            userTypeInput.value = selectedType;
            
            // Mostrar campos específicos según el tipo
            if (selectedType === 'vendedor') {
                if (vendedorFields) vendedorFields.style.display = 'block';
                if (compradorFields) compradorFields.style.display = 'none';
                if (formTitle) formTitle.textContent = 'Registro de Vendedor';
            } else {
                if (vendedorFields) vendedorFields.style.display = 'none';
                if (compradorFields) compradorFields.style.display = 'block';
                if (formTitle) formTitle.textContent = 'Registro de Comprador';
            }
            
            // Mostrar formulario de registro
            if (registerForm) registerForm.style.display = 'block';
        });
    });
    
    // Manejar envío del formulario de registro
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const client = window.supabase || window.supabaseClient;
            if (!client) {
                alert('Error: Sistema no inicializado');
                return;
            }
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const userType = userTypeInput.value;
            
            // Validar campos básicos
            if (!email || !password) {
                alert('Por favor, completa todos los campos requeridos');
                return;
            }
            
            // Registrar usuario en Supabase Auth
            const { data, error } = await client.auth.signUp({
                email: email,
                password: password,
            });
            
            if (error) {
                alert('Error al registrar: ' + error.message);
                return;
            }
            
            // Si el registro fue exitoso, guardar información adicional en la tabla profiles
            if (data.user) {
                let profileData = {
                    id: data.user.id,
                    email: email,
                    user_type: userType,
                    created_at: new Date().toISOString()
                };
                
                // Agregar campos específicos según el tipo de usuario
                if (userType === 'vendedor') {
                    profileData.nombre = document.getElementById('nombre').value || '';
                    profileData.negocio = document.getElementById('negocio').value || '';
                    profileData.productos_vendidos = 0;
                    profileData.productos_publicados = 0;
                } else {
                    profileData.nombre = document.getElementById('nombreComprador').value || '';
                    profileData.descripcion = '';
                    profileData.objetos_comprados = 0;
                }
                
                // Insertar perfil en la base de datos
                const { error: profileError } = await client
                    .from('profiles')
                    .insert([profileData]);
                
                if (profileError) {
                    console.error('Error al crear perfil:', profileError);
                    alert('Error al completar el registro. Intenta nuevamente.');
                } else {
                    alert('Registro exitoso. Ahora puedes iniciar sesión.');
                    showSection('login');
                }
            }
        });
    }
}

// Configurar el proceso de inicio de sesión
function setupLogin() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const client = window.supabase || window.supabaseClient;
            if (!client) {
                alert('Error: Sistema no inicializado');
                return;
            }
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            // Validar campos
            if (!email || !password) {
                alert('Por favor, completa todos los campos');
                return;
            }
            
            // Iniciar sesión con Supabase Auth
            const { data, error } = await client.auth.signInWithPassword({
                email: email,
                password: password,
            });
            
            if (error) {
                alert('Error al iniciar sesión: ' + error.message);
                return;
            }
            
            // Redirigir según el tipo de usuario
            const userType = await getUserType(data.user.id);
            if (userType === 'vendedor') {
                showSection('profile-vendedor');
            } else {
                showSection('profile-comprador');
            }
            
            // Actualizar estado de autenticación
            await checkAuthState();
        });
    }
}

// Obtener tipo de usuario
async function getUserType(userId) {
    const client = window.supabase || window.supabaseClient;
    if (!client) {
        console.error('Supabase no está inicializado');
        return null;
    }
    
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

// Manejar cierre de sesión
async function handleLogout() {
    const client = window.supabase || window.supabaseClient;
    if (!client) {
        console.error('Supabase no está inicializado');
        return;
    }
    
    const { error } = await client.auth.signOut();
    
    if (error) {
        console.error('Error al cerrar sesión:', error);
    } else {
        // Actualizar interfaz
        await checkAuthState();
        // Redirigir a la página principal
        showSection('home');
    }
}

// Actualizar contador del carrito
async function updateCartCount() {
    const cartCountElement = document.getElementById('cartCount');
    if (!cartCountElement) return;
    
    const client = window.supabase || window.supabaseClient;
    if (!client) return;
    
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    
    // Obtener cantidad de productos en el carrito
    const { data, error } = await client
        .from('carrito')
        .select('id')
        .eq('user_id', user.id);
    
    if (!error && data) {
        cartCountElement.textContent = data.length;
    }
}