const title = document.querySelector("[data-status-title]");
const message = document.querySelector("[data-status-message]");
const details = document.querySelector("[data-status-details]");
const params = new URLSearchParams(window.location.search);
const sessionId = params.get("session_id");

function formatMoney(total, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency?.toUpperCase() || "USD",
  }).format((total || 0) / 100);
}

function addDetail(label, value) {
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value || "Not available";
  details.append(term, description);
}

function formatAddress(address) {
  if (!address) {
    return "Not available";
  }

  return [
    address.line1,
    address.line2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
    address.country,
  ].filter(Boolean).join(" | ");
}

function addItems(items, currency) {
  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  addDetail(
    "Items",
    items.map((item) => {
      const total = formatMoney(item.amount_total, item.currency || currency);
      return `${item.quantity} x ${item.description} (${total})`;
    }).join(" | "),
  );
}

async function loadStatus() {
  if (!sessionId) {
    title.textContent = "Missing checkout session";
    message.textContent = "Stripe did not return a session ID. Please contact support if you were charged.";
    return;
  }

  try {
    const response = await fetch(`/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to retrieve checkout status.");
    }

    if (payload.status === "complete" || payload.payment_status === "paid") {
      title.textContent = "Payment received";
      message.textContent = "Your checkout is complete. A Stripe receipt will be sent to the email collected during checkout.";
      localStorage.removeItem("baretides.cart.v1");
    } else {
      title.textContent = "Checkout not completed";
      message.textContent = "Your payment has not been completed yet. You can return to the catalog and try again.";
    }

    details.hidden = false;
    addDetail("Amount", formatMoney(payload.amount_total, payload.currency));
    addDetail("Email", payload.customer_email);
    addDetail("Customer", payload.customer_name);
    addDetail("Shipping name", payload.shipping_name);
    addDetail("Shipping address", formatAddress(payload.shipping_address));
    addDetail("Billing address", formatAddress(payload.billing_address));
    addItems(payload.items, payload.currency);
    addDetail("Payment status", payload.payment_status);
  } catch (error) {
    title.textContent = "Unable to confirm checkout";
    message.textContent = error.message;
  }
}

loadStatus();
