function renderCart() {
    const cart = getCart();
    // support pages that use either an element with id `cart-items` or class `.cart-items-list`
    const container = document.getElementById("cart-items") || document.querySelector('.cart-items-list');

    if (!container) {
        // nothing to render on this page
        return;
    }

    if (!cart || cart.length === 0) {
        container.innerHTML = "<p class=\"empty-cart\">Votre panier est vide.</p>";
        const subtotalEl = document.getElementById("subtotal");
        const totalEl = document.getElementById("total");
        if (subtotalEl) subtotalEl.textContent = "0€";
        if (totalEl) totalEl.textContent = "0€";
        return;
    }

    // Render compact view if using `.cart-items-list` (different markup)
    const usingCompact = container.classList && container.classList.contains('cart-items-list');

    if (usingCompact) {
        container.innerHTML = cart.map(item => `
            <div class="cart-item-mini">
                <img src="${item.image || ''}" alt="${item.name}">
                <div class="info">
                    <h4>${item.name}</h4>
                    <div class="details">Taille: ${item.size} • Qté: ${item.qty}</div>
                </div>
                <div class="price">${((item.price||0) * item.qty).toFixed(2).replace('.00','')}€</div>
            </div>
        `).join('');
    } else {
        container.innerHTML = cart.map(item => `
            <div class="cart-item" data-id="${item.id}" data-size="${item.size}">
                <img src="${item.image || ''}" alt="${item.name}">
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <div class="details">Taille : ${item.size}</div>
                    <div class="qty-controls">
                        <button class="qty-decrease" aria-label="Réduire quantité">−</button>
                        <input class="qty-input-cart" type="number" min="1" value="${item.qty}" aria-label="Quantité">
                        <button class="qty-increase" aria-label="Augmenter quantité">+</button>
                        <button class="remove-btn">Supprimer</button>
                    </div>
                </div>
                <div class="item-price">${((item.price||0) * item.qty).toFixed(2).replace('.00','')}€</div>
            </div>
        `).join("");
    }

    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (item.qty || 0), 0);
    const shipping = subtotal > 100 ? 0 : 4;
    const total = subtotal + shipping;

    const subtotalEl = document.getElementById("subtotal");
    const shippingEl = document.getElementById("shipping");
    const totalEl = document.getElementById("total");

    if (subtotalEl) subtotalEl.textContent = subtotal + "€";
    if (shippingEl) shippingEl.textContent = (shipping === 0 ? "Gratuite" : shipping + "€");
    if (totalEl) totalEl.textContent = total + "€";
}

// Event delegation for quantity controls + remove
function setupCartInteractions() {
    const container = document.getElementById("cart-items") || document.querySelector('.cart-items-list');
    if (!container) return;

    container.addEventListener('click', (e) => {
        const inc = e.target.closest('.qty-increase');
        const dec = e.target.closest('.qty-decrease');
        const rem = e.target.closest('.remove-btn');
        const parent = e.target.closest('.cart-item');
        if (!parent) return;
        const id = parent.dataset.id;
        const size = parent.dataset.size;

        if (inc) {
            const input = parent.querySelector('.qty-input-cart');
            const v = parseInt(input.value, 10) || 1;
            input.value = v + 1;
            updateCartItem(id, size, v + 1);
            renderCart();
            return;
        }

        if (dec) {
            const input = parent.querySelector('.qty-input-cart');
            const v = parseInt(input.value, 10) || 1;
            const nv = Math.max(1, v - 1);
            input.value = nv;
            updateCartItem(id, size, nv);
            renderCart();
            return;
        }

        if (rem) {
            if (confirm('Supprimer cet article du panier ?')) {
                removeCartItem(id, size);
                renderCart();
            }
            return;
        }
    });

    // input change handler
    container.addEventListener('change', (e) => {
        const input = e.target.closest('.qty-input-cart');
        if (!input) return;
        const parent = input.closest('.cart-item');
        const id = parent.dataset.id;
        const size = parent.dataset.size;
        let v = parseInt(input.value, 10) || 1;
        if (v < 1) v = 1;
        input.value = v;
        updateCartItem(id, size, v);
        renderCart();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    renderCart();
    setupCartInteractions();
});

// Re-render when cart utility notifies change
document.addEventListener('cartUpdated', () => {
    // small timeout to let storage update if needed
    setTimeout(renderCart, 80);
});

// Also listen for storage events from other tabs and re-render
window.addEventListener('storage', (e) => {
    if (e.key === 'cart') {
        // small delay to ensure localStorage has the new value
        setTimeout(renderCart, 60);
    }
});
