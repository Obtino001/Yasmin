class CartCoupon extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('.cart-coupon-btn');
    this.input = this.querySelector('.cart-coupon-input');
    
    if (this.button) {
      this.button.addEventListener('click', this.onApplyCoupon.bind(this));
    }
  }

  onApplyCoupon(event) {
    event.preventDefault();
    const code = this.input ? this.input.value.trim() : '';
    if (!code) return;

    this.toggleLoading(true);

    const checkoutForm = document.getElementById('CartDrawer-Form') || document.querySelector('form[action="/cart"]');
    if (checkoutForm) {
      let discountInput = checkoutForm.querySelector('input[name="discount"]');
      if (!discountInput) {
        discountInput = document.createElement('input');
        discountInput.type = 'hidden';
        discountInput.name = 'discount';
        checkoutForm.appendChild(discountInput);
      }
      discountInput.value = code;
      
      const checkoutBtn = document.createElement('input');
      checkoutBtn.type = 'hidden';
      checkoutBtn.name = 'checkout';
      checkoutBtn.value = 'Checkout';
      checkoutForm.appendChild(checkoutBtn);
      
      checkoutForm.submit();
    } else {
      window.location.href = `/checkout?discount=${encodeURIComponent(code)}`;
    }
  }

  toggleLoading(loading, error = false) {
    if (!this.button) return;
    
    if (loading) {
      this.button.dataset.originalText = this.button.textContent;
      this.button.textContent = this.button.dataset.applyingText || 'Applying...';
      this.button.disabled = true;
    } else {
      if (error) {
        this.button.textContent = this.button.dataset.errorText || 'Error';
        setTimeout(() => {
          this.button.textContent = this.button.dataset.originalText;
          this.button.disabled = false;
        }, 2000);
      } else {
        this.button.textContent = this.button.dataset.originalText;
        this.button.disabled = false;
      }
    }
  }

  refreshCart() {
    const sectionsToRequest = ['cart-drawer', 'cart-icon-bubble'];
    fetch(`${window.routes.cart_url}?sections=${sectionsToRequest.join(',')}`)
      .then(res => res.json())
      .then(parsedState => {
        const cartDrawer = document.querySelector('cart-drawer');
        if (cartDrawer && typeof cartDrawer.renderContents === 'function') {
          cartDrawer.renderContents(parsedState);
        } else {
          window.location.reload();
        }
      })
      .catch(err => {
        console.error('Error refreshing cart sections:', err);
        window.location.reload();
      })
      .finally(() => {
        this.toggleLoading(false);
      });
  }
}

customElements.define('cart-coupon', CartCoupon);
