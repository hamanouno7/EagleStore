import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAnalytics, isSupported as analyticsSupported } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBL1W2fE8qPOU6UWZrEymRkV0bpTvAXCbU",
  authDomain: "eagle-store-f7b47.firebaseapp.com",
  projectId: "eagle-store-f7b47",
  storageBucket: "eagle-store-f7b47.firebasestorage.app",
  messagingSenderId: "206010344511",
  appId: "1:206010344511:web:f69f6ed31fcdb0555b048a",
  measurementId: "G-1GH7W52Y77",
};

const app = initializeApp(firebaseConfig);
analyticsSupported()
  .then((ok) => {
    if (ok) getAnalytics(app);
  })
  .catch(() => {});
const db = getFirestore(app);

// ---- Settings (edit if you want) ----
const WHATSAPP_NUMBER = "21600000000"; // TODO: replace with real number if needed
const PHONE_NUMBER = "+21600000000"; // TODO: replace with real number if needed
const PRODUCTS_COLLECTION_CANDIDATES = ["products", "product", "items", "shoes", "catalog"];
// -----------------------------------

const $ = (id) => document.getElementById(id);
const fmt = (n) => `${Math.round(Number(n) || 0)} DNT`;

const escapeHtml = (str) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const extractDiscountRate = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^-?\s*(\d+(?:[.,]\d+)?)\s*%$/);
  if (!match) return 0;
  const rate = Number(match[1].replace(",", "."));
  if (!Number.isFinite(rate) || rate <= 0 || rate >= 100) return 0;
  return rate;
};

// ---- UI elements ----
const yearEl = $("year");
const statProductsEl = $("statProducts");

const openMenuBtn = $("openMenu");
const closeMenuBtn = $("closeMenu");
const menuDrawer = $("menuDrawer");
const backdrop = $("backdrop");

const openCartBtn = $("openCart");
const closeCartBtn = $("closeCart");
const cart = $("cart");
const cartCount = $("cartCount");
const cartItems = $("cartItems");
const cartTotal = $("cartTotal");
const checkoutWA = $("checkoutWA");
const checkoutCall = $("checkoutCall");

const openSearchBtn = $("openSearch");
const searchModal = $("searchModal");
const closeSearchBtn = $("closeSearch");
const searchModalInput = $("searchModalInput");
const focusCatalogueBtn = $("focusCatalogue");
const clearSearchBtn = $("clearSearch");

const qInput = $("q");
const catSelect = $("cat");
const pMin = $("pMin");
const pMax = $("pMax");
const priceLabel = $("priceLabel");
const rangeActive = $("rangeActive");
const resetBtn = $("reset");
const countEl = $("count");
const sizesWrap = $("sizes");
const grid = $("grid");
const loader = $("loader");
const empty = $("empty");

const heroImage = $("heroImage");
const heroRail = $("heroRail");
const heroPrev = $("heroPrev");
const heroNext = $("heroNext");

const qv = $("quickView");
const closeQV = $("closeQV");
const qvTitle = $("qvTitle");
const qvMain = $("qvMain");
const qvThumbs = $("qvThumbs");
const qvCategory = $("qvCategory");
const qvPrice = $("qvPrice");
const qvDesc = $("qvDesc");
const qvColors = $("qvColors");
const qvSizes = $("qvSizes");
const qvSummary = $("qvSummary");
const qvAdd = $("qvAdd");

const waLink = $("waLink");
const callLink = $("callLink");

// ---- State ----
let allProducts = [];
let filteredProducts = [];
const cartState = [];
let sizeFilter = new Set();

let heroImages = [];
let heroIndex = 0;
let heroTimer = null;

let qvProduct = null;
let qvSelectedSize = "";
let qvSelectedColorId = "";
let qvImages = [];
let qvActiveImage = "";

const NAMED_COLORS = {
  black: "#111111",
  white: "#ffffff",
  red: "#d90429",
  blue: "#1d4ed8",
  green: "#16a34a",
  yellow: "#facc15",
  orange: "#f97316",
  purple: "#7c3aed",
  pink: "#ec4899",
  grey: "#6b7280",
  gray: "#6b7280",
  brown: "#92400e",
  beige: "#d6bfa2",
  navy: "#1e3a8a",
  silver: "#9ca3af",
  gold: "#d4af37",
};

function colorToCss(color) {
  const rawHex = String(color?.hex || "").trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(rawHex)) return rawHex;
  const name = String(color?.name || "").trim().toLowerCase();
  if (NAMED_COLORS[name]) return NAMED_COLORS[name];
  return "#d1d5db";
}

function openLayer(layerEl) {
  layerEl.classList.add("is-open");
  layerEl.setAttribute("aria-hidden", "false");
  backdrop.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLayer(layerEl) {
  layerEl.classList.remove("is-open");
  layerEl.setAttribute("aria-hidden", "true");
  const anyOpen =
    menuDrawer.classList.contains("is-open") ||
    cart.classList.contains("is-open") ||
    searchModal.classList.contains("is-open") ||
    qv.classList.contains("is-open");
  if (!anyOpen) {
    backdrop.hidden = true;
    document.body.style.overflow = "";
  }
}

function openModal(modalEl) {
  modalEl.classList.add("is-open");
  modalEl.setAttribute("aria-hidden", "false");
  backdrop.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal(modalEl) {
  modalEl.classList.remove("is-open");
  modalEl.setAttribute("aria-hidden", "true");
  const anyOpen =
    menuDrawer.classList.contains("is-open") ||
    cart.classList.contains("is-open") ||
    searchModal.classList.contains("is-open") ||
    qv.classList.contains("is-open");
  if (!anyOpen) {
    backdrop.hidden = true;
    document.body.style.overflow = "";
  }
}

function syncRangeUI() {
  let minVal = Number(pMin.value);
  let maxVal = Number(pMax.value);
  if (minVal > maxVal) {
    const tmp = minVal;
    minVal = maxVal;
    maxVal = tmp;
    pMin.value = String(minVal);
    pMax.value = String(maxVal);
  }
  const lo = Number(pMin.min);
  const hi = Number(pMin.max);
  const span = hi - lo || 1;
  const pLo = ((minVal - lo) / span) * 100;
  const pHi = ((maxVal - lo) / span) * 100;
  rangeActive.style.left = `calc(${pLo}% )`;
  rangeActive.style.width = `calc(${pHi - pLo}% - 0px)`;
  priceLabel.textContent = `${fmt(minVal)} – ${fmt(maxVal)}`;
}

function selectedSizes() {
  return new Set([...sizeFilter].filter(Boolean));
}

function parsePreviewImages(data, image) {
  const raw =
    data.images ??
    data.gallery ??
    data.photos ??
    data.imageUrls ??
    data.productImages;
  const mainImage = String(image || "").trim();
  const preview = [];

  const push = (entry) => {
    if (!entry) return;
    if (typeof entry === "string") {
      const url = entry.trim();
      if (url) preview.push({ url, colorName: "", colorHex: "" });
      return;
    }
    if (typeof entry === "object") {
      const url = String(entry.url || entry.image || entry.src || entry.imageUrl || "").trim();
      if (!url) return;
      preview.push({
        url,
        colorName: String(entry.colorName || entry.color || entry.name || "").trim(),
        colorHex: String(entry.colorHex || entry.hex || entry.code || "").trim(),
      });
    }
  };

  if (Array.isArray(raw)) raw.forEach(push);
  else if (typeof raw === "string") raw.split(",").map((p) => p.trim()).filter(Boolean).forEach((u) => push(u));

  if (mainImage && !preview.some((p) => p.url === mainImage)) preview.unshift({ url: mainImage, colorName: "", colorHex: "" });
  if (!preview.length && mainImage) preview.push({ url: mainImage, colorName: "", colorHex: "" });
  return preview;
}

function parseColorOptions(data, previewImages) {
  const rawColors = data.colors ?? data.colorOptions ?? data.variants ?? data.colorVariant;
  const colors = [];

  const toEntry = (entry, index, fallbackName = "Color") => {
    if (!entry) return null;
    if (typeof entry === "string") return { id: `color-${index}`, name: entry.trim(), hex: "", imageIndex: -1 };
    if (typeof entry === "object") {
      const name = String(entry.name || entry.color || entry.label || fallbackName).trim();
      const hex = String(entry.hex || entry.colorHex || entry.code || "").trim();
      const imageIndex = Number.isInteger(entry.imageIndex) ? entry.imageIndex : -1;
      return { id: `color-${index}`, name, hex, imageIndex };
    }
    return null;
  };

  if (Array.isArray(rawColors)) {
    rawColors.forEach((entry, index) => {
      const c = toEntry(entry, index, "Color");
      if (c && c.name) colors.push(c);
    });
  } else if (typeof rawColors === "object" && rawColors !== null) {
    Object.entries(rawColors).forEach(([key, value], index) => {
      const c = toEntry(value, index, key);
      if (c) {
        if (!c.name) c.name = key;
        colors.push(c);
      }
    });
  } else if (typeof rawColors === "string") {
    rawColors
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean)
      .forEach((name, index) => colors.push({ id: `color-${index}`, name, hex: "", imageIndex: -1 }));
  }

  if (!colors.length) {
    const seen = new Set();
    previewImages.forEach((entry, index) => {
      const colorName = String(entry.colorName || "").trim();
      const colorHex = String(entry.colorHex || "").trim();
      if (!colorName && !colorHex) return;
      const key = `${colorName || "color"}|${colorHex}`;
      if (seen.has(key)) return;
      seen.add(key);
      colors.push({ id: `color-${colors.length}`, name: colorName || "Color", hex: colorHex, imageIndex: index });
    });
  }
  return colors;
}

function parseProduct(doc) {
  const data = doc.data();
  const image = data.image || data.imageUrl || data.img || data.photo || data.thumbnail || "";
  const name = data.name || data.title || data.productName || "";
  const category = data.category || data.type || "Général";
  const priceRaw = data.price ?? data.amount ?? data.cost;
  const price = Number(priceRaw);
  const description = data.description || data.details || data.desc || "";
  const promoBadge = data.remise || data.promotion || data.promo || data.badge || data.tag || "";

  const previewImages = parsePreviewImages(data, image);
  const colors = parseColorOptions(data, previewImages);

  let sizes = data.sizes || data.size || [];
  if (typeof sizes === "string") sizes = sizes.split(",").map((s) => s.trim());
  if (!Array.isArray(sizes)) sizes = [String(sizes)];
  sizes = sizes.filter(Boolean).map((s) => String(s).toUpperCase());

  return {
    id: doc.id,
    name: String(name || "").trim(),
    category: String(category || "").trim(),
    price,
    image: String(image || "").trim(),
    promoBadge: String(promoBadge || "").trim(),
    description: String(description || "").trim(),
    previewImages,
    images: previewImages.map((p) => p.url).filter(Boolean),
    colors,
    sizes,
  };
}

async function getProductsFromPossibleCollections() {
  for (const colName of PRODUCTS_COLLECTION_CANDIDATES) {
    const snapshot = await getDocs(collection(db, colName));
    if (!snapshot.empty) return snapshot.docs.map(parseProduct);
  }
  const fallbackSnapshot = await getDocs(collection(db, PRODUCTS_COLLECTION_CANDIDATES[0]));
  return fallbackSnapshot.docs.map(parseProduct);
}

function renderSizes() {
  const sizes = [...new Set(allProducts.flatMap((p) => p.sizes || []))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
  if (!sizes.length) {
    sizesWrap.innerHTML = "";
    return;
  }
  sizesWrap.innerHTML = sizes
    .map((s) => `<button class="size-chip ${sizeFilter.has(s) ? "is-on" : ""}" data-size="${escapeHtml(s)}" type="button">${escapeHtml(s)}</button>`)
    .join("");
}

function applyFilters() {
  const term = qInput.value.trim().toLowerCase();
  const cat = catSelect.value;
  const minP = Math.min(Number(pMin.value), Number(pMax.value));
  const maxP = Math.max(Number(pMin.value), Number(pMax.value));
  const sizes = selectedSizes();

  filteredProducts = allProducts.filter((p) => {
    const okCat = cat === "all" || p.category === cat;
    const okTerm = !term || p.name.toLowerCase().includes(term);
    const okPrice = p.price >= minP && p.price <= maxP;
    const okSize = sizes.size === 0 || [...sizes].some((s) => (p.sizes || []).includes(s));
    return okCat && okTerm && okPrice && okSize;
  });

  renderGrid();
}

function renderGrid() {
  countEl.textContent = `${filteredProducts.length} produit${filteredProducts.length > 1 ? "s" : ""}`;
  if (!filteredProducts.length) {
    grid.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  grid.innerHTML = filteredProducts
    .map((p) => {
      const discountRate = extractDiscountRate(p.promoBadge);
      const discounted = discountRate ? Math.max(0, p.price * (1 - discountRate / 100)) : p.price;
      const priceHtml = discountRate
        ? `<span class="card__price">${escapeHtml(fmt(discounted))}</span><span class="card__old">${escapeHtml(fmt(p.price))}</span>`
        : `<span class="card__price">${escapeHtml(fmt(p.price))}</span>`;
      const badgeHtml = p.promoBadge ? `<span class="badge">${escapeHtml(p.promoBadge)}</span>` : "";
      const sizes = (p.sizes || []).slice(0, 6).join(", ");
      return `
      <article class="card" data-reveal>
        <div class="card__media" role="button" tabindex="0" data-qv="${escapeHtml(p.id)}" aria-label="Aperçu ${escapeHtml(p.name)}">
          ${badgeHtml}
          <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" />
        </div>
        <div class="card__body">
          <div class="card__cat">${escapeHtml(p.category || "Général")}</div>
          <div class="card__name">${escapeHtml(p.name)}</div>
          <div class="card__row">${priceHtml}</div>
          <div class="card__sizes">Tailles: ${escapeHtml(sizes || "N/D")}${(p.sizes || []).length > 6 ? "…" : ""}</div>
          <div class="card__actions">
            <button class="mini-btn mini-btn--solid" data-qv="${escapeHtml(p.id)}" type="button">Aperçu</button>
            <button class="mini-btn" data-add="${escapeHtml(p.id)}" type="button">Ajouter</button>
          </div>
        </div>
      </article>`;
    })
    .join("");

  bindGridEvents();
  observeReveals();
}

function bindGridEvents() {
  grid.querySelectorAll("[data-qv]").forEach((el) => {
    el.addEventListener("click", () => openQuickView(el.getAttribute("data-qv") || ""));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openQuickView(el.getAttribute("data-qv") || "");
    });
  });
  grid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-add") || "";
      const prod = allProducts.find((x) => x.id === id);
      const size = prod?.sizes?.[0] || "";
      if (!size) {
        openQuickView(id);
        return;
      }
      addToCart(id, { size, colorId: prod?.colors?.[0]?.id || "", imageUrl: prod?.image || "" });
      openLayer(cart);
    });
  });
}

function addToCart(productId, { size = "", colorId = "", imageUrl = "" } = {}) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;
  if (!size) return;
  const color = (product.colors || []).find((c) => c.id === colorId) || null;
  cartState.push({ product, size, color, imageUrl: imageUrl || product.image });
  renderCart();
}

function removeFromCart(index) {
  cartState.splice(index, 1);
  renderCart();
}

function renderCart() {
  cartCount.textContent = String(cartState.length);
  if (!cartState.length) {
    cartItems.innerHTML = `<p class="muted">Votre panier est vide.</p>`;
    cartTotal.textContent = fmt(0);
    return;
  }
  cartItems.innerHTML = cartState
    .map((item, idx) => {
      const colorName = item.color?.name || "N/S";
      return `
      <div class="cart-item">
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.product.name)}" />
        <div>
          <h4>${escapeHtml(item.product.name)}</h4>
          <div class="price">${escapeHtml(fmt(item.product.price))}</div>
          <div class="meta">Taille: ${escapeHtml(item.size)} • Couleur: ${escapeHtml(colorName)}</div>
        </div>
        <button class="remove" data-remove="${idx}" type="button">Retirer</button>
      </div>`;
    })
    .join("");

  const total = cartState.reduce((sum, item) => sum + (Number(item.product.price) || 0), 0);
  cartTotal.textContent = fmt(total);

  cartItems.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => removeFromCart(Number(btn.getAttribute("data-remove"))));
  });
}

function buildCheckoutMessageText() {
  if (!cartState.length) return "";
  const firstImageUrl = cartState[0]?.imageUrl ? String(cartState[0].imageUrl).trim() : "";

  const lines = cartState.map((item, i) => {
    const colorName = item.color?.name || "Couleur non spécifiée";
    const sizeName = item.size || "Taille non spécifiée";
    return [
      `${i + 1}. ${item.product.name}`,
      `Couleur: ${colorName}`,
      `Taille: ${sizeName}`,
      `Prix: ${fmt(item.product.price)}`,
    ].join("\n");
  });
  const total = cartState.reduce((sum, item) => sum + (Number(item.product.price) || 0), 0);

  return (
    (firstImageUrl ? firstImageUrl + "\n\n" : "") +
    "Bonjour EAGLE STORE, je souhaite commander ces articles :\n\n" +
    lines.join("\n\n") +
    `\n\nTotal: ${fmt(total)}`
  );
}

async function fetchProducts() {
  loader.hidden = false;
  try {
    allProducts = (await getProductsFromPossibleCollections()).filter(
      (p) => p.name && p.image && Number.isFinite(p.price) && p.category
    );

    statProductsEl.textContent = `${allProducts.length}+`;
    const categories = [...new Set(allProducts.map((p) => p.category))].sort((a, b) => a.localeCompare(b));
    catSelect.innerHTML = `<option value="all">Toutes</option>` + categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

    const hi = allProducts.length ? Math.max(...allProducts.map((p) => p.price), 100) : 100;
    const ceil = Math.ceil(hi);
    pMin.min = "0";
    pMax.min = "0";
    pMin.max = String(ceil);
    pMax.max = String(ceil);
    pMin.value = "0";
    pMax.value = String(ceil);
    syncRangeUI();

    renderSizes();
    applyFilters();

    setupHero();
  } catch (e) {
    console.error("Firestore fetch error:", e);
    grid.innerHTML = `<div class="empty">Impossible de charger les produits depuis Firestore. Vérifiez la console.</div>`;
  } finally {
    loader.hidden = true;
  }
}

function setupHero() {
  heroImages = [...new Set(allProducts.flatMap((p) => (p.images?.length ? p.images : [p.image])).filter(Boolean))];
  if (!heroImages.length) return;

  heroIndex = 0;
  heroImage.classList.remove("is-ready");
  heroImage.onload = () => {
    heroImage.classList.add("is-ready");
    heroImage.onload = null;
  };
  heroImage.src = heroImages[0];

  const thumbs = heroImages.slice(0, 10);
  heroRail.innerHTML = thumbs
    .map(
      (src, idx) => `
      <button class="thumb ${idx === 0 ? "is-active" : ""}" data-hero="${idx}" type="button" aria-label="Vedette ${idx + 1}">
        <img src="${escapeHtml(src)}" alt="" loading="lazy" />
      </button>`
    )
    .join("");

  heroRail.querySelectorAll("[data-hero]").forEach((btn) => {
    btn.addEventListener("click", () => gotoHero(Number(btn.getAttribute("data-hero"))));
  });

  const kick = () => {
    if (heroTimer) clearInterval(heroTimer);
    if (heroImages.length < 2) return;
    heroTimer = setInterval(() => gotoHero(heroIndex + 1), 5200);
  };
  kick();

  heroPrev.addEventListener("click", () => {
    gotoHero(heroIndex - 1);
    kick();
  });
  heroNext.addEventListener("click", () => {
    gotoHero(heroIndex + 1);
    kick();
  });
}

function gotoHero(nextIndex) {
  if (!heroImages.length) return;
  const max = heroImages.length;
  heroIndex = (nextIndex % max + max) % max;
  const nextSrc = heroImages[heroIndex];

  heroImage.classList.add("is-switching");
  setTimeout(() => {
    heroImage.onload = () => {
      heroImage.classList.remove("is-switching");
      heroImage.classList.add("is-ready");
      heroImage.onload = null;
    };
    heroImage.src = nextSrc;
    heroRail.querySelectorAll(".thumb").forEach((t, i) => t.classList.toggle("is-active", i === heroIndex));
  }, 220);
}

function openQuickView(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  qvProduct = product;
  qvSelectedSize = product.sizes?.[0] || "";
  qvSelectedColorId = product.colors?.[0]?.id || "";
  qvImages = (product.previewImages?.length ? product.previewImages : (product.images || []).map((url) => ({ url, colorName: "", colorHex: "" }))).filter((x) => x?.url);
  qvActiveImage = product.image || qvImages[0]?.url || "";

  qvTitle.textContent = product.name;
  qvCategory.textContent = product.category;
  qvPrice.textContent = fmt(product.price);
  qvDesc.textContent = product.description || "Aucune description disponible.";

  renderQVThumbs();
  renderQVColors();
  renderQVSizes();
  updateQVSummary();

  openModal(qv);
}

function renderQVThumbs() {
  qvThumbs.innerHTML = qvImages
    .slice(0, 12)
    .map(
      (img, idx) => `
      <button class="qv-thumb ${img.url === qvActiveImage ? "is-active" : ""}" data-qv-img="${idx}" type="button" aria-label="Miniature ${idx + 1}">
        <img src="${escapeHtml(img.url)}" alt="" loading="lazy" />
      </button>`
    )
    .join("");
  qvMain.src = qvActiveImage;
  qvThumbs.querySelectorAll("[data-qv-img]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-qv-img"));
      const url = qvImages[idx]?.url;
      if (!url) return;
      qvActiveImage = url;
      renderQVThumbs();
    });
  });
}

function renderQVColors() {
  if (!qvProduct) return;
  const colors = qvProduct.colors || [];
  if (!colors.length) {
    qvColors.innerHTML = `<span class="muted">Aucune couleur</span>`;
    return;
  }
  qvColors.innerHTML = colors
    .map(
      (c) => `<button class="swatch ${c.id === qvSelectedColorId ? "is-on" : ""}" data-qv-color="${escapeHtml(c.id)}" type="button" style="background:${escapeHtml(colorToCss(c))}" title="${escapeHtml(c.name)}" aria-label="${escapeHtml(c.name)}"></button>`
    )
    .join("");

  qvColors.querySelectorAll("[data-qv-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!qvProduct) return;
      const id = btn.getAttribute("data-qv-color") || "";
      qvSelectedColorId = id;
      const selected = (qvProduct.colors || []).find((x) => x.id === id);
      const target = Number.isInteger(selected?.imageIndex) && selected.imageIndex >= 0 ? qvImages[selected.imageIndex]?.url : "";
      if (target) qvActiveImage = target;
      renderQVColors();
      renderQVThumbs();
      updateQVSummary();
    });
  });
}

function renderQVSizes() {
  if (!qvProduct) return;
  const sizes = [...new Set(qvProduct.sizes || [])].filter(Boolean);
  if (!sizes.length) {
    qvSizes.innerHTML = `<span class="muted">Aucune taille</span>`;
    qvSelectedSize = "";
    qvAdd.disabled = true;
    return;
  }
  if (!qvSelectedSize) qvSelectedSize = sizes[0];
  qvSizes.innerHTML = sizes
    .map(
      (s) => `<button class="chip-btn ${s === qvSelectedSize ? "is-on" : ""}" data-qv-size="${escapeHtml(s)}" type="button">${escapeHtml(s)}</button>`
    )
    .join("");
  qvSizes.querySelectorAll("[data-qv-size]").forEach((btn) => {
    btn.addEventListener("click", () => {
      qvSelectedSize = btn.getAttribute("data-qv-size") || "";
      renderQVSizes();
      updateQVSummary();
    });
  });
  qvAdd.disabled = !qvSelectedSize;
}

function updateQVSummary() {
  if (!qvProduct) return;
  const color = (qvProduct.colors || []).find((c) => c.id === qvSelectedColorId);
  const cName = color?.name || "Couleur non spécifiée";
  const sName = qvSelectedSize || "Taille non sélectionnée";
  qvSummary.textContent = `Sélection: ${cName} • ${sName}`;
  qvAdd.disabled = !qvSelectedSize;
}

function observeReveals() {
  const els = document.querySelectorAll("[data-reveal]:not(.is-in)");
  if (!els.length) return;
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        obs.unobserve(e.target);
      });
    },
    { threshold: 0.14 }
  );
  els.forEach((el) => obs.observe(el));
}

// ---- Events ----
openMenuBtn.addEventListener("click", () => openLayer(menuDrawer));
closeMenuBtn.addEventListener("click", () => closeLayer(menuDrawer));
menuDrawer.addEventListener("click", (e) => {
  const a = e.target.closest("[data-close-drawer]");
  if (a) closeLayer(menuDrawer);
});

openCartBtn.addEventListener("click", () => openLayer(cart));
closeCartBtn.addEventListener("click", () => closeLayer(cart));

openSearchBtn.addEventListener("click", () => {
  openModal(searchModal);
  searchModalInput.value = qInput.value;
  setTimeout(() => searchModalInput.focus(), 50);
});
closeSearchBtn.addEventListener("click", () => closeModal(searchModal));
focusCatalogueBtn.addEventListener("click", () => {
  closeModal(searchModal);
  document.querySelector("#catalogue")?.scrollIntoView({ behavior: "smooth" });
  setTimeout(() => qInput.focus(), 300);
});
clearSearchBtn.addEventListener("click", () => {
  qInput.value = "";
  searchModalInput.value = "";
  applyFilters();
});
searchModalInput.addEventListener("input", () => {
  qInput.value = searchModalInput.value;
  applyFilters();
});

backdrop.addEventListener("click", () => {
  closeLayer(menuDrawer);
  closeLayer(cart);
  closeModal(searchModal);
  closeModal(qv);
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  closeLayer(menuDrawer);
  closeLayer(cart);
  closeModal(searchModal);
  closeModal(qv);
});

qInput.addEventListener("input", applyFilters);
catSelect.addEventListener("change", applyFilters);
pMin.addEventListener("input", () => {
  syncRangeUI();
  applyFilters();
});
pMax.addEventListener("input", () => {
  syncRangeUI();
  applyFilters();
});
resetBtn.addEventListener("click", () => {
  qInput.value = "";
  catSelect.value = "all";
  sizeFilter = new Set();
  pMin.value = "0";
  pMax.value = String(pMax.max || 1000);
  syncRangeUI();
  renderSizes();
  applyFilters();
});

sizesWrap.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-size]");
  if (!btn) return;
  const s = btn.getAttribute("data-size");
  if (!s) return;
  if (sizeFilter.has(s)) sizeFilter.delete(s);
  else sizeFilter.add(s);
  renderSizes();
  applyFilters();
});

closeQV.addEventListener("click", () => closeModal(qv));
qvAdd.addEventListener("click", () => {
  if (!qvProduct || !qvSelectedSize) return;
  addToCart(qvProduct.id, {
    size: qvSelectedSize,
    colorId: qvSelectedColorId,
    imageUrl: qvMain.src || qvActiveImage || qvProduct.image,
  });
  closeModal(qv);
  openLayer(cart);
});

checkoutWA.addEventListener("click", () => {
  const msg = buildCheckoutMessageText();
  if (!msg) {
    alert("Votre panier est vide.");
    return;
  }
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
});
checkoutCall.addEventListener("click", () => {
  if (!cartState.length) {
    alert("Votre panier est vide.");
    return;
  }
  window.location.href = `tel:${PHONE_NUMBER}`;
});

function hydrateContactLinks() {
  waLink.href = `https://wa.me/${WHATSAPP_NUMBER}`;
  callLink.href = `tel:${PHONE_NUMBER}`;
}

// ---- Init ----
yearEl.textContent = String(new Date().getFullYear());
hydrateContactLinks();
syncRangeUI();
observeReveals();
renderCart();
fetchProducts();

