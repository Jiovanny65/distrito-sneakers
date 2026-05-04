/* ============================================
   Distrito Sneakers — Lógica de tienda
   ============================================ */

// Número de WhatsApp (cambiar por el real - formato Chile sin símbolos)
const WHATSAPP_NUMBER = '56977539776';

// ============ DATA: PRODUCTOS (Supabase) ============
let PRODUCTS = [];

async function loadProducts() {
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('active', true)
    .order('featured', { ascending: false })
    .order('id', { ascending: true });

  if (error) {
    console.error('Error cargando productos:', error);
    return;
  }
  PRODUCTS = data || [];
}

// ============ HELPERS ============
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

const formatPrice = (price) => {
  return '$' + price.toLocaleString('es-AR');
};

// ============ RENDER PRODUCTS ============
function productCard(p) {
  const img = p.image_url;
  const media = img
    ? `<img class="product__img" src="${img}" alt="${p.name}" loading="lazy">`
    : `<span class="product__emoji">👟</span>`;
  return `
    <article class="product" data-category="${p.category}" data-id="${p.id}">
      <div class="product__image">
        ${p.tag ? `<span class="product__tag ${p.tag === 'Edición Limitada' || p.tag === 'Holy Grail' || p.tag === 'Grail' ? 'product__tag--dark' : ''}">${p.tag}</span>` : ''}
        ${media}
      </div>
      <div class="product__body">
        <span class="product__cat">${p.category}</span>
        <h3 class="product__name">${p.name}</h3>
        <p class="product__desc">${p.description}</p>
        <div class="product__footer">
          <span class="product__price">${formatPrice(p.price)}</span>
          <button class="product__btn" data-action="open" data-id="${p.id}">Comprar →</button>
        </div>
      </div>
    </article>
  `;
}

function renderCatalog(filter = 'all') {
  const grid = $('#catalogGrid');
  let filtered = PRODUCTS;
  if (filter === 'travis') {
    filtered = PRODUCTS.filter(p => /travis|cactus jack|fragment/i.test(p.name));
  } else if (filter === 'gs') {
    filtered = PRODUCTS.filter(p => /^\(GS\)/i.test(p.name));
  } else if (filter !== 'all') {
    filtered = PRODUCTS.filter(p => p.category === filter);
  }
  grid.innerHTML = filtered.map(productCard).join('');
}

function renderFeatured() {
  const grid = $('#featuredGrid');
  const featured = PRODUCTS.filter(p => p.featured);
  grid.innerHTML = featured.map(productCard).join('');
}

// ============ FILTERS ============
function setupFilters() {
  $$('#filters .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('#filters .chip').forEach(c => c.classList.remove('chip--active'));
      chip.classList.add('chip--active');
      renderCatalog(chip.dataset.filter);
    });
  });

}

// ============ MODAL: PRODUCT DETAIL + FORM ============
function openProductModal(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const modal = $('#productModal');
  const body = $('#modalBody');

  const isShoes = product.category === 'zapatillas';

  const img = product.image_url;
  const detailMedia = img
    ? `<img class="detail__img" src="${img}" alt="${product.name}">`
    : `<span class="detail__emoji">👟</span>`;

  body.innerHTML = `
    <div class="detail">
      <div class="detail__image">
        ${detailMedia}
      </div>
      <div class="detail__content">
        <span class="detail__cat">${product.category}</span>
        <h2 class="detail__title">${product.name}</h2>
        <div class="detail__price">${formatPrice(product.price)}</div>
        <p class="detail__desc">${product.description}</p>

        <form class="form" id="orderForm" novalidate>
          <input type="hidden" name="productId" value="${product.id}">
          <input type="hidden" name="productName" value="${product.name}">
          <input type="hidden" name="productType" value="${isShoes ? 'Zapatilla' : 'Accesorio'}">
          <input type="hidden" name="precioBase" value="${product.price}">

          <div class="form__group">
            <label>Nombre <span class="req">*</span></label>
            <input type="text" name="nombre" required placeholder="Tu nombre completo">
          </div>

          <div class="form__group">
            <label>Teléfono <span class="req">*</span></label>
            <input type="tel" name="telefono" required placeholder="+54 9 11 1234-5678">
          </div>

          ${isShoes ? `
            <div class="form__group">
              <label>Modelo</label>
              <input type="text" name="modelo" value="${product.name}" readonly>
            </div>
            <div class="form__group">
              <label>Talla <span class="req">*</span></label>
              <select name="talla" required>
                <option value="">Selecciona talla</option>
                ${product.sizes.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
          ` : `
            <div class="form__group">
              <label>Producto</label>
              <input type="text" name="producto" value="${product.name}" readonly>
            </div>
            <div class="form__group">
              <label>Tamaño / Medida</label>
              <select name="tamano">
                ${product.sizes.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
          `}

          <div class="form__group">
            <label>Color <span class="req">*</span></label>
            <select name="color" required>
              <option value="">Selecciona color</option>
              ${product.colors.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>

          <div class="form__group">
            <label>Calidad <span class="req">*</span></label>
            <select name="calidad" required>
              <option value="">Selecciona calidad</option>
              <option value="PK (Perfect Kick)">PK · Perfect Kick</option>
              <option value="G5">G5 · Alta gama</option>
              <option value="OG (Original)">OG · Original</option>
            </select>
          </div>

          <div class="form__group">
            <label>Cantidad <span class="req">*</span></label>
            <input type="number" name="cantidad" min="1" value="1" required>
          </div>

          <div class="form__group">
            <label>Método de entrega <span class="req">*</span></label>
            <select name="entrega" required id="entregaSelect">
              <option value="">Selecciona método</option>
              <option value="Envío a domicilio (todo Chile)">Envío a domicilio (todo Chile)</option>
              <option value="Retiro en sucursal">Retiro en sucursal</option>
              <option value="Punto de encuentro">Punto de encuentro</option>
            </select>
          </div>

          <div class="form__group">
            <label>Valor</label>
            <input type="text" name="valor" value="${formatPrice(product.price)}" readonly>
          </div>

          <div class="form__group form__group--full" id="direccionGroup" style="display:none;">
            <label>Dirección de entrega</label>
            <input type="text" name="direccion" placeholder="Calle, número, comuna, ciudad, región">
          </div>

          <div class="form__group form__group--full">
            <label>Comentarios adicionales</label>
            <textarea name="comentarios" placeholder="Indicaciones especiales, dudas o preferencias..."></textarea>
          </div>

          <div class="form__actions">
            <button type="submit" class="btn btn--whatsapp btn--lg btn--block">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84c0 2.09.55 4.12 1.6 5.92L0 24l6.4-1.68a11.82 11.82 0 0 0 5.64 1.43h.01c6.54 0 11.84-5.3 11.84-11.84a11.8 11.8 0 0 0-3.37-8.43Z"/></svg>
              Comprar por WhatsApp
            </button>
          </div>

          <p class="form__hint">Al enviar, se abrirá WhatsApp con el resumen de tu pedido. No se realiza cobro online.</p>
        </form>
      </div>
    </div>
  `;

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Mostrar campo dirección solo si es envío
  const entregaSelect = $('#entregaSelect');
  const direccionGroup = $('#direccionGroup');
  entregaSelect.addEventListener('change', () => {
    const needsAddress = entregaSelect.value.startsWith('Envío');
    direccionGroup.style.display = needsAddress ? 'flex' : 'none';
    direccionGroup.querySelector('input').required = needsAddress;
  });

  // Recalcular valor según cantidad
  const cantidadInput = body.querySelector('[name="cantidad"]');
  const valorInput = body.querySelector('[name="valor"]');
  cantidadInput.addEventListener('input', () => {
    const qty = parseInt(cantidadInput.value) || 1;
    valorInput.value = formatPrice(product.price * qty);
  });

  // Submit -> WhatsApp
  $('#orderForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleOrderSubmit(e.target, product);
  });
}

function closeModal() {
  const modal = $('#productModal');
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// ============ WHATSAPP MESSAGE ============
function handleOrderSubmit(form, product) {
  const data = Object.fromEntries(new FormData(form).entries());
  const isShoes = product.category === 'zapatillas';

  const cantidad = parseInt(data.cantidad) || 1;
  const totalValor = formatPrice(product.price * cantidad);

  let message = '*Hola, quiero realizar el siguiente pedido:*\n\n';
  message += `*Producto:* ${data.productName}\n`;
  message += `*Tipo:* ${isShoes ? 'Zapatilla' : 'Accesorio'}\n`;

  if (isShoes) {
    message += `*Modelo:* ${data.modelo}\n`;
    message += `*Talla:* ${data.talla}\n`;
  } else {
    if (data.tamano) message += `*Tamaño/Medida:* ${data.tamano}\n`;
  }

  message += `*Color:* ${data.color}\n`;
  if (data.calidad) message += `*Calidad:* ${data.calidad}\n`;
  message += `*Cantidad:* ${cantidad}\n`;
  message += `*Valor:* ${totalValor}\n`;
  message += `*Nombre:* ${data.nombre}\n`;
  message += `*Teléfono:* ${data.telefono}\n`;
  message += `*Método de entrega:* ${data.entrega}\n`;

  if (data.direccion && data.entrega && data.entrega.startsWith('Envío')) {
    message += `*Dirección:* ${data.direccion}\n`;
  }

  if (data.comentarios && data.comentarios.trim()) {
    message += `*Comentarios:* ${data.comentarios}\n`;
  }

  message += `\nQuedo atento/a para confirmar disponibilidad, coordinar el pago y recibir el número de rastreo. Sé que el tiempo de envío es de 2 a 4 semanas a todo Chile.`;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

// ============ EVENT DELEGATION ============
function setupEvents() {
  // Abrir modal
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="open"]');
    if (btn) {
      const id = parseInt(btn.dataset.id);
      openProductModal(id);
    }
  });

  // Cerrar modal
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-close]')) closeModal();
  });

  // ESC para cerrar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Hamburger menu
  const hamburger = $('#hamburger');
  const nav = $('#nav');
  hamburger.addEventListener('click', () => {
    nav.classList.toggle('is-open');
  });

  // Cerrar nav móvil al hacer click en link
  $$('#nav a').forEach(a => {
    a.addEventListener('click', () => nav.classList.remove('is-open'));
  });
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', async () => {
  setupEvents();
  setupFilters();

  // Skeleton mientras cargan
  $('#catalogGrid').innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--gray-500);">Cargando productos...</p>';
  $('#featuredGrid').innerHTML = '';

  await loadProducts();
  renderFeatured();
  renderCatalog();
});
