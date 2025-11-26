const stripe = Stripe("pk_test_VOTRE_CLE_PUBLIQUE_STRIPE");

// Création d'Elements
const elements = stripe.elements();
const cardElement = elements.create("card", {
  hidePostalCode: true,
});
cardElement.mount("#card-element");

const form = document.getElementById("paymentForm");
const payBtn = document.getElementById("payBtn");
const clearBtn = document.getElementById("clearBtn");
const overlay = document.getElementById("overlay");

// Helpers erreurs front
function setError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = message ? "block" : "none";
  el.textContent = message || "";
  const fieldWrapper = el.parentElement;
  if (!fieldWrapper) return;
  const input = fieldWrapper.querySelector("input, textarea, select");
  if (input) {
    if (message) input.classList.add("error");
    else input.classList.remove("error");
  }
}

function resetErrors() {
  setError("err-fullName", "");
  setError("err-email", "");
  setError("err-address", "");
  document.getElementById("card-errors").textContent = "";
}

// Calcul du total (comme dans ta version précédente)
function calcTotals() {
  const cart = (typeof getCart === "function") ? getCart() : [];

  // If there are items in cart, compute totals from cart (preferred)
  if (cart && cart.length > 0) {
    const sub = cart.reduce((s, it) => s + (parseFloat(it.price) || 0) * (it.qty || 1), 0);
    const shipping = sub > 100 ? 0 : 4;
    const total = sub + shipping;

    document.getElementById("subTotal").textContent = sub + "€";
    document.getElementById("shipping").textContent = shipping + "€";
    document.getElementById("total").textContent = total + "€";

    // Render line-by-line summary in the aside
    renderSummaryFromCart(cart);

    const totalItems = cart.reduce((n, it) => n + (it.qty || 1), 0);
    const firstName = cart[0].name || "Produit";
    return { price: null, subTotal: sub, shipping, total, name: firstName, size: null, qty: totalItems, cart };
  }

  // Fallback to single-product form fields when cart is empty
  const productSelect = document.getElementById("product");
  const product = productSelect ? productSelect.value : null;
  const qty = parseInt(document.getElementById("qty").value) || 1;

  let price = 45;
  let name = "Charcoal Edition";

  if (product === "signature") {
    price = 55;
    name = "Signature Edition";
  } else if (product === "collector") {
    price = 120;
    name = "Collector Edition";
  }

  const sub = price * qty;
  const shipping = sub > 100 ? 0 : 4;
  const total = sub + shipping;

  document.getElementById("subTotal").textContent = sub + "€";
  document.getElementById("shipping").textContent = shipping + "€";
  document.getElementById("total").textContent = total + "€";

  const size = document.getElementById("size") ? document.getElementById("size").value : "M";
  // Render fallback single-line summary inside the items container
  renderSummaryFromCart([{ name, size, qty, price, image: '/public/Charcoal Edition - Elysian Unity.png' }]);

  return { price, subTotal: sub, shipping, total, name, size, qty };
}

// Update recap quand produit/qty/size changent (seulement si les champs existent)
["product", "qty", "size"].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("change", calcTotals);
  if (id === "qty") {
    el.addEventListener("input", calcTotals);
  }
});

// Bouton effacer
clearBtn.addEventListener("click", () => {
  form.reset();
  resetErrors();
  calcTotals();
});

// Render a line-by-line summary into the aside
function renderSummaryFromCart(cart) {
  const container = document.getElementById('summaryItems');
  if (!container) return;

  if (!cart || cart.length === 0) {
    container.innerHTML = '<p class="muted">Votre panier est vide.</p>';
    return;
  }

  const html = cart.map(item => {
    const lineTotal = ((parseFloat(item.price) || 0) * (item.qty || 1));
    return `
      <div class="summary-line" style="display:flex;gap:0.75rem;align-items:center;padding:0.6rem 0;border-bottom:1px solid #f0f0f0;">
        <img src="${item.image || '/public/Charcoal Edition - Elysian Unity.png'}" alt="${item.name}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;">
        <div style="flex:1;">
          <div style="font-weight:600">${item.name}</div>
          <div class="muted" style="font-size:0.9rem;margin-top:0.15rem">Taille ${item.size} • Quantité ${item.qty}</div>
        </div>
        <div style="font-weight:700">${lineTotal.toFixed(2).replace('.00','')}€</div>
      </div>`;
  }).join('');

  container.innerHTML = html;
}

// Soumission du formulaire
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  resetErrors();
  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const address = document.getElementById("address").value.trim();
  const product = document.getElementById("product")
    ? document.getElementById("product").value
    : null;
  const { total, name, size, qty } = calcTotals();

  let ok = true;
  if (fullName.length < 3) {
    setError("err-fullName", "Veuillez renseigner votre nom complet");
    ok = false;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    setError("err-email", "Adresse email invalide");
    ok = false;
  }
  if (address.length < 6) {
    setError("err-address", "Adresse trop courte");
    ok = false;
  }

  if (!ok) return;

  payBtn.disabled = true;
  payBtn.textContent = "Traitement...";

  // Récupère le panier (si présent)
  const cart = typeof getCart === "function" ? getCart() : [];

  // Tentative d'appel au backend si disponible. Si l'appel échoue,
  // on bascule en mode demo (simulation de paiement) pour permettre
  // une démo locale sans serveur.
  try {
    const response = await fetch("/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, qty, size, cart, customer: { name: fullName, email, address } }),
    });

    if (response.ok) {
      const data = await response.json();
      const clientSecret = data.clientSecret;

      // Si backend renvoie un clientSecret, on utilise Stripe pour confirmer
      if (clientSecret) {
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement, billing_details: { name: fullName, email } },
          shipping: { name: fullName, address: { line1: address }, phone: document.getElementById("phone").value || undefined },
        });

        if (error) {
          document.getElementById("card-errors").textContent = error.message;
        } else if (paymentIntent && paymentIntent.status === "succeeded") {
          document.getElementById("orderSummary").textContent = `${name} • Taille ${size} • Quantité ${qty} — paiement confirmé.`;
          overlay.classList.add("show");
          if (typeof clearCart === "function") clearCart();
        } else {
          document.getElementById("card-errors").textContent = "Le paiement n'a pas pu être confirmé.";
        }
      } else {
        // Pas de clientSecret renvoyé : fallback to demo
        await simulateSuccess();
      }
    } else {
      // backend returned non-ok → fallback to demo
      await simulateSuccess();
    }
  } catch (err) {
    // Erreur réseau / pas de backend : simulation locale
    console.warn("Payment intent backend unreachable, falling back to demo mode.", err);
    await simulateSuccess();
  } finally {
    payBtn.disabled = false;
    payBtn.textContent = "PAYER";
  }
});

async function simulateSuccess() {
  // Simule un court délai comme si on traitait le paiement
  await new Promise((r) => setTimeout(r, 900));
  const product = document.getElementById("product") ? document.getElementById("product").value : null;
  const { name, size, qty } = calcTotals();
  document.getElementById("orderSummary").textContent = `${name} • Taille ${size} • Quantité ${qty} — (mode démo) paiement simulé.`;
  overlay.classList.add("show");
  if (typeof clearCart === "function") clearCart();
}

// init
// Recalc when cart changes in same page (cart utilities dispatch) or another tab (storage event)
document.addEventListener('cartUpdated', calcTotals);
window.addEventListener('storage', (e) => {
  if (e.key === 'cart') calcTotals();
});

// initial render
calcTotals();
