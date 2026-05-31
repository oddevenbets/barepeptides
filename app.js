const products = window.BARETIDES_PRODUCTS;
const CART_STORAGE_KEY = "baretides.cart.v1";
const AGREEMENT_STORAGE_KEY = "baretides.agreementAccepted.v1";

const state = {
  cart: new Map(),
  search: "",
  agreementAccepted: localStorage.getItem(AGREEMENT_STORAGE_KEY) === "true",
  pendingCartItem: null,
  pendingCheckout: false,
  isCheckingOut: false,
};

const productGrid = document.querySelector("[data-product-grid]");
const searchInput = document.querySelector("[data-search]");
const cartDrawer = document.querySelector("[data-cart-drawer]");
const cartItems = document.querySelector("[data-cart-items]");
const cartCount = document.querySelector("[data-cart-count]");
const cartSubtotal = document.querySelector("[data-cart-subtotal]");
const agreementModal = document.querySelector("[data-agreement-modal]");
const checkoutButton = document.querySelector("[data-checkout]");
const policyModal = document.querySelector("[data-policy-modal]");
const policyContent = document.querySelector("[data-policy-content]");

const policies = {
  general: `
    <p class="eyebrow">Store policy</p>
    <h2 id="policy-title">General terms</h2>
    <p>
      These terms summarize how Baretides handles checkout, order communication, shipping expectations, privacy, and returns for research-use product orders.
    </p>
    <h3>Payments and order information</h3>
    <p>
      Payments are processed by Stripe. Baretides does not collect, store, or handle card numbers. Stripe may collect customer email, payment details, billing address, shipping address, fraud-prevention signals, and other information required to process the transaction.
    </p>
    <h3>Email communication</h3>
    <p>
      We may use the email address provided at checkout to send order updates, delivery notices, customer support replies, and occasional special offers. Customers can request not to receive promotional messages by contacting barepeptides@proton.me.
    </p>
    <h3>Shipping and delays</h3>
    <p>
      Typical delivery timing is about 4 weeks, but delays can occur because these are specialized research materials. Tracking and timing may vary by carrier, availability, and fulfillment conditions.
    </p>
    <h3>Refunds and returns</h3>
    <p>
      Orders are generally final once placed. We do not accept routine returns or refund requests after fulfillment has begun. If an order has not arrived after 8 weeks from purchase, contact barepeptides@proton.me so we can review the order and determine whether a replacement, store credit, or refund may be appropriate.
    </p>
    <h3>Customer responsibility</h3>
    <p>
      Customers are responsible for entering accurate contact and shipping information, monitoring email updates, and confirming that the purchase is lawful in their location before placing an order.
    </p>
  `,
  research: `
    <p class="eyebrow">Required terms</p>
    <h2 id="policy-title">Research-use terms</h2>
    <p>
      By purchasing from Baretides, the customer acknowledges and agrees that all products are sold strictly for lawful laboratory research use only.
    </p>
    <h3>Not for consumption</h3>
    <p>
      Products are not intended for human or animal consumption, injection, ingestion, topical use, compounding, resale as a drug, medical treatment, diagnosis, cure, mitigation, or prevention of any disease or condition.
    </p>
    <h3>No medical claims</h3>
    <p>
      Product names, categories, images, and descriptions are provided for catalog organization only. They are not medical advice, treatment instructions, dosing guidance, safety guidance, or a recommendation for any personal use.
    </p>
    <h3>Purchaser qualifications</h3>
    <p>
      The purchaser confirms that they are at least 21 years old, legally permitted to buy research peptides in their location, and responsible for complying with all applicable laws, institutional rules, import rules, storage requirements, and laboratory safety practices.
    </p>
    <h3>Assumption of responsibility</h3>
    <p>
      The purchaser accepts full responsibility for lawful handling, storage, labeling, disposal, and use in an appropriate research setting. The purchaser agrees not to misuse, redistribute, relabel, or provide products for human or animal use.
    </p>
    <h3>Acknowledgement at purchase</h3>
    <p>
      Completing checkout, submitting payment, or accepting the on-site acknowledgement confirms acceptance of these research-use terms and the general store terms.
    </p>
  `,
};

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function cartKey(productId, variantId) {
  return `${productId}:${variantId}`;
}

function findCartItem(key) {
  const [productId, variantId] = key.split(":");
  const product = products.find((item) => item.id === productId);
  const variant = product?.variants.find((item) => item.id === variantId);

  return product && variant ? { product, variant } : null;
}

function restoreCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");

    savedCart.forEach((item) => {
      const key = cartKey(item.productId, item.variantId);
      const quantity = Number(item.quantity);

      if (findCartItem(key) && Number.isInteger(quantity) && quantity > 0 && quantity <= 99) {
        state.cart.set(key, quantity);
      }
    });
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY);
  }
}

function persistCart() {
  const items = Array.from(state.cart.entries()).map(([key, quantity]) => {
    const [productId, variantId] = key.split(":");
    return { productId, variantId, quantity };
  });

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

function renderProducts() {
  const query = state.search.trim().toLowerCase();
  const visibleProducts = products.filter((product) =>
    product.name.toLowerCase().includes(query),
  );

  productGrid.replaceChildren();

  if (visibleProducts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "cart-empty";
    empty.textContent = "No matching peptides found.";
    productGrid.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  visibleProducts.forEach((product) => {
    const selectedVariant = product.variants[0];
    const card = document.createElement("article");
    card.className = "product-card";

    const media = document.createElement("div");
    media.className = "product-card__media";

    const image = document.createElement("img");
    image.src = product.image;
    image.alt = `${product.name} vial`;
    image.loading = "lazy";
    media.append(image);

    const content = document.createElement("div");
    content.className = "product-card__content";

    const category = document.createElement("span");
    category.className = "category";
    category.textContent = product.category;

    const name = document.createElement("h3");
    name.textContent = product.name;

    const variantLabel = document.createElement("label");
    variantLabel.className = "variant-select";

    const variantText = document.createElement("span");
    variantText.textContent = "Vial size";

    const variantSelect = document.createElement("select");
    variantSelect.setAttribute("aria-label", `${product.name} vial size`);

    product.variants.forEach((variant) => {
      const option = document.createElement("option");
      option.value = variant.id;
      option.textContent = `${variant.amount} - ${formatMoney(variant.price)}`;
      variantSelect.append(option);
    });

    const price = document.createElement("strong");
    price.className = "price";
    price.textContent = formatMoney(selectedVariant.price);

    variantSelect.addEventListener("change", () => {
      const nextVariant = product.variants.find((variant) => variant.id === variantSelect.value);
      price.textContent = formatMoney(nextVariant.price);
    });

    variantLabel.append(variantText, variantSelect);

    const footer = document.createElement("div");
    footer.className = "product-card__footer";

    const button = document.createElement("button");
    button.className = "add-button";
    button.type = "button";
    button.textContent = "Add to cart";
    button.addEventListener("click", () => {
      requestAddToCart(product.id, variantSelect.value);
    });

    footer.append(price, button);
    content.append(category, name, variantLabel, footer);
    card.append(media, content);
    fragment.append(card);
  });

  productGrid.append(fragment);
}

function requestAddToCart(productId, variantId) {
  if (!state.agreementAccepted) {
    state.pendingCartItem = { productId, variantId };
    openAgreement();
    return;
  }

  addToCart(productId, variantId);
}

function addToCart(productId, variantId) {
  const key = cartKey(productId, variantId);
  const currentQuantity = state.cart.get(key) || 0;
  state.cart.set(key, currentQuantity + 1);
  persistCart();
  renderCart();
  openCart();
}

function setQuantity(key, quantity) {
  if (quantity <= 0) {
    state.cart.delete(key);
  } else {
    state.cart.set(key, quantity);
  }

  persistCart();
  renderCart();
}

function renderCart() {
  const entries = Array.from(state.cart.entries());
  const itemCount = entries.reduce((total, [, quantity]) => total + quantity, 0);
  const subtotal = entries.reduce((total, [key, quantity]) => {
    const item = findCartItem(key);
    return item ? total + item.variant.price * quantity : total;
  }, 0);

  cartCount.textContent = String(itemCount);
  cartSubtotal.textContent = formatMoney(subtotal);
  checkoutButton.disabled = itemCount === 0 || state.isCheckingOut;
  cartItems.replaceChildren();

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "cart-empty";
    empty.textContent = "Your cart is empty. Add a product from the catalog to begin an order draft.";
    cartItems.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  entries.forEach(([key, quantity]) => {
    const itemData = findCartItem(key);
    if (!itemData) return;

    const { product, variant } = itemData;
    const item = document.createElement("article");
    item.className = "cart-item";

    const info = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = product.name;
    const details = document.createElement("p");
    details.textContent = `${variant.amount} - ${formatMoney(variant.price)} each`;
    info.append(name, details);

    const quantityControl = document.createElement("div");
    quantityControl.className = "quantity";
    quantityControl.setAttribute("aria-label", `${product.name} quantity`);

    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "-";
    decrease.setAttribute("aria-label", `Decrease ${product.name}`);
    decrease.addEventListener("click", () => setQuantity(key, quantity - 1));

    const quantityText = document.createElement("span");
    quantityText.textContent = String(quantity);

    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Increase ${product.name}`);
    increase.addEventListener("click", () => setQuantity(key, quantity + 1));

    quantityControl.append(decrease, quantityText, increase);
    item.append(info, quantityControl);
    fragment.append(item);
  });

  cartItems.append(fragment);
}

function openCart() {
  cartDrawer.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
}

function closeCart() {
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-open");
}

function openAgreement() {
  agreementModal.classList.add("is-open");
  agreementModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeAgreement() {
  agreementModal.classList.remove("is-open");
  agreementModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function acceptAgreement() {
  state.agreementAccepted = true;
  localStorage.setItem(AGREEMENT_STORAGE_KEY, "true");
  closeAgreement();

  if (state.pendingCartItem) {
    const { productId, variantId } = state.pendingCartItem;
    state.pendingCartItem = null;
    addToCart(productId, variantId);
  } else if (state.pendingCheckout) {
    state.pendingCheckout = false;
    beginCheckout();
  }
}

function getCheckoutItems() {
  return Array.from(state.cart.entries()).map(([key, quantity]) => {
    const [productId, variantId] = key.split(":");
    return { productId, variantId, quantity };
  });
}

async function beginCheckout() {
  if (state.cart.size === 0 || state.isCheckingOut) {
    return;
  }

  if (window.location.protocol === "file:") {
    alert("Stripe checkout requires the local server. Run `npm start`, then open http://localhost:4242.");
    return;
  }

  if (!state.agreementAccepted) {
    state.pendingCartItem = null;
    state.pendingCheckout = true;
    openAgreement();
    return;
  }

  state.isCheckingOut = true;
  checkoutButton.textContent = "Opening secure checkout...";
  checkoutButton.disabled = true;
  const checkoutTab = window.open("", "_blank");

  if (checkoutTab) {
    checkoutTab.document.title = "Opening Baretides checkout...";
    checkoutTab.document.body.innerHTML = "<p style='font-family: system-ui, sans-serif; padding: 24px;'>Opening secure Stripe checkout...</p>";
  }

  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acknowledgementAccepted: state.agreementAccepted,
        items: getCheckoutItems(),
      }),
    });
    const responseText = await response.text();
    let payload = {};

    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error("Checkout server returned an unreadable response. Make sure you opened the site at http://localhost:4242, not as a local file.");
    }

    if (!response.ok) {
      throw new Error(payload.error || "Unable to start checkout.");
    }

    if (!payload.url) {
      throw new Error("Stripe did not return a checkout URL. Check the server terminal and Stripe API key.");
    }

    if (checkoutTab) {
      checkoutTab.location.href = payload.url;
    } else {
      window.location.href = payload.url;
    }
  } catch (error) {
    if (checkoutTab && !checkoutTab.closed) {
      checkoutTab.close();
    }

    checkoutButton.textContent = "Checkout securely";
    state.isCheckingOut = false;
    renderCart();
    alert(error.message || "Unable to reach the checkout server. Run `npm start`, then open http://localhost:4242.");
  }
}

function declineAgreement() {
  state.pendingCartItem = null;
  state.pendingCheckout = false;
  closeAgreement();
}

function openPolicy(policyName) {
  policyContent.innerHTML = policies[policyName] || policies.general;
  policyModal.classList.add("is-open");
  policyModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closePolicy() {
  policyModal.classList.remove("is-open");
  policyModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderProducts();
});

document.querySelectorAll("[data-open-cart]").forEach((button) => {
  button.addEventListener("click", openCart);
});

document.querySelectorAll("[data-close-cart]").forEach((button) => {
  button.addEventListener("click", closeCart);
});

document.querySelectorAll("[data-open-policy]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openPolicy(link.dataset.openPolicy);
  });
});

document.querySelectorAll("[data-close-policy]").forEach((button) => {
  button.addEventListener("click", closePolicy);
});

document.querySelector("[data-accept-agreement]").addEventListener("click", acceptAgreement);

document.querySelectorAll("[data-decline-agreement]").forEach((button) => {
  button.addEventListener("click", declineAgreement);
});

checkoutButton.addEventListener("click", beginCheckout);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCart();
    declineAgreement();
    closePolicy();
  }
});

restoreCart();
renderProducts();
renderCart();
