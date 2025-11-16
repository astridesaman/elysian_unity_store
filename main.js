import osenv from 'osenv';

const stripe = osenv.STRIPE_PUBLIC_KEY ? Stripe(osenv.STRIPE_PUBLIC_KEY) : null;

if (!stripe) {
  alert("La clé publique Stripe n'est pas définie. Merci de vérifier la configuration.");
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

      const result = await stripe.redirectToCheckout({
        sessionId: data.id
      });

      if (result.error) {
        alert(result.error.message);
      }
    } catch (error) {
      console.error(error);
      alert("Une erreur est survenue. Merci de réessayer dans quelques instants.");
    }
  });
});
