const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const { products } = require("./catalog");

const rootDir = __dirname;
const rootDirWithSeparator = rootDir.endsWith(path.sep) ? rootDir : `${rootDir}${path.sep}`;
const port = Number(process.env.PORT || 4242);
const env = loadEnv(path.join(rootDir, ".env"));
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY || env.LIVEKEY;
const allowedCountries = (process.env.STRIPE_ALLOWED_COUNTRIES || env.STRIPE_ALLOWED_COUNTRIES || "US")
  .split(",")
  .map((country) => country.trim().toUpperCase())
  .filter(Boolean);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, getOrigin(request));

  try {
    if (request.method === "POST" && url.pathname === "/api/create-checkout-session") {
      await createCheckoutSession(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/checkout-session") {
      await getCheckoutSession(url, response);
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      serveStatic(url.pathname, request, response);
      return;
    }

    sendJson(response, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Unexpected server error." });
  }
});

server.listen(port, () => {
  console.log(`Baretides running at http://localhost:${port}`);
});

async function createCheckoutSession(request, response) {
  if (!stripeSecretKey) {
    sendJson(response, 500, { error: "Stripe secret key is missing from .env." });
    return;
  }

  const body = await readJson(request);
  const items = validateCartItems(body.items);

  if (!body.acknowledgementAccepted) {
    sendJson(response, 400, { error: "Purchaser acknowledgement is required before checkout." });
    return;
  }

  if (items.length === 0) {
    sendJson(response, 400, { error: "Cart is empty." });
    return;
  }

  const origin = getOrigin(request);
  const params = {
    mode: "payment",
    billing_address_collection: "required",
    shipping_address_collection: {
      allowed_countries: allowedCountries.length > 0 ? allowedCountries : ["US"],
    },
    success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#catalog`,
    metadata: {
      acknowledgement: "research_use_only_age_21_location_permitted",
    },
    line_items: items.map(({ product, variant, quantity }) => ({
      quantity,
      price_data: {
        currency: "usd",
        unit_amount: dollarsToCents(variant.price),
        product_data: {
          name: `${product.name} ${variant.amount}`,
          description: product.category,
          metadata: {
            product_id: product.id,
            variant_id: variant.id,
          },
        },
      },
    })),
  };

  const session = await stripeRequest("POST", "/v1/checkout/sessions", params);
  sendJson(response, 200, { id: session.id, url: session.url });
}

async function getCheckoutSession(url, response) {
  if (!stripeSecretKey) {
    sendJson(response, 500, { error: "Stripe secret key is missing from .env." });
    return;
  }

  const sessionId = url.searchParams.get("session_id");
  if (!sessionId || !sessionId.startsWith("cs_")) {
    sendJson(response, 400, { error: "A valid Checkout Session ID is required." });
    return;
  }

  const session = await stripeRequest("GET", `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
  const lineItems = await stripeRequest("GET", `/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=100`);

  sendJson(response, 200, {
    id: session.id,
    status: session.status,
    payment_status: session.payment_status,
    amount_total: session.amount_total,
    currency: session.currency,
    customer_email: session.customer_details?.email || session.customer_email,
    customer_name: session.customer_details?.name,
    billing_address: session.customer_details?.address,
    shipping_address: session.shipping_details?.address,
    shipping_name: session.shipping_details?.name,
    items: lineItems.data.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      amount_subtotal: item.amount_subtotal,
      amount_total: item.amount_total,
      currency: item.currency,
    })),
  });
}

function validateCartItems(rawItems) {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems.slice(0, 50).map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const variant = product?.variants.find((candidate) => candidate.id === item.variantId);
    const quantity = Number(item.quantity);

    if (!product || !variant || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return null;
    }

    return { product, variant, quantity };
  }).filter(Boolean);
}

async function stripeRequest(method, endpoint, params) {
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
    },
  };

  if (method !== "GET") {
    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.body = encodeForm(params);
  }

  const response = await fetch(`https://api.stripe.com${endpoint}`, options);
  const payload = await response.json();

  if (!response.ok) {
    const error = new Error(payload.error?.message || "Stripe request failed.");
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

function encodeForm(value, prefix) {
  const params = new URLSearchParams();

  function append(nextValue, key) {
    if (Array.isArray(nextValue)) {
      nextValue.forEach((item, index) => append(item, `${key}[${index}]`));
      return;
    }

    if (nextValue && typeof nextValue === "object") {
      Object.entries(nextValue).forEach(([childKey, childValue]) => {
        append(childValue, key ? `${key}[${childKey}]` : childKey);
      });
      return;
    }

    if (nextValue !== undefined && nextValue !== null) {
      params.append(key, String(nextValue));
    }
  }

  append(value, prefix);
  return params.toString();
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100_000) {
        request.destroy();
        reject(new Error("Request body too large."));
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });

    request.on("error", reject);
  });
}

function serveStatic(urlPath, request, response) {
  const safePath = urlPath === "/" ? "/index.html" : decodeURIComponent(urlPath);
  const filePath = path.normalize(path.join(rootDir, safePath));

  if ((filePath !== rootDir && !filePath.startsWith(rootDirWithSeparator)) || path.basename(filePath) === ".env") {
    sendText(response, 404, "Not found");
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      sendText(response, 404, "Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });

    if (request.method === "HEAD") {
      response.end();
    } else {
      response.end(contents);
    }
  });
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).reduce((values, line) => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!match) return values;

    const [, key, rawValue] = match;
    values[key] = rawValue.replace(/^["']|["']$/g, "");
    return values;
  }, {});
}

function getOrigin(request) {
  const protocol = request.headers["x-forwarded-proto"] || "http";
  const host = request.headers.host || `localhost:${port}`;
  return `${protocol}://${host}`;
}

function dollarsToCents(value) {
  return Math.round(Number(value) * 100);
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendText(response, status, payload) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(payload);
}
