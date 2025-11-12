// Manejo de la página pública de productos - Adaptado para SPA

let allProducts = [];
let filteredProducts = [];

// Cargar todos los productos
async function loadAllProducts() {
    showLoading(true);
    
    const { data: products, error } = await supabase
        .from('productos')
        .select(`
            *,
            profiles:vendedor_id (
                nombre,
                negocio
            )
        `)
        .order('created_at', { ascending: false });
    
    showLoading(false);
    
    if (error) {
        console.error('Error al cargar productos:', error);
        showNoProducts(true, 'Error al cargar productos');
        return;
    }
    
    allProducts = products;
    filteredProducts = [...products];
    
    if (products.length === 0) {
        showNoProducts(true, 'No hay productos disponibles');
    } else {
        displayProducts(products);
    }
    
    // Configurar búsqueda y filtros
    setupSearch();
    setupFilters();
}

// Mostrar productos en la página
function displayProducts(products) {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    container.innerHTML = products.map(product => `
        <div class="product-card" data-id="${product.id}">
            <div class="product-image">
                <img src="${product.imagen_url || './assets/placeholder.jpg'}" alt="${product.nombre}" 
                     onclick="showProductDetail('${product.id}')">
            </div>
            <div class="product-info">
                <h3 onclick="showProductDetail('${product.id}')">${product.nombre}</h3>
                <p class="product-vendor">Vendedor: ${product.profiles.negocio || product.profiles.nombre}</p>
                <p class="product-description">${product.descripcion}</p>
                <p class="product-price">$${formatPrice(product.precio)} COP</p>
                <div class="product-actions">
                    <button class="btn btn-primary btn-small add-to-cart" 
                            data-id="${product.id}" 
                            data-name="${product.nombre}"
                            data-price="${product.precio}"
                            data-image="${product.imagen_url || './assets/placeholder.jpg'}">
                        Agregar al Carrito
                    </button>
                    <button class="btn btn-secondary btn-small view-detail" 
                            onclick="showProductDetail('${product.id}')">
                        Ver Detalle
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Agregar event listeners para los botones de carrito
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            const productName = this.getAttribute('data-name');
            const productPrice = this.getAttribute('data-price');
            const productImage = this.getAttribute('data-image');
            
            addToCart(productId, productName, productPrice, productImage);
        });
    });
}

// Configurar sistema de búsqueda
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }
}

// Realizar búsqueda
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => 
            product.nombre.toLowerCase().includes(searchTerm) ||
            product.descripcion.toLowerCase().includes(searchTerm) ||
            (product.profiles.negocio && product.profiles.negocio.toLowerCase().includes(searchTerm))
        );
    }
    
    // Aplicar filtro de ordenamiento actual
    applySorting();
    
    // Mostrar/ocultar botón de limpiar búsqueda
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
    }
}

// Limpiar búsqueda
function clearSearch() {
    document.getElementById('searchInput').value = '';
    filteredProducts = [...allProducts];
    applySorting();
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.style.display = 'none';
    }
}

// Configurar filtros de ordenamiento
function setupFilters() {
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', applySorting);
    }
}

// Aplicar ordenamiento
function applySorting() {
    const sortValue = document.getElementById('sortSelect').value;
    
    let sortedProducts = [...filteredProducts];
    
    switch (sortValue) {
        case 'price_asc':
            sortedProducts.sort((a, b) => a.precio - b.precio);
            break;
        case 'price_desc':
            sortedProducts.sort((a, b) => b.precio - a.precio);
            break;
        case 'name':
            sortedProducts.sort((a, b) => a.nombre.localeCompare(b.nombre));
            break;
        case 'newest':
        default:
            sortedProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
    }
    
    displayProducts(sortedProducts);
}

// Agregar producto al carrito
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
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
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

// Mostrar/ocultar mensaje de carga
function showLoading(show) {
    const loadingElement = document.getElementById('loadingMessage');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

// Mostrar/ocultar mensaje de no productos
function showNoProducts(show, message = 'No se encontraron productos') {
    const noProductsElement = document.getElementById('noProductsMessage');
    if (noProductsElement) {
        noProductsElement.style.display = show ? 'block' : 'none';
        if (message) {
            noProductsElement.querySelector('p').textContent = message;
        }
    }
    
    const productsContainer = document.getElementById('productsContainer');
    if (productsContainer) {
        productsContainer.style.display = show ? 'none' : 'grid';
    }
}

// Formatear precio
function formatPrice(price) {
    return new Intl.NumberFormat('es-CO').format(price);
}