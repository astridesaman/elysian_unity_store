// main.js - browser-safe: avoid Node-only imports and don't redeclare global `stripe`
// If you expose `window.STRIPE_PUBLISHABLE_KEY` in your page, payment scripts will initialize Stripe.
var stripeInstance = window.stripe || null;
if (!stripeInstance) {
  console.warn("Stripe instance not found on window; payment pages may initialize it when needed.");
}

// Gestion visuelle de la sélection de taille
document.querySelectorAll('.size-options').forEach(group => {
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('.size-option');
    if (!btn) return;
    group.querySelectorAll('.size-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
}); 

// Gestion du clic sur "Commander" / "Précommander"
document.querySelectorAll('.btn-primary[data-product-id]').forEach(button => {
  button.addEventListener('click', async () => {
    const productId = button.dataset.productId;

    const details = button.closest('.product-details');
    const meta = details.querySelector('.product-meta');
    let size = null;

    if (meta) {
      const activeSize = meta.querySelector('.size-option.active');
      if (!activeSize) {
        alert("Merci de choisir une taille avant de continuer.");
        return;
      }
      size = activeSize.textContent.trim();
    }

    try {
      const response = await fetch("/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId: productId,
          size: size
        })
      });

      if (!response.ok) {
        throw new Error("Erreur serveur");
      }

      const data = await response.json();

      if (!stripeInstance) {
        alert('Stripe non initialisé — redirection au checkout impossible.');
      } else {
        const result = await stripeInstance.redirectToCheckout({ sessionId: data.id });
        if (result && result.error) alert(result.error.message);
      }
    } catch (error) {
      console.error(error);
      alert("Une erreur est survenue. Merci de réessayer dans quelques instants.");
    }
  });
});

// Hamburger menu toggle (responsive)
(function () {
  function closeNav() {
    document.body.classList.remove('nav-open');
    document.querySelectorAll('[aria-expanded="true"]').forEach(el => el.setAttribute('aria-expanded', 'false'));
  }

  function openNav(toggle) {
    document.body.classList.add('nav-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  }

  document.addEventListener('click', function (e) {
    const toggle = e.target.closest('#nav-toggle');
    if (toggle) {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      if (expanded) closeNav(); else openNav(toggle);
      return;
    }

    // Click outside nav-menu closes it
    if (document.body.classList.contains('nav-open')) {
      const menu = document.getElementById('nav-menu');
      if (menu && !menu.contains(e.target) && !e.target.closest('#nav-toggle')) {
        closeNav();
      }
    }
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      closeNav();
    }
  });
})();
