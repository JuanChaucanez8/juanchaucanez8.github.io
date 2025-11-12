// Manejo del carrito de compras - Adaptado para SPA

let cartItems = [];

// Cargar items del carrito
async function loadCart() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showSection('login');
        return;
    }
    
    const { data: items, error } = await supabase
        .from('carrito')
        .select(`
            *,
            productos:producto_id (
                nombre,
                descripcion,
                imagen_url,
                precio,
                vendedor_id
            )
        `)
        .eq('user_id', user.id);
    
    if (error) {
        console.error('Error al cargar carrito:', error);
        return;
    }
    
    cartItems = items || [];
    displayCartItems();
    updateCartSummary();
    
    // Configurar event listeners
    setupCartEvents();
}

// Mostrar items del carrito
function displayCartItems() {
    const container = document.getElementById('cartItemsContainer');
    const emptyMessage = document.getElementById('emptyCartMessage');
    
    if (!container || !emptyMessage) return;
    
    if (cartItems.length === 0) {
        container.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }
    
    container.style.display = 'block';
    emptyMessage.style.display = 'none';
    
    container.innerHTML = cartItems.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-image">
                <img src="${item.productos.imagen_url || './assets/placeholder.jpg'}" alt="${item.productos.nombre}">
            </div>
            <div class="cart-item-info">
                <h3 class="cart-item-name">${item.productos.nombre}</h3>
                <p class="cart-item-description">${item.productos.descripcion}</p>
                <p class="cart-item-price">$${formatPrice(item.productos.precio)} COP c/u</p>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-controls">
                    <button class="btn btn-small decrease-quantity" data-id="${item.id}">-</button>
                    <span class="quantity">${item.cantidad}</span>
                    <button class="btn btn-small increase-quantity" data-id="${item.id}">+</button>
                </div>
                <p class="item-total">Total: $${formatPrice(item.productos.precio * item.cantidad)} COP</p>
                <button class="btn btn-small btn-danger remove-item" data-id="${item.id}">Eliminar</button>
            </div>
        </div>
    `).join('');
    
    // Agregar event listeners a los botones
    setupItemEventListeners();
}

// Configurar event listeners para los items del carrito
function setupItemEventListeners() {
    // Botones de aumentar cantidad
    document.querySelectorAll('.increase-quantity').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            updateQuantity(itemId, 1);
        });
    });
    
    // Botones de disminuir cantidad
    document.querySelectorAll('.decrease-quantity').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            updateQuantity(itemId, -1);
        });
    });
    
    // Botones de eliminar
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            removeFromCart(itemId);
        });
    });
}

// Configurar event listeners generales del carrito
function setupCartEvents() {
    // Botón de vaciar carrito
    const clearCartBtn = document.getElementById('clearCartBtn');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }
    
    // Botón de proceder al pago
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', proceedToCheckout);
    }
}

// Actualizar cantidad de un item
async function updateQuantity(itemId, change) {
    const item = cartItems.find(item => item.id === itemId);
    if (!item) return;
    
    const newQuantity = item.cantidad + change;
    
    if (newQuantity < 1) {
        removeFromCart(itemId);
        return;
    }
    
    const { error } = await supabase
        .from('carrito')
        .update({ cantidad: newQuantity })
        .eq('id', itemId);
    
    if (error) {
        console.error('Error al actualizar cantidad:', error);
        alert('Error al actualizar la cantidad');
    } else {
        // Actualizar localmente y refrescar display
        item.cantidad = newQuantity;
        displayCartItems();
        updateCartSummary();
        updateCartCount();
    }
}

// Eliminar item del carrito
async function removeFromCart(itemId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto del carrito?')) {
        return;
    }
    
    const { error } = await supabase
        .from('carrito')
        .delete()
        .eq('id', itemId);
    
    if (error) {
        console.error('Error al eliminar del carrito:', error);
        alert('Error al eliminar el producto');
    } else {
        // Actualizar localmente y refrescar display
        cartItems = cartItems.filter(item => item.id !== itemId);
        displayCartItems();
        updateCartSummary();
        updateCartCount();
    }
}

// Vaciar carrito completo
async function clearCart() {
    if (!confirm('¿Estás seguro de que quieres vaciar todo el carrito?')) {
        return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase
        .from('carrito')
        .delete()
        .eq('user_id', user.id);
    
    if (error) {
        console.error('Error al vaciar carrito:', error);
        alert('Error al vaciar el carrito');
    } else {
        cartItems = [];
        displayCartItems();
        updateCartSummary();
        updateCartCount();
    }
}

// Proceder al pago
async function proceedToCheckout() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    if (cartItems.length === 0) {
        alert('El carrito está vacío');
        return;
    }
    
    // Registrar las compras
    for (const item of cartItems) {
        const total = item.productos.precio * item.cantidad;
        
        // Insertar en historial de compras
        const { error: compraError } = await supabase
            .from('compras')
            .insert([{
                comprador_id: user.id,
                producto_id: item.producto_id,
                cantidad: item.cantidad,
                total: total
            }]);
        
        if (compraError) {
            console.error('Error al registrar compra:', compraError);
            alert('Error al procesar la compra');
            return;
        }
        
        // Actualizar estadísticas del comprador
        await updateCompradorStats(user.id, item.cantidad);
        
        // Actualizar estadísticas del vendedor
        await updateVendedorStats(item.productos.vendedor_id, item.cantidad, total);
    }
    
    // Vaciar carrito después de la compra
    const { error } = await supabase
        .from('carrito')
        .delete()
        .eq('user_id', user.id);
    
    if (error) {
        console.error('Error al vaciar carrito después de compra:', error);
    }
    
    showNotification('¡Compra realizada exitosamente!', 'success');
    cartItems = [];
    displayCartItems();
    updateCartSummary();
    updateCartCount();
    
    // Redirigir al perfil del comprador
    showSection('profile-comprador');
}

// Actualizar estadísticas del comprador
async function updateCompradorStats(userId, cantidad) {
    // Obtener estadísticas actuales
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('objetos_comprados')
        .eq('id', userId)
        .single();
    
    if (error) return;
    
    const nuevosObjetos = (profile.objetos_comprados || 0) + cantidad;
    
    await supabase
        .from('profiles')
        .update({ objetos_comprados: nuevosObjetos })
        .eq('id', userId);
}

// Actualizar estadísticas del vendedor
async function updateVendedorStats(vendedorId, cantidad, total) {
    // Obtener estadísticas actuales
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('productos_vendidos')
        .eq('id', vendedorId)
        .single();
    
    if (error) return;
    
    const nuevosVendidos = (profile.productos_vendidos || 0) + cantidad;
    
    await supabase
        .from('profiles')
        .update({ productos_vendidos: nuevosVendidos })
        .eq('id', vendedorId);
}

// Actualizar resumen del carrito
function updateCartSummary() {
    const summaryElement = document.getElementById('cartSummary');
    const totalElement = document.getElementById('cartTotal');
    
    if (!summaryElement || !totalElement) return;
    
    if (cartItems.length === 0) {
        summaryElement.style.display = 'none';
        return;
    }
    
    summaryElement.style.display = 'block';
    
    const total = cartItems.reduce((sum, item) => {
        return sum + (item.productos.precio * item.cantidad);
    }, 0);
    
    totalElement.textContent = formatPrice(total);
}

// Formatear precio
function formatPrice(price) {
    return new Intl.NumberFormat('es-CO').format(price);
}