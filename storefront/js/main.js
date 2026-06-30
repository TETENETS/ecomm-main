import { API_URL, fetchBCV, renderHeader, renderCartArea, renderFooter, updateCartUI, getCart, saveCart, getImageUrl } from './components.js';

let products = [];
let productLines = [];
let categories = [];
let currentLineId = null;
let searchQuery = '';
let filterCategoryId = '';
let slideIntervals = [];

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    
    // Layout Base
    app.innerHTML = `
        ${renderHeader()}
        ${renderCartArea()}
        
        <div class="top_catagory_area section-padding-80 clearfix">
            <div class="container">
                <div class="row" id="product-lines-container"></div>
            </div>
        </div>

        <section class="new_arrivals_area section-padding-80 clearfix" id="main-catalog-section">
            <div class="container">
                <div class="row">
                    <div class="col-12">
                        <div class="section-heading text-center" id="catalog-header-container">
                            <h2>Catálogo de Productos</h2>
                        </div>
                    </div>
                </div>
                <div class="row" id="product-list-container"></div>
            </div>
        </section>

        ${renderFooter()}
    `;

    // Initialize UI plugins for cart (from ecometri template)
    if (typeof jQuery !== 'undefined') {
        const $ = jQuery;
        $('#essenceCartBtn').on('click', function () {
            $('.right-side-cart-area').addClass('cart-on');
        });
        $('#rightSideCart').on('click', function () {
            $('.right-side-cart-area').removeClass('cart-on');
        });
    }

    updateCartUI();
    fetchBCV().then(() => loadData());
});

async function loadData() {
    try {
        const [linesRes, prodsRes, catsRes] = await Promise.all([
            fetch(`${API_URL}/public/product-lines`),
            fetch(`${API_URL}/public/products`),
            fetch(`${API_URL}/public/categories`)
        ]);
        productLines = await linesRes.json();
        products = await prodsRes.json();
        categories = await catsRes.json();

        // Sort products by category A-Z initially
        products.sort((a, b) => {
            const catA = a.category ? a.category.name.toLowerCase() : 'zzz';
            const catB = b.category ? b.category.name.toLowerCase() : 'zzz';
            return catA.localeCompare(catB);
        });

        renderProductLines();
        renderProducts();
    } catch (err) {
        console.error('Error loading data:', err);
    }
}

window.updateFilters = function() {
    searchQuery = document.getElementById('storeSearch').value.toLowerCase();
    filterCategoryId = document.getElementById('storeCategory').value;
    renderProducts();
};

function renderProductLines() {
    const container = document.getElementById('product-lines-container');
    if (!container) return;
    container.innerHTML = '';
    
    // Clear old intervals
    slideIntervals.forEach(clearInterval);
    slideIntervals = [];
    
    productLines.forEach((l, idx) => {
        let defaultBg = l.imageUrl ? getImageUrl(l.imageUrl) : 'img/bg-img/bg-' + ((idx % 4) + 2) + '.jpg';
        
        // Gather images for slideshow
        let lineProds = products.filter(p => p.productLineId === l.id);
        let images = [defaultBg];
        lineProds.forEach(p => {
            if (p.imageUrl) images.push(getImageUrl(p.imageUrl));
        });

        container.innerHTML += `
            <div class="col-12 col-sm-6 col-md-4">
                <div id="line-card-${l.id}" class="single_catagory_area d-flex align-items-center justify-content-center bg-img" style="background-image: url(${defaultBg}); cursor: pointer;" onclick="window.showProductLine(${l.id})">
                    <div class="catagory-content">
                        <a href="javascript:void(0)" onclick="event.preventDefault(); window.showProductLine(${l.id})">${l.name}</a>
                    </div>
                </div>
            </div>
        `;
    });

    // Start slideshow intervals
    productLines.forEach(l => {
        let defaultBg = l.imageUrl ? getImageUrl(l.imageUrl) : null;
        let lineProds = products.filter(p => p.productLineId === l.id);
        let images = [];
        if (defaultBg) images.push(defaultBg);
        lineProds.forEach(p => {
            if (p.imageUrl) images.push(getImageUrl(p.imageUrl));
        });

        if (images.length > 1) {
            let imgIdx = 0;
            const cardEl = document.getElementById(`line-card-${l.id}`);
            const interval = setInterval(() => {
                imgIdx = (imgIdx + 1) % images.length;
                if (cardEl) {
                    cardEl.style.transition = 'background-image 1s ease-in-out';
                    cardEl.style.backgroundImage = `url(${images[imgIdx]})`;
                }
            }, 3000);
            slideIntervals.push(interval);
        }
    });
}

let lastRenderedLineId = undefined;

function renderProducts() {
    const container = document.getElementById('product-list-container');
    const headerContainer = document.getElementById('catalog-header-container');
    if (!container || !headerContainer) return;

    if (lastRenderedLineId !== currentLineId) {
        let filtersHtml = `
            <div class="row mb-4 mt-4 justify-content-center" style="max-width: 800px; margin: 0 auto;">
                <div class="col-12 d-flex gap-2" style="gap: 10px;">
                    <input type="text" id="storeSearch" class="form-control" placeholder="Buscar productos..." value="${searchQuery}" onkeyup="window.updateFilters()">
                    <select id="storeCategory" class="form-control" onchange="window.updateFilters()">
                        <option value="">Todas las Categorías</option>
                        ${categories.map(c => `<option value="${c.id}" ${filterCategoryId == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;

        if (currentLineId) {
            const line = productLines.find(l => l.id === currentLineId);
            let bannerBg = line && line.imageUrl ? getImageUrl(line.imageUrl) : 'img/bg-img/bg-2.jpg';
            
            headerContainer.innerHTML = `
                <div style="width: 100%; height: 300px; background-image: url(${bannerBg}); background-size: cover; background-position: center; border-radius: 15px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: inset 0 0 0 2000px rgba(0,0,0,0.3);">
                    <div style="padding: 20px 40px; border-radius: 10px;">
                        <h2 style="color: white; margin: 0; font-size: 3rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">${line ? line.name : 'Línea de Producto'}</h2>
                    </div>
                </div>
                <button class="btn essence-btn mb-4" onclick="window.showAllProducts()">← Volver al Catálogo Completo</button>
                ${filtersHtml}
            `;
        } else {
            headerContainer.innerHTML = `<h2>Catálogo de Productos</h2> ${filtersHtml}`;
        }
        lastRenderedLineId = currentLineId;
    }

    let filteredProducts = products.filter(p => p.stock > 0);
    if (currentLineId) {
        filteredProducts = filteredProducts.filter(p => p.productLineId === currentLineId);
    }
    if (searchQuery) {
        filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(searchQuery));
    }
    if (filterCategoryId) {
        filteredProducts = filteredProducts.filter(p => p.categoryId == filterCategoryId);
    }

    container.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">No se encontraron productos con estos filtros.</p></div>';
    }

    filteredProducts.forEach(p => {
        let mainImg = p.imageUrl ? getImageUrl(p.imageUrl) : 'img/product-img/product-1.jpg';
        let priceUsd = p.price ? Number(p.price) : 0;
        let priceStr = p.price ? `$${priceUsd.toFixed(2)} / Bs. ${(priceUsd * window.tasaBCV).toFixed(2)}` : '';
        let hasVariants = p.variants && p.variants.length > 0;
        
        let variantsHtml = '';
        if (hasVariants) {
            priceUsd = Number(p.variants[0].price);
            priceStr = `$${priceUsd.toFixed(2)} / Bs. ${(priceUsd * window.tasaBCV).toFixed(2)}`;
            variantsHtml = `
                <select id="var-${p.id}" class="form-control mb-2" onchange="window.changeVariant(${p.id})">
                    <option value="" disabled selected>Seleccionar</option>
                    ${p.variants.map(v => `<option value="${v.id}" data-price="${v.price}" data-img="${v.imageUrl || ''}">${v.name} - $${Number(v.price).toFixed(2)}</option>`).join('')}
                </select>
            `;
        }

        container.innerHTML += `
            <div class="col-12 col-sm-6 col-lg-4">
                <div class="single-product-wrapper">
                    <div class="product-img">
                        <img id="prod-img-${p.id}" src="${mainImg}" data-main-img="${p.imageUrl ? getImageUrl(p.imageUrl) : 'img/product-img/product-1.jpg'}" alt="" style="height: 300px; object-fit: cover;">
                    </div>
                    <div class="product-description">
                        <h6>${p.name}</h6>
                        <p class="product-price" id="price-lbl-${p.id}">${priceStr}</p>
                        ${variantsHtml}
                        <div class="d-flex align-items-center justify-content-between mb-2">
                            <span class="text-muted" style="font-size: 0.9em; font-weight: 500;">Cantidad:</span>
                            <input type="number" id="qty-${p.id}" class="form-control text-center" value="1" min="1" style="width: 70px; padding: 0.2rem;">
                        </div>
                        <div class="hover-content">
                            <div class="add-to-cart-btn">
                                <button class="btn essence-btn w-100" onclick="window.addToCart(${p.id})">Añadir al Carrito</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

window.addToCart = function(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    let variantId = null;
    let variantName = 'Default';
    let finalPrice = parseFloat(prod.price) || 0;

    let maxStock = prod.stock || 0;

    if (prod.variants && prod.variants.length > 0) {
        const select = document.getElementById(`var-${prod.id}`);
        if (!select.value) {
            alert("Por favor selecciona una variante (ej. talla/color).");
            return;
        }
        variantId = parseInt(select.value);
        const opt = select.options[select.selectedIndex];
        variantName = opt.text.split(' - ')[0];
        finalPrice = parseFloat(opt.getAttribute('data-price'));
        
        const variantObj = prod.variants.find(v => v.id === variantId);
        maxStock = variantObj ? variantObj.stock : 0;
    }

    const qtyInput = document.getElementById(`qty-${prod.id}`);
    const quantity = qtyInput ? parseInt(qtyInput.value) : 1;

    const cart = getCart();
    
    // Check if item already exists in cart with same variant
    const existingIndex = cart.findIndex(i => i.productId === prod.id && i.variantId === variantId);
    const existingQuantity = existingIndex > -1 ? cart[existingIndex].quantity : 0;

    if (existingQuantity + quantity > maxStock) {
        alert(`¡Stock insuficiente! Sólo quedan ${maxStock} unidades disponibles de este producto/variante.`);
        return;
    }
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
        cart[existingIndex].maxStock = maxStock;
    } else {
        cart.push({
            productId: prod.id,
            variantId: variantId,
            productName: prod.name,
            variantName: variantName,
            price: finalPrice,
            quantity: quantity,
            maxStock: maxStock,
            imageUrl: prod.imageUrl ? getImageUrl(prod.imageUrl) : 'img/product-img/product-1.jpg'
        });
    }

    saveCart(cart);
    
    // Auto open cart
    if (typeof jQuery !== 'undefined') {
        jQuery('.right-side-cart-area').addClass('cart-on');
    }
};

window.changeVariant = function(productId) {
    const select = document.getElementById(`var-${productId}`);
    const imgEl = document.getElementById(`prod-img-${productId}`);
    const priceLbl = document.getElementById(`price-lbl-${productId}`);
    if (!select || !imgEl) return;
    
    const opt = select.options[select.selectedIndex];
    const varImg = opt.getAttribute('data-img');
    const mainImg = imgEl.getAttribute('data-main-img');
    const varPrice = parseFloat(opt.getAttribute('data-price'));
    
    if (varImg) {
        imgEl.src = getImageUrl(varImg);
    } else {
        imgEl.src = mainImg;
    }
    
    if (priceLbl && !isNaN(varPrice)) {
        priceLbl.innerText = `$${varPrice.toFixed(2)} / Bs. ${(varPrice * window.tasaBCV).toFixed(2)}`;
    }
};

window.showProductLine = function(lineId) {
    currentLineId = lineId;
    const linesContainer = document.querySelector('.top_catagory_area');
    if (linesContainer) linesContainer.style.display = 'none';
    
    renderProducts();
    
    // Scroll to catalog
    document.getElementById('main-catalog-section').scrollIntoView({ behavior: 'smooth' });
};

window.showAllProducts = function() {
    currentLineId = null;
    const linesContainer = document.querySelector('.top_catagory_area');
    if (linesContainer) linesContainer.style.display = 'block';
    
    renderProducts();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
