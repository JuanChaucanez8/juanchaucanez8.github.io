// Manejo de productos para vendedores - Adaptado para SPA

document.addEventListener('DOMContentLoaded', function() {
    // Configurar modal de productos si estamos en la sección de vendedor
    if (document.getElementById('productModal')) {
        setupProductModal();
    }
});

// Cargar perfil del vendedor
async function loadVendedorProfile() {
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
    document.getElementById('profileNombre').textContent = profile.nombre || 'No especificado';
    document.getElementById('profileNegocio').textContent = profile.negocio || 'No especificado';
    document.getElementById('profileEmail').textContent = profile.email;
    document.getElementById('productosVendidos').textContent = profile.productos_vendidos || 0;
    document.getElementById('productosPublicados').textContent = profile.productos_publicados || 0;
    
    // Cargar productos del vendedor
    loadVendedorProducts(user.id);
}

// Cargar productos del vendedor
async function loadVendedorProducts(userId) {
    const { data: products, error } = await supabase
        .from('productos')
        .select('*')
        .eq('vendedor_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error al cargar productos:', error);
        return;
    }
    
    const productsContainer = document.getElementById('productosList');
    if (!productsContainer) return;
    
    if (products.length === 0) {
        productsContainer.innerHTML = '<p class="no-products">No has publicado ningún producto aún.</p>';
        return;
    }
    
    // Generar HTML para cada producto
    productsContainer.innerHTML = products.map(product => `
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
                    <button class="btn btn-small edit-product" data-id="${product.id}">Editar</button>
                    <button class="btn btn-small btn-danger delete-product" data-id="${product.id}">Eliminar</button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Agregar event listeners para los botones
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            editProduct(productId);
        });
    });
    
    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            deleteProduct(productId);
        });
    });
}

// Configurar modal de productos
function setupProductModal() {
    const modal = document.getElementById('productModal');
    const addProductBtn = document.getElementById('addProductBtn');
    const closeModal = document.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancelProductBtn');
    const productForm = document.getElementById('productForm');
    const imageInput = document.getElementById('productImage');
    const imagePreview = document.getElementById('imagePreview');
    
    // Abrir modal para agregar producto
    if (addProductBtn) {
        addProductBtn.addEventListener('click', function() {
            document.getElementById('modalTitle').textContent = 'Agregar Producto';
            productForm.reset();
            imagePreview.innerHTML = '';
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
    
    // Vista previa de imagen
    if (imageInput) {
        imageInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Vista previa">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Enviar formulario de producto
    if (productForm) {
        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveProduct();
        });
    }
}

// Guardar producto (crear o actualizar)
async function saveProduct() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showSection('login');
        return;
    }
    
    const productId = document.getElementById('productId').value;
    const nombre = document.getElementById('productName').value;
    const descripcion = document.getElementById('productDescription').value;
    const precio = parseFloat(document.getElementById('productPrice').value);
    const imageFile = document.getElementById('productImage').files[0];
    
    let imagen_url = '';
    
    // Subir imagen si se proporcionó una nueva
    if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `productos/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, imageFile);
        
        if (uploadError) {
            console.error('Error al subir imagen:', uploadError);
            alert('Error al subir la imagen');
            return;
        }
        
        // Obtener URL pública de la imagen
        const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
        
        imagen_url = urlData.publicUrl;
    }
    
    // Preparar datos del producto
    const productData = {
        nombre,
        descripcion,
        precio,
        vendedor_id: user.id,
        updated_at: new Date().toISOString()
    };
    
    if (imagen_url) {
        productData.imagen_url = imagen_url;
    }
    
    let error;
    
    if (productId) {
        // Actualizar producto existente
        const { error: updateError } = await supabase
            .from('productos')
            .update(productData)
            .eq('id', productId);
        
        error = updateError;
    } else {
        // Crear nuevo producto
        productData.created_at = new Date().toISOString();
        
        const { error: insertError } = await supabase
            .from('productos')
            .insert([productData]);
        
        error = insertError;
        
        // Actualizar contador de productos publicados
        if (!error) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('productos_publicados')
                .eq('id', user.id)
                .single();
            
            const nuevosPublicados = (profile.productos_publicados || 0) + 1;
            
            await supabase
                .from('profiles')
                .update({ productos_publicados: nuevosPublicados })
                .eq('id', user.id);
        }
    }
    
    if (error) {
        console.error('Error al guardar producto:', error);
        alert('Error al guardar el producto');
    } else {
        // Cerrar modal y recargar productos
        document.getElementById('productModal').style.display = 'none';
        loadVendedorProducts(user.id);
        
        // Actualizar contador en el perfil
        if (!productId) {
            const productosPublicados = document.getElementById('productosPublicados');
            if (productosPublicados) {
                productosPublicados.textContent = parseInt(productosPublicados.textContent) + 1;
            }
        }
    }
}

// Editar producto
async function editProduct(productId) {
    const { data: product, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', productId)
        .single();
    
    if (error) {
        console.error('Error al cargar producto:', error);
        return;
    }
    
    // Llenar el formulario con los datos del producto
    document.getElementById('modalTitle').textContent = 'Editar Producto';
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.nombre;
    document.getElementById('productDescription').value = product.descripcion;
    document.getElementById('productPrice').value = product.precio;
    
    // Mostrar imagen actual si existe
    const imagePreview = document.getElementById('imagePreview');
    if (product.imagen_url) {
        imagePreview.innerHTML = `<img src="${product.imagen_url}" alt="Vista previa">`;
    } else {
        imagePreview.innerHTML = '';
    }
    
    // Mostrar modal
    document.getElementById('productModal').style.display = 'block';
}

// Eliminar producto
async function deleteProduct(productId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', productId)
        .eq('vendedor_id', user.id);
    
    if (error) {
        console.error('Error al eliminar producto:', error);
        alert('Error al eliminar el producto');
    } else {
        // Recargar productos
        loadVendedorProducts(user.id);
        
        // Actualizar contador en el perfil
        const productosPublicados = document.getElementById('productosPublicados');
        if (productosPublicados) {
            productosPublicados.textContent = parseInt(productosPublicados.textContent) - 1;
        }
        
        // Actualizar en la base de datos
        const { data: profile } = await supabase
            .from('profiles')
            .select('productos_publicados')
            .eq('id', user.id)
            .single();
        
        const nuevosPublicados = Math.max(0, (profile.productos_publicados || 0) - 1);
        
        await supabase
            .from('profiles')
            .update({ productos_publicados: nuevosPublicados })
            .eq('id', user.id);
    }
}

// Formatear precio
function formatPrice(price) {
    return new Intl.NumberFormat('es-CO').format(price);
}