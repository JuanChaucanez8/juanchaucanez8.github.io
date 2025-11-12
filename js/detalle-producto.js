// Manejo de la página de detalle de producto - Adaptado para SPA

// Cargar detalle del producto
async function loadProductDetail(productId) {
    showLoading(true);
    
    const { data: product, error } = await supabase
        .from('productos')
        .select(`
            *,
            profiles:vendedor_id (
                nombre,
                negocio,
                email
            )
        `)
        .eq('id', productId)
        .single();
    
    showLoading(false);
    
    if (error || !product) {
        console.error('Error al cargar producto:', error);
        showProductNotFound();
        return;
    }
    
    displayProductDetail(product);
}

// Mostrar detalle del producto
function displayProductDetail(product) {
    const container = document.getElementById('productDetailContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="product-detail">
            <div class="product-detail-image">
                <img src="${product.imagen_url || './assets/placeholder.jpg'}" alt="${product.nombre}">
            </div>
            <div class="product-detail-info">
                <h1>${product.nombre}</h1>
                <div class="product-vendor-info">
                    <p><strong>Vendedor:</strong> ${product.profiles.negocio || product.profiles.nombre}</p>
                    <p><strong>Contacto:</strong> ${product.profiles.email}</p>
                </div>
                <div class="product-description-full">
                    <h3>Descripción</h3>
                    <p>${product.descripcion || 'No hay descripción disponible.'}</p>
                </div>
                <div class="product-price-section">
                    <h2 class="product-price">$${formatPrice(product.precio)} COP</h2>
                    <p class="product-shipping">Envío calculado al finalizar la compra</p>
                </div>
                <div class="product-actions-detail">
                    <button class="btn btn-primary btn-large add-to-cart-detail" 
                            data-id="${product.id}"
                            data-name="${product.nombre}"
                            data-price="${product.precio}"
                            data-image="${product.imagen_url || './assets/placeholder.jpg'}">
                        Agregar al Carrito
                    </button>
                    <button class="btn btn-secondary btn-large buy-now" 
                            data-id="${product.id}"
                            data-name="${product.nombre}"
                            data-price="${product.precio}">
                        Comprar Ahora
                    </button>
                </div>
                <div class="product-meta">
                    <p><strong>Publicado:</strong> ${new Date(product.created_at).toLocaleDateString('es-CO')}</p>
                    ${product.updated_at !== product.created_at ? 
                        `<p><strong>Actualizado:</strong> ${new Date(product.updated_at).toLocaleDateString('es-CO')}</p>` : ''}
                </div>
            </div>
        </div>
        
        <div class="related-products">
            <h3>Productos Relacionados</h3>
            <div id="relatedProductsContainer" class="products-grid">
                <!-- Productos relacionados se cargarán aquí -->
            </div>
        </div>
    `;
    
    // Configurar event listeners para los botones
    setupDetailPageEvents(product);
    
    // Cargar productos relacionados
    loadRelatedProducts(product.vendedor_id, product.id);
}

// Configurar event listeners de la página de detalle
function setupDetailPageEvents(product) {
    // Botón de agregar al carrito
    const addToCartBtn = document.querySelector('.add-to-cart-detail');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            addToCart(
                product.id, 
                product.nombre, 
                product.precio, 
                product.imagen_url || './assets/placeholder.jpg'
            );
        });
    }
    
    // Botón de comprar ahora
    const buyNowBtn = document.querySelector('.buy-now');
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', function() {
            buyNow(product);
        });
    }
}

// Agregar al carrito desde detalle de producto
async function addToCart(productId, productName, productPrice, productImage) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        alert('Debes iniciar sesión para agregar productos al carrito');
        showSection('login');
        return;
    }
    
    // Verificar si el producto ya está en el carrito
    const { data: existingItem, error: checkError } = await supabase
        .from('carrito')
        .select('id, cantidad')
        .eq('user_id', user.id)
        .eq('producto_id', productId)
        .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error al verificar carrito:', checkError);
        return;
    }
    
    if (existingItem) {
        // Actualizar cantidad si ya existe
        const { error: updateError } = await supabase
            .from('carrito')
            .update({ cantidad: existingItem.cantidad + 1 })
            .eq('id', existingItem.id);
        
        if (updateError) {
            console.error('Error al actualizar carrito:', updateError);
            alert('Error al agregar producto al carrito');
        } else {
            showNotification('Producto agregado al carrito', 'success');
            updateCartCount();
        }
    } else {
        // Agregar nuevo item al carrito
        const { error: insertError } = await supabase
            .from('carrito')
            .insert([{
                user_id: user.id,
                producto_id: productId,
                cantidad: 1
            }]);
        
        if (insertError) {
            console.error('Error al agregar al carrito:', insertError);
            alert('Error al agregar producto al carrito');
        } else {
            showNotification('Producto agregado al carrito', 'success');
            updateCartCount();
        }
    }
}

// Comprar ahora (redirige al carrito con este producto)
async function buyNow(product) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        alert('Debes iniciar sesión para comprar productos');
        showSection('login');
        return;
    }
    
    // Primero vaciar el carrito actual
    const { error: deleteError } = await supabase
        .from('carrito')
        .delete()
        .eq('user_id', user.id);
    
    if (deleteError) {
        console.error('Error al vaciar carrito:', deleteError);
    }
    
    // Agregar solo este producto al carrito
    const { error: insertError } = await supabase
        .from('carrito')
        .insert([{
            user_id: user.id,
            producto_id: product.id,
            cantidad: 1
        }]);
    
    if (insertError) {
        console.error('Error al agregar producto:', insertError);
        alert('Error al procesar la compra');
    } else {
        // Redirigir al carrito
        showSection('cart');
    }
}

// Cargar productos relacionados
async function loadRelatedProducts(vendedorId, excludeProductId) {
    const { data: relatedProducts, error } = await supabase
        .from('productos')
        .select(`
            *,
            profiles:vendedor_id (
                nombre,
                negocio
            )
        `)
        .eq('vendedor_id', vendedorId)
        .neq('id', excludeProductId)
        .limit(4)
        .order('created_at', { ascending: false });
    
    if (error || !relatedProducts || relatedProducts.length === 0) {
        // Ocultar sección de productos relacionados si no hay
        const relatedSection = document.querySelector('.related-products');
        if (relatedSection) {
            relatedSection.style.display = 'none';
        }
        return;
    }
    
    const container = document.getElementById('relatedProductsContainer');
    if (!container) return;
    
    container.innerHTML = relatedProducts.map(product => `
        <div class="product-card" data-id="${product.id}">
            <div class="product-image">
                <img src="${product.imagen_url || './assets/placeholder.jpg'}" alt="${product.nombre}" 
                     onclick="showProductDetail('${product.id}')">
            </div>
            <div class="product-info">
                <h3 onclick="showProductDetail('${product.id}')">${product.nombre}</h3>
                <p class="product-description">${product.descripcion}</p>
                <p class="product-price">$${formatPrice(product.precio)} COP</p>
                <div class="product-actions">
                    <button class="btn btn-primary btn-small view-detail" 
                            onclick="showProductDetail('${product.id}')">
                        Ver Detalle
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Mostrar mensaje de carga
function showLoading(show) {
    const loadingElement = document.getElementById('loadingProduct');
    const detailContainer = document.getElementById('productDetailContainer');
    const notFoundElement = document.getElementById('productNotFound');
    
    if (loadingElement) loadingElement.style.display = show ? 'block' : 'none';
    if (detailContainer) detailContainer.style.display = show ? 'none' : 'block';
    if (notFoundElement) notFoundElement.style.display = 'none';
}

// Mostrar mensaje de producto no encontrado
function showProductNotFound() {
    const loadingElement = document.getElementById('loadingProduct');
    const detailContainer = document.getElementById('productDetailContainer');
    const notFoundElement = document.getElementById('productNotFound');
    
    if (loadingElement) loadingElement.style.display = 'none';
    if (detailContainer) detailContainer.style.display = 'none';
    if (notFoundElement) notFoundElement.style.display = 'block';
}

// Formatear precio
function formatPrice(price) {
    return new Intl.NumberFormat('es-CO').format(price);
}