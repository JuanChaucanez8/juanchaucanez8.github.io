// Manejo del perfil del comprador - Adaptado para SPA

document.addEventListener('DOMContentLoaded', function() {
    // Configurar modal de edición de perfil si estamos en la sección de comprador
    if (document.getElementById('editProfileModal')) {
        setupEditProfileModal();
    }
});

// Cargar perfil del comprador
async function loadCompradorProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showSection('login');
        return;
    }
    
    // Obtener información del perfil
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (error) {
        console.error('Error al cargar perfil:', error);
        return;
    }
    
    // Mostrar información en la página
    document.getElementById('profileNombreComprador').textContent = profile.nombre || 'No especificado';
    document.getElementById('profileEmailComprador').textContent = profile.email;
    document.getElementById('profileDescripcion').textContent = profile.descripcion || 'No hay descripción';
    document.getElementById('objetosComprados').textContent = profile.objetos_comprados || 0;
    
    // Cargar historial de compras
    loadHistorialCompras(user.id);
    
    // Actualizar contador de compras realizadas
    updateComprasRealizadas(user.id);
}

// Cargar historial de compras
async function loadHistorialCompras(userId) {
    const { data: compras, error } = await supabase
        .from('compras')
        .select(`
            *,
            productos:producto_id (
                nombre,
                imagen_url,
                precio
            )
        `)
        .eq('comprador_id', userId)
        .order('fecha_compra', { ascending: false });
    
    if (error) {
        console.error('Error al cargar historial:', error);
        return;
    }
    
    const historialContainer = document.getElementById('historialCompras');
    if (!historialContainer) return;
    
    if (compras.length === 0) {
        historialContainer.innerHTML = '<p class="no-products">No has realizado ninguna compra aún.</p>';
        return;
    }
    
    // Generar HTML para cada compra
    historialContainer.innerHTML = compras.map(compra => `
        <div class="compra-item">
            <div class="compra-image">
                <img src="${compra.productos.imagen_url || './assets/placeholder.jpg'}" alt="${compra.productos.nombre}">
            </div>
            <div class="compra-info">
                <h4>${compra.productos.nombre}</h4>
                <p class="compra-date">Comprado el: ${new Date(compra.fecha_compra).toLocaleDateString('es-CO')}</p>
                <p class="compra-quantity">Cantidad: ${compra.cantidad}</p>
                <p class="compra-total">Total: $${formatPrice(compra.total)} COP</p>
            </div>
        </div>
    `).join('');
}

// Actualizar contador de compras realizadas
async function updateComprasRealizadas(userId) {
    const { data: compras, error } = await supabase
        .from('compras')
        .select('id')
        .eq('comprador_id', userId);
    
    if (!error && compras) {
        const comprasRealizadasElement = document.getElementById('comprasRealizadas');
        if (comprasRealizadasElement) {
            comprasRealizadasElement.textContent = compras.length;
        }
    }
}

// Configurar modal de edición de perfil
function setupEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    const editProfileBtn = document.getElementById('editProfileBtnComprador');
    const closeModal = document.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const editForm = document.getElementById('editProfileForm');
    
    // Abrir modal para editar perfil
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            // Cargar datos actuales en el formulario
            loadCurrentProfileData();
            modal.style.display = 'block';
        });
    }
    
    // Cerrar modal
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Enviar formulario de edición
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await updateProfile();
        });
    }
}

// Cargar datos actuales del perfil en el formulario
async function loadCurrentProfileData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('nombre, descripcion')
        .eq('id', user.id)
        .single();
    
    if (!error && profile) {
        document.getElementById('editNombre').value = profile.nombre || '';
        document.getElementById('editDescripcion').value = profile.descripcion || '';
    }
}

// Actualizar perfil del comprador
async function updateProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const nombre = document.getElementById('editNombre').value;
    const descripcion = document.getElementById('editDescripcion').value;
    
    const { error } = await supabase
        .from('profiles')
        .update({
            nombre: nombre,
            descripcion: descripcion,
            updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    
    if (error) {
        console.error('Error al actualizar perfil:', error);
        alert('Error al actualizar el perfil');
    } else {
        // Cerrar modal y recargar perfil
        document.getElementById('editProfileModal').style.display = 'none';
        loadCompradorProfile();
        alert('Perfil actualizado correctamente');
    }
}

// Formatear precio (función auxiliar)
function formatPrice(price) {
    return new Intl.NumberFormat('es-CO').format(price);
}