// payment/payment.js — safe, idempotent Stripe usage and cart-derived totals
// Single-file, non-module script. Derives totals from localStorage and uses
// Stripe only when available. Falls back to a demo flow when backend/Stripe
// aren't reachable.

(function () {
  'use strict';

  // Helper: read canonical cart (prefer global getCart() if available)
  function readCart() {
    try {
      if (typeof getCart === 'function') return getCart();
    } catch (e) {}
    try {
      var raw = localStorage.getItem('cart');
      if (!raw) return [];
      return JSON.parse(raw) || [];
    } catch (e) {
      return [];
    }
  }

  function formatEuro(n) {
    if (typeof n !== 'number') n = Number(n) || 0;
    var s = n.toFixed(2).replace(/\.00$/, '');
    return s + '€';
  }

  // Resolve publishable key from globals if present
  var publishableKey = null;
  try { if (window && window.env && window.env.STRIPE_PUBLISHABLE_KEY) publishableKey = window.env.STRIPE_PUBLISHABLE_KEY; } catch (e) {}
  if (!publishableKey && window && window.STRIPE_PUBLISHABLE_KEY) publishableKey = window.STRIPE_PUBLISHABLE_KEY;

  // Initialize global stripe once (if Stripe library loaded and key available)
  if (typeof Stripe !== 'undefined' && typeof window.stripe === 'undefined') {
    try { window.stripe = publishableKey ? Stripe(publishableKey) : null; } catch (e) { window.stripe = null; }
  }
  var stripeInstance = window.stripe || null;

  // Create Elements + mount card if possible
  var elements = null;
  var cardElement = null;
  try {
    if (stripeInstance) {
      elements = stripeInstance.elements();
      cardElement = elements.create('card', { hidePostalCode: true });
      if (document.getElementById('card-element')) cardElement.mount('#card-element');
    }
  } catch (e) { elements = null; cardElement = null; }

  // Cached DOM nodes (some may be absent on pages that don't show full payment form)
  var form = document.getElementById('paymentForm');
  var payBtn = document.getElementById('payBtn');
  var clearBtn = document.getElementById('clearBtn');
  var overlay = document.getElementById('overlay') || document.getElementById('successModal');
  var summaryContainer = document.getElementById('summaryItems');

  function setError(id, message) {
    var el = document.getElementById(id); if (!el) return;
    el.style.display = message ? 'block' : 'none';
    el.textContent = message || '';
    var fieldWrapper = el.parentElement; if (!fieldWrapper) return;
    var input = fieldWrapper.querySelector('input, textarea, select');
    if (input) { if (message) input.classList.add('error'); else input.classList.remove('error'); }
  }

  function resetErrors() {
    setError('err-fullName', '');
    setError('err-email', '');
    setError('err-address', '');
    var c = document.getElementById('card-errors'); if (c) c.textContent = '';
  }

  // Render line-by-line summary into aside
  function renderSummaryFromCart(cart) {
    if (!summaryContainer) return;
    if (!cart || !cart.length) { summaryContainer.innerHTML = '<p class="muted">Votre panier est vide.</p>'; return; }
    var html = '';
    for (var i = 0; i < cart.length; i++) {
      var it = cart[i];
      var line = (parseFloat(it.price) || 0) * (it.qty || 1);
      var img = it.image || '/public/Charcoal Edition - Elysian Unity.png';
      html += '<div class="summary-line" style="display:flex;gap:0.75rem;align-items:center;padding:0.6rem 0;border-bottom:1px solid #f0f0f0;">' +
                '<img src="' + img + '" alt="' + (it.name || '') + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px;">' +
                '<div style="flex:1;">' +
                  '<div style="font-weight:600">' + (it.name || '') + '</div>' +
                  '<div class="muted" style="font-size:0.9rem;margin-top:0.15rem">Taille ' + (it.size || '-') + ' • Quantité ' + (it.qty || 0) + '</div>' +
                '</div>' +
                '<div style="font-weight:700">' + (line.toFixed ? line.toFixed(2).replace('.00','') : line) + '€</div>' +
              '</div>';
    }
    summaryContainer.innerHTML = html;
  }

  // Compute totals from canonical cart
  function calcTotals() {
    var cart = readCart();
    var sub = 0;
    for (var i = 0; i < cart.length; i++) { sub += (parseFloat(cart[i].price) || 0) * (cart[i].qty || 1); }
    var shipping = sub > 100 ? 0 : (sub === 0 ? 0 : 4);
    var total = sub + shipping;
    var subEl = document.getElementById('subTotal'); if (subEl) subEl.textContent = formatEuro(sub);
    var shipEl = document.getElementById('shipping'); if (shipEl) shipEl.textContent = shipping === 0 ? 'Gratuite' : formatEuro(shipping);
    var totalEl = document.getElementById('total'); if (totalEl) totalEl.textContent = formatEuro(total);
    renderSummaryFromCart(cart);
    return { subTotal: sub, shipping: shipping, total: total, cart: cart };
  }

  // Recalc on cart updates (same tab) and storage changes (other tabs)
  document.addEventListener('cartUpdated', calcTotals);
  window.addEventListener('storage', function (e) { if (e.key === 'cart') calcTotals(); });

  // Wire change listeners for fallback form fields if present
  ['product','qty','size'].forEach(function(id){ var el = document.getElementById(id); if (!el) return; el.addEventListener('change', calcTotals); if (id==='qty') el.addEventListener('input', calcTotals); });

  // Clear button
  if (clearBtn) clearBtn.addEventListener('click', function () { if (form) form.reset(); resetErrors(); calcTotals(); });

  // Form submit handler
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      resetErrors();
      var fullName = (document.getElementById('fullName') && document.getElementById('fullName').value) || '';
      var email = (document.getElementById('email') && document.getElementById('email').value) || '';
      var address = (document.getElementById('address') && document.getElementById('address').value) || '';
      var totals = calcTotals();

      var ok = true;
      if (fullName.trim().length < 3) { setError('err-fullName','Veuillez renseigner votre nom complet'); ok = false; }
      if (!/\S+@\S+\.\S+/.test(email)) { setError('err-email','Adresse email invalide'); ok = false; }
      if (address.trim().length < 6) { setError('err-address','Adresse trop courte'); ok = false; }
      if (!ok) return;

      if (payBtn) { payBtn.disabled = true; payBtn.textContent = 'Traitement...'; }

      var cart = readCart();

      (async function(){
        try {
          var resp = await fetch('/create-payment-intent', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ cart: cart, customer: { name: fullName, email: email, address: address } }) });
          if (resp && resp.ok) {
            var data = await resp.json();
            var clientSecret = data && data.clientSecret;
            if (clientSecret && stripeInstance && cardElement) {
              var res = await stripeInstance.confirmCardPayment(clientSecret, { payment_method: { card: cardElement, billing_details: { name: fullName, email: email } } });
              if (res.error) {
                var errEl = document.getElementById('card-errors'); if (errEl) errEl.textContent = res.error.message || 'Erreur carte';
              } else if (res.paymentIntent && res.paymentIntent.status === 'succeeded') {
                var orderSummaryEl = document.getElementById('orderSummary'); if (orderSummaryEl) orderSummaryEl.textContent = 'Commande confirmée.';
                if (overlay) overlay.classList.add('show');
                try { if (typeof clearCart === 'function') clearCart(); } catch (e) {}
              } else {
                var errEl2 = document.getElementById('card-errors'); if (errEl2) errEl2.textContent = 'Le paiement n\'a pas pu être confirmé.';
              }
            } else {
              await simulateSuccess();
            }
          } else {
            await simulateSuccess();
          }
        } catch (err) {
          console.warn('Payment intent backend unreachable, falling back to demo mode.', err);
          await simulateSuccess();
        } finally {
          if (payBtn) { payBtn.disabled = false; payBtn.textContent = 'PAYER'; }
        }
      })();
    });
  }

  async function simulateSuccess() {
    await new Promise(function(r){ setTimeout(r,900); });
    var totals = calcTotals();
    var orderSummaryEl = document.getElementById('orderSummary'); if (orderSummaryEl) orderSummaryEl.textContent = 'Commande (mode démo) — paiement simulé.';
    if (overlay) overlay.classList.add('show');
    try { if (typeof clearCart === 'function') clearCart(); } catch (e) {}
  }

  // initial render
  calcTotals();

})();
