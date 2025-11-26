function renderCart() {
    const cart = getCart();
    const container = document.getElementById("cart-items");

    if (cart.length === 0) {
        container.innerHTML = "<p>Votre panier est vide.</p>";
        document.getElementById("subtotal").textContent = "0€";
        document.getElementById("total").textContent = "0€";
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}" data-size="${item.size}">
            <img src="${item.image}" alt="${item.name}">
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
            <div class="item-price">${(item.price * item.qty).toFixed(2).replace('.00','')}€</div>
        </div>
    `).join("");

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shipping = subtotal > 100 ? 0 : 4;
    const total = subtotal + shipping;

    document.getElementById("subtotal").textContent = subtotal + "€";
    document.getElementById("shipping").textContent = shipping + "€";
    document.getElementById("total").textContent = total + "€";
}

// Event delegation for quantity controls + remove
function setupCartInteractions() {
    const container = document.getElementById("cart-items");
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
