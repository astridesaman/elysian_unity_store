<!-- README for Elysian Unity static storefront -->
# Elysian Unity - Store (Static)

Site statique de démonstration pour la boutique Elysian Unity. Ce dépôt contient les pages publiques, la logique du panier (stockée en `localStorage`) et une intégration front-end de Stripe Elements avec un mode « demo » (fallback) pour tests locaux.

**But du projet**
- Fournir une boutique statique simple (HTML/CSS/JS) avec : ajout au panier, édition du panier, récapitulatif et écran de paiement.
- Démo Stripe Elements côté client; le traitement réel des paiements nécessite un endpoint serveur (`/create-payment-intent`).

**Aperçu des fonctionnalités**
- Ajout d'articles au panier avec choix de taille et quantité.
- Persistance du panier dans `localStorage` (clé `cart`).
- Page de panier interactive : modifier quantité, supprimer article, voir sous-total / livraison / total.
- Page de paiement : récapitulatif ligne-par-ligne depuis le panier, formulaire de livraison, Stripe Elements pour la saisie de la carte.
- Mode démo local si le backend Stripe n'est pas disponible (simulation de paiement).

**Structure du dépôt**
- `index.html` — page d'accueil / listing produits.
- `styles.css` — styles globaux.
- `main.js` — scripts UX globaux (sélection tailles, etc.).
- `products.json` — (optionnel) données produits.
- `cart/` — fichiers du panier :
  - `cart.html` — page panier
  - `cart.css` — styles page panier
  - `cart.js` — utilitaires du panier (getCart, addToCart, updateCartItem, removeCartItem, clearCart)
  - `render-cart.js` — rendu et interactions de la page panier
- `payment/` — fichiers de paiement :
  - `payments.html` — page paiement
  - `payment.css` — styles paiement
  - `payment.js` — logique Stripe / calculs totaux / soumission

**Prérequis**
- Navigateur moderne (Chrome, Firefox, Edge).
- Pour tester localement, un serveur statique est suffisant (voir commandes).
- Pour paiements réels : une clé Stripe publique et un serveur exposant `/create-payment-intent`.

**Exécuter localement (rapide)**

PowerShell (dans le dossier du projet) :

```powershell
# Serveur HTTP simple (Python 3)
python -m http.server 8000

# Ou (si Node.js installé) :
npx serve . -l 8000
```

Puis ouvrir `http://localhost:8000` dans le navigateur.

Visitez `index.html` → ajoutez des articles → `cart/cart.html` → `payment/payments.html`.

**Notes Stripe & sécurité**
- Le front-end inclut Stripe Elements (`https://js.stripe.com/v3`) pour collecter les données de carte.
- NE TRAITEZ PAS les paiements uniquement côté client en production. Le serveur doit créer un PaymentIntent et renvoyer `client_secret`.
- Endpoint attendu (exemple) : `POST /create-payment-intent` qui reçoit le panier et renvoie `{ clientSecret: '...' }`.
- En l'absence de backend, le projet utilise un mode demo qui simule une réussite de paiement pour tests locaux.

**Variables & configuration**
- Si vous souhaitez brancher Stripe réel, définissez votre clé publique dans `payment/payment.js` (remplacer `pk_test_VOTRE_CLE_PUBLIQUE_STRIPE`) et déployez un endpoint serveur utilisant votre clé secrète.

**Développement**
- Les modifications UI se font directement dans les fichiers HTML/CSS/JS.
- `localStorage` est la source de vérité pour le panier. Pour réinitialiser : ouvrir DevTools → Application → Local Storage → supprimer la clé `cart`, ou appeler `clearCart()` depuis la console si `cart.js` est chargé.

**Fichiers importants à lire**
- `cart/cart.js` — logique du panier (ajout, update, suppression, notifications `cartUpdated`).
- `cart/render-cart.js` — rendering et interactions de la page panier.
- `payment/payment.js` — calcule les totaux à partir du panier et gère la soumission.

**Contribution**
- Fork et PR bienvenue. Signalez toute amélioration liée à la sécurité des paiements ou UX.