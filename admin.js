/* ============================================
   Speed Style CL — Admin Panel Logic
   ============================================ */

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => c.querySelectorAll(s);

// ============ AUTH ============
async function checkAuth() {
  try {
    if (typeof sb === 'undefined' || !sb || !sb.auth) {
      console.warn('[ADMIN] Supabase no disponible al chequear sesion');
      showLogin();
      return;
    }
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      showDashboard(session.user);
    } else {
      showLogin();
    }
  } catch (err) {
    console.error('[ADMIN] Error en checkAuth:', err);
    showLogin();
  }
}

function showLogin() {
  $('#loginScreen').hidden = false;
  $('#dashboard').hidden = true;
}

function showDashboard(user) {
  $('#loginScreen').hidden = true;
  $('#dashboard').hidden = false;
  $('#userEmail').textContent = user.email;
  // Por defecto la primera tab es "Pedidos"
  loadOrders();
  loadProducts().then(() => loadFeaturedRotation());
  loadCategories();
}

function attachLoginHandler() {
  const form = $('#loginForm');
  if (!form) {
    console.error('[ADMIN] No se encontro #loginForm');
    return;
  }

  // Verificacion al cargar
  if (typeof sb === 'undefined' || !sb || !sb.auth) {
    console.error('[ADMIN] El cliente Supabase no se inicializo. Revisa que el SDK haya cargado.');
    const errEl = $('#loginError');
    if (errEl) errEl.textContent = 'Error: no se cargo el SDK de Supabase. Revisa tu conexion.';
  } else {
    console.log('[ADMIN] Supabase cliente OK ✓');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    const errEl = $('#loginError');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    errEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ingresando...';

    console.log('[ADMIN] Intentando login con:', email);

    try {
      if (typeof sb === 'undefined' || !sb || !sb.auth) {
        throw new Error('Cliente Supabase no disponible. Recarga la pagina.');
      }
      const { error, data } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[ADMIN] Error de Supabase:', error);
        errEl.textContent = '⚠️ ' + error.message;
        return;
      }
      console.log('[ADMIN] Login OK', data.user.email);
      showDashboard(data.user);
    } catch (err) {
      console.error('[ADMIN] Excepcion:', err);
      errEl.textContent = '⚠️ ' + (err.message || 'Error desconocido');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

attachLoginHandler();

$('#logoutBtn').addEventListener('click', async () => {
  await sb.auth.signOut();
  showLogin();
});

// ============ PRODUCTS STATE ============
let allProducts = [];

async function loadProducts() {
  const { data, error } = await sb
    .from('products')
    .select('*')
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })
    .range(0, 49999);

  if (error) {
    toast('Error cargando productos: ' + error.message, 'error');
    return;
  }
  allProducts = data || [];
  renderTable();
  renderStats();
  renderFeaturedTab();
}

function renderStats() {
  $('#statTotal').textContent = allProducts.length;
  $('#statActive').textContent = allProducts.filter(p => p.active).length;
  $('#statFeatured').textContent = allProducts.filter(p => p.featured).length;
}

function applyFilters(list) {
  const q = ($('#searchBox').value || '').toLowerCase().trim();
  const status = $('#filterStatus').value;

  return list.filter(p => {
    if (status === 'active'   && !p.active) return false;
    if (status === 'inactive' &&  p.active) return false;
    if (status === 'featured' && !p.featured) return false;
    if (!q) return true;
    const hay = [
      p.name, p.tag, p.category, p.description,
      (p.colors || []).join(' '), (p.sizes || []).join(' ')
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

function renderTable() {
  const tbody = $('#productsBody');
  const list = applyFilters(allProducts);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table__empty">No hay productos que coincidan.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(p => `
    <tr data-id="${p.id}">
      <td>
        ${p.image_url
          ? `<img class="table__thumb" src="${p.image_url}" alt="">`
          : `<div class="table__thumb table__thumb--empty">👟</div>`}
      </td>
      <td class="table__name">
        ${escapeHtml(p.name)}
        <small>${escapeHtml(p.category)}${p.colors && p.colors.length ? ' · ' + escapeHtml(p.colors.join(', ')) : ''}</small>
      </td>
      <td class="table__price">$${(p.price || 0).toLocaleString('es-CL')}</td>
      <td>${p.tag ? `<span class="table__tag">${escapeHtml(p.tag)}</span>` : '—'}</td>
      <td>${p.featured ? '<span class="badge-on">★ Sí</span>' : '<span class="badge-off">No</span>'}</td>
      <td>${p.active   ? '<span class="badge-on">Activo</span>'   : '<span class="badge-off">Inactivo</span>'}</td>
      <td class="actions-cell">
        <button class="icon-btn" data-edit="${p.id}" title="Editar">✏️</button>
        <button class="icon-btn" data-toggle="${p.id}" title="${p.active ? 'Desactivar' : 'Activar'}">${p.active ? '👁️' : '🚫'}</button>
        <button class="icon-btn icon-btn--danger" data-delete="${p.id}" title="Eliminar">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ============ FILTERS ============
$('#searchBox').addEventListener('input', renderTable);
$('#filterStatus').addEventListener('change', renderTable);

// ============ TABLE ACTIONS ============
$('#productsBody').addEventListener('click', async (e) => {
  const editId = e.target.closest('[data-edit]')?.dataset.edit;
  const delId  = e.target.closest('[data-delete]')?.dataset.delete;
  const togId  = e.target.closest('[data-toggle]')?.dataset.toggle;

  if (editId) openProductModal(allProducts.find(p => p.id == editId));
  if (delId)  deleteProduct(delId);
  if (togId)  toggleActive(togId);
});

async function deleteProduct(id) {
  const product = allProducts.find(p => p.id == id);
  if (!confirm(`¿Eliminar "${product?.name}"? Esta acción no se puede deshacer.`)) return;

  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) return toast('Error: ' + error.message, 'error');
  toast('Producto eliminado', 'success');
  loadProducts();
}

async function toggleActive(id) {
  const product = allProducts.find(p => p.id == id);
  const { error } = await sb.from('products').update({ active: !product.active }).eq('id', id);
  if (error) return toast('Error: ' + error.message, 'error');
  toast(product.active ? 'Producto desactivado' : 'Producto activado', 'success');
  loadProducts();
}

// ============ MODAL ============
const modal = $('#productModal');

const DEFAULT_SIZES = ['36','37','38','39','40','41','42','43','44','45','46'];

function populateProductCategorySelect(selectedId = '') {
  const sel = $('#prodCategorySelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecciona una categoría</option>'
    + allCategories.map(c =>
        `<option value="${c.id}" ${String(c.id) === String(selectedId) ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
      ).join('');
}

function renderSizeChips(activeSizes = []) {
  const wrap = $('#prodSizeChips');
  if (!wrap) return;
  // Unir defaults + tallas custom del producto
  const allSizes = Array.from(new Set([...DEFAULT_SIZES, ...activeSizes]));
  // Ordenar numéricamente si es número, alfabético si no
  allSizes.sort((a, b) => {
    const na = parseFloat(a), nb = parseFloat(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });
  const isCustom = (s) => !DEFAULT_SIZES.includes(s);
  wrap.innerHTML = allSizes.map(s => {
    const isActive = activeSizes.includes(s);
    return `<button type="button" class="size-chip ${isActive ? 'is-active' : ''}" data-size="${escapeHtml(s)}">
              ${escapeHtml(s)}${isCustom(s) ? '<span class="size-chip__remove" data-remove-size="' + escapeHtml(s) + '">×</span>' : ''}
            </button>`;
  }).join('');
}

// Flag explícito del modo del modal de producto
let productModalMode = 'create';   // 'create' | 'edit'
let productModalEditId = null;

function openProductModal(product = null) {
  const form = $('#productForm');
  form.reset();
  $('#imgPreview').innerHTML = '<span>Sin imagen</span>';
  // SIEMPRE limpiar el hidden id (defensa contra restos de modal anterior)
  $('#prodHiddenId').value = '';

  if (product) {
    productModalMode = 'edit';
    productModalEditId = product.id;
    $('#modalTitle').textContent = 'Editar producto · #' + product.id;
    $('#prodHiddenId').value = product.id;
    form.name.value        = product.name || '';
    form.tag.value         = product.tag || '';
    form.image_url.value   = product.image_url || '';
    form.description.value = product.description || '';
    form.featured.checked  = !!product.featured;
    form.active.checked    = product.active !== false;
    const qp = product.quality_prices || {};
    form.price_PK.value = qp.PK || '';
    form.price_G5.value = qp.G5 || '';
    populateProductCategorySelect(product.category_id || '');
    renderSizeChips(product.sizes || DEFAULT_SIZES);
    if (product.image_url) {
      $('#imgPreview').innerHTML = `<img src="${product.image_url}" alt="">`;
    }
  } else {
    productModalMode = 'create';
    productModalEditId = null;
    $('#modalTitle').textContent = '+ Nuevo producto';
    form.active.checked = true;
    form.price_PK.value = '';
    form.price_G5.value = '';
    populateProductCategorySelect('');
    renderSizeChips(DEFAULT_SIZES);  // Todas activas por defecto
  }

  console.log('[openProductModal] mode=', productModalMode, 'id=', productModalEditId);
  modal.classList.add('is-open');
}

// Handler chips de talla: toggle on click, remove on × click
document.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('[data-remove-size]');
  if (removeBtn) {
    e.stopPropagation();
    e.preventDefault();
    const sizeToRemove = removeBtn.dataset.removeSize;
    // Tomar tallas activas actuales (sin la que removemos) y re-render
    const active = Array.from($$('#prodSizeChips .size-chip.is-active'))
      .map(c => c.dataset.size)
      .filter(s => s !== sizeToRemove);
    // También quitar de los chips disponibles si era custom
    renderSizeChips(active);
    return;
  }
  const chip = e.target.closest('#prodSizeChips .size-chip');
  if (chip) {
    e.preventDefault();
    chip.classList.toggle('is-active');
  }
});

// Agregar talla personalizada
$('#prodAddSizeBtn')?.addEventListener('click', () => {
  const input = $('#prodCustomSize');
  const val = (input.value || '').trim();
  if (!val) return;
  const active = Array.from($$('#prodSizeChips .size-chip.is-active')).map(c => c.dataset.size);
  if (!active.includes(val)) active.push(val);
  renderSizeChips(active);
  input.value = '';
});
$('#prodCustomSize')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#prodAddSizeBtn').click();
  }
});

function closeModal() {
  modal.classList.remove('is-open');
}

modal.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
});

$('#newProductBtn').addEventListener('click', () => openProductModal());

// ============ IMAGE UPLOAD ============
$('#imgFileBtn').addEventListener('click', () => $('#imgFile').click());

$('#imgFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Preview inmediato
  const localUrl = URL.createObjectURL(file);
  $('#imgPreview').innerHTML = `<img src="${localUrl}" alt="">`;
  toast('Subiendo imagen...');

  // Sanitizar nombre
  const ext = file.name.split('.').pop().toLowerCase();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;

  const { error } = await sb.storage
    .from('products')
    .upload(safeName, file, { cacheControl: '3600', upsert: false });

  if (error) return toast('Error subiendo imagen: ' + error.message, 'error');

  const { data: { publicUrl } } = sb.storage.from('products').getPublicUrl(safeName);
  $('#imgUrl').value = publicUrl;
  toast('Imagen subida ✓', 'success');
});

$('#imgUrl').addEventListener('input', (e) => {
  const url = e.target.value.trim();
  if (url) $('#imgPreview').innerHTML = `<img src="${url}" alt="" onerror="this.style.display='none'">`;
});

// ============ FORM SUBMIT ============
$('#productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);

  // Doble verificación: usamos el flag explícito + el hidden input
  const hiddenId = fd.get('product_id');
  const isEdit = productModalMode === 'edit' && !!productModalEditId;
  const id = isEdit ? productModalEditId : null;

  // Sanity check: si el modo dice CREATE pero el hidden tiene un id,
  // es una inconsistencia. Forzamos CREATE para no sobrescribir.
  if (productModalMode === 'create' && hiddenId) {
    console.warn('[saveProduct] INCONSISTENCIA: modo create pero hidden tiene id=', hiddenId, '. Forzando INSERT.');
  }
  console.log('[saveProduct] mode=', productModalMode, 'isEdit=', isEdit, 'id=', id);

  // Construir quality_prices solo con las calidades que tienen valor
  const qp = {};
  ['PK', 'G5'].forEach(k => {
    const v = parseInt(fd.get('price_' + k), 10);
    if (v > 0) qp[k] = v;
  });

  if (Object.keys(qp).length === 0) {
    return toast('Define al menos un precio por calidad (G5 o PK)', 'error');
  }

  // El campo 'price' del schema se autocompleta con el precio menor (para
  // mantener compatibilidad con queries antiguas que filtran/ordenan por price).
  const minPrice = Math.min(...Object.values(qp));

  // Validar categoría
  const categoryId = fd.get('category_id');
  if (!categoryId) {
    return toast('Selecciona una categoría', 'error');
  }

  // Tomar tallas activas desde los chips
  const activeSizes = Array.from($$('#prodSizeChips .size-chip.is-active'))
    .map(c => c.dataset.size);
  if (activeSizes.length === 0) {
    return toast('Selecciona al menos una talla', 'error');
  }

  const wantFeatured = fd.get('featured') === 'on';

  // Guard: rotación automática ignora selección manual
  if (wantFeatured && featuredRotation.enabled) {
    if (!confirm(
      'La rotación automática está ACTIVA — los cambios manuales de destacados quedan ignorados hasta que la apagues. ¿Guardar de todos modos?'
    )) return;
  }

  // Guard: máx 5 destacados manuales simultáneos
  const currentFeaturedIds = allProducts.filter(p => p.featured).map(p => p.id);
  const willBeFeatured = wantFeatured
    ? Array.from(new Set([...currentFeaturedIds, isEdit ? Number(id) : -1]))
      .filter(pid => pid !== Number(id) || wantFeatured)
    : currentFeaturedIds.filter(pid => pid !== Number(id));

  if (wantFeatured && !featuredRotation.enabled) {
    const alreadyFeat = isEdit && allProducts.find(p => p.id == id)?.featured;
    const projectedCount = alreadyFeat ? currentFeaturedIds.length : currentFeaturedIds.length + 1;
    if (projectedCount > MAX_FEATURED) {
      return toast('Ya tienes 5 productos destacados, desmarca uno para agregar otro.', 'error');
    }
  }

  const payload = {
    name:           fd.get('name').trim(),
    category:       fd.get('category') || 'zapatillas',
    category_id:    parseInt(categoryId, 10),
    price:          minPrice,
    quality_prices: qp,
    tag:            fd.get('tag').trim() || null,
    image_url:      fd.get('image_url').trim() || null,
    description:    fd.get('description').trim() || null,
    sizes:          activeSizes,
    colors:         splitCsv(fd.get('colors')),
    featured:       wantFeatured,
    active:         fd.get('active') === 'on'
  };

  let result;
  if (isEdit) {
    console.log('[saveProduct] UPDATE producto id=', id);
    result = await sb.from('products').update(payload).eq('id', id);
  } else {
    // Asignar display_order al final
    const maxOrder = allProducts.length
      ? Math.max(0, ...allProducts.map(p => p.display_order || 0))
      : 0;
    payload.display_order = maxOrder + 10;
    console.log('[saveProduct] INSERT nuevo producto, display_order=', payload.display_order);
    result = await sb.from('products').insert(payload);
  }

  if (result.error) {
    console.error('[saveProduct] FAILED:', result.error);
    return toast('Error: ' + result.error.message, 'error');
  }
  console.log('[saveProduct] OK');
  toast(isEdit ? 'Producto actualizado ✓' : 'Producto creado ✓', 'success');
  closeModal();
  loadProducts();
});

function splitCsv(str) {
  return (str || '').split(',').map(s => s.trim()).filter(Boolean);
}

// ============ TOAST ============
let toastTimeout;
function toast(message, type = '') {
  const t = $('#toast');
  t.textContent = message;
  t.className = 'toast is-visible' + (type ? ' toast--' + type : '');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('is-visible'), 3200);
}

// ============================================
//   ORDERS / PEDIDOS
// ============================================

let allOrders = [];

const STATUS_LABELS = {
  pending:    'Pendiente',
  confirmed:  'Confirmado',
  preparing:  'En preparación',
  shipped:    'Enviado',
  delivered:  'Entregado',
  cancelled:  'Cancelado'
};

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

function fmtCLP(n) {
  return '$' + Number(n || 0).toLocaleString('es-CL');
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function statusPill(status) {
  return `<span class="status-pill status-pill--${status}">${STATUS_LABELS[status] || status}</span>`;
}

function paymentPill(pm) {
  const labels = {
    whatsapp:    '💬 WhatsApp',
    manual:      '📝 Manual',
    mercadopago: '💳 Mercado Pago'
  };
  const label = labels[pm] || pm;
  return `<span class="payment-pill payment-pill--${pm}">${label}</span>`;
}

async function loadOrders() {
  const { data, error } = await sb
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .range(0, 49999);

  if (error) {
    toast('Error cargando pedidos: ' + error.message, 'error');
    return;
  }
  allOrders = data || [];
  renderOrdersTable();
  renderOrderStats();
}

function renderOrderStats() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const pendings = allOrders.filter(o => o.status === 'pending').length;
  const todayOrders = allOrders.filter(o => new Date(o.created_at) >= today).length;
  const monthSales = allOrders
    .filter(o => new Date(o.created_at) >= monthStart && o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total || 0), 0);

  $('#oStatTotal').textContent   = allOrders.length;
  $('#oStatPending').textContent = pendings;
  $('#oStatToday').textContent   = todayOrders;
  $('#oStatMonth').textContent   = fmtCLP(monthSales);
}

function renderOrdersTable() {
  const tbody = $('#ordersBody');
  const q = ($('#orderSearch').value || '').toLowerCase().trim();
  const status = $('#orderFilterStatus').value;
  const payment = $('#orderFilterPayment').value;

  let list = allOrders;
  if (status !== 'all')  list = list.filter(o => o.status === status);
  if (payment !== 'all') list = list.filter(o => o.payment_method === payment);
  if (q) list = list.filter(o => {
    const hay = [
      o.id, o.customer_name, o.customer_phone, o.product_name,
      o.region, o.comuna, o.color, o.size
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="table__empty">No hay pedidos.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(o => {
    const addrSummary = [o.comuna, o.region].filter(Boolean).join(', ') || (o.delivery_method && o.delivery_method.startsWith('Punto') ? 'Punto encuentro · Curicó' : '—');
    return `
    <tr data-order="${o.id}" style="cursor:pointer;">
      <td><strong>#${o.id}</strong></td>
      <td>${fmtDate(o.created_at)}</td>
      <td class="table__name">
        ${escapeHtml(o.customer_name)}
        <small>📞 ${escapeHtml(o.customer_phone)}${o.customer_email ? ' · ✉️ ' + escapeHtml(o.customer_email) : ''}</small>
        <small>📍 ${escapeHtml(addrSummary)}</small>
      </td>
      <td class="table__name">
        ${escapeHtml(o.product_name)}
        <small>${[o.size && 'T' + o.size, o.color, o.quality].filter(Boolean).map(escapeHtml).join(' · ') || ''} · x${o.quantity}</small>
      </td>
      <td class="table__price">${fmtCLP(o.total)}</td>
      <td>${paymentPill(o.payment_method)}</td>
      <td>${statusPill(o.status)}</td>
      <td><button class="icon-btn" data-view="${o.id}" title="Ver">👁️</button></td>
    </tr>
  `;}).join('');
}

$('#orderSearch').addEventListener('input', renderOrdersTable);
$('#orderFilterStatus').addEventListener('change', renderOrdersTable);
$('#orderFilterPayment').addEventListener('change', renderOrdersTable);

$('#ordersBody').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-order]');
  if (!tr) return;
  const id = tr.dataset.order;
  openOrderModal(id);
});

const orderModal = $('#orderModal');

async function openOrderModal(id) {
  const order = allOrders.find(o => String(o.id) === String(id));
  if (!order) return;

  // Cargar eventos
  const { data: events } = await sb
    .from('order_events')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  const phoneClean = (order.customer_phone || '').replace(/\D/g, '');
  const waLink = `https://wa.me/${phoneClean}`;
  const fullAddr = order.full_address || [order.street, order.comuna, order.region].filter(Boolean).join(', ');

  $('#orderModalBody').innerHTML = `
    <div class="order-detail__head">
      <div class="order-detail__title">
        <h2>Pedido #${order.id}</h2>
        <small>Creado el ${fmtDate(order.created_at)} · Última actualización ${fmtDate(order.updated_at)}</small>
      </div>
      <div>${statusPill(order.status)}</div>
    </div>

    <div class="order-detail__grid">
      <div>
        <div class="order-card">
          <h3>Producto</h3>
          <div class="order-product">
            ${order.product_image_url ? `<img src="${order.product_image_url}" alt="">` : '<div class="order-product__info" style="font-size:42px;">👟</div>'}
            <div class="order-product__info">
              <strong>${escapeHtml(order.product_name)}</strong>
              <small>${[order.size && `Talla: ${order.size}`, order.color && `Color: ${order.color}`, order.quality && `Calidad: ${order.quality}`].filter(Boolean).join(' · ')}</small>
              <small>Cantidad: ${order.quantity} · Unitario ${fmtCLP(order.unit_price)}</small>
            </div>
            <div class="order-total">${fmtCLP(order.total)}</div>
          </div>
        </div>

        <div class="order-card">
          <h3>Cliente</h3>
          <dl>
            <dt>Nombre:</dt><dd>${escapeHtml(order.customer_name)}</dd>
            <dt>Teléfono:</dt><dd><a href="${waLink}" target="_blank">${escapeHtml(order.customer_phone)} 💬</a></dd>
            ${order.customer_email ? `<dt>Email:</dt><dd>${escapeHtml(order.customer_email)}</dd>` : ''}
          </dl>
        </div>

        <div class="order-card">
          <h3>Entrega</h3>
          <dl>
            <dt>Método:</dt><dd>${escapeHtml(order.delivery_method || '—')}</dd>
            ${fullAddr ? `<dt>Dirección:</dt><dd>${escapeHtml(fullAddr)} <button class="icon-btn" onclick="navigator.clipboard.writeText('${escapeHtml(fullAddr).replace(/'/g, "\\'")}')" title="Copiar">📋</button></dd>` : ''}
            ${order.region   ? `<dt>Región:</dt><dd>${escapeHtml(order.region)}</dd>` : ''}
            ${order.comuna   ? `<dt>Comuna:</dt><dd>${escapeHtml(order.comuna)}</dd>` : ''}
            ${order.zip_code ? `<dt>CP:</dt><dd>${escapeHtml(order.zip_code)}</dd>` : ''}
            ${order.comments ? `<dt>Comentarios:</dt><dd>${escapeHtml(order.comments)}</dd>` : ''}
          </dl>
        </div>
      </div>

      <div>
        <div class="order-card">
          <h3>Pago</h3>
          <dl>
            <dt>Método:</dt><dd>${paymentPill(order.payment_method)}</dd>
            ${order.mp_payment_id ? `<dt>ID MP:</dt><dd>${escapeHtml(order.mp_payment_id)}</dd>` : ''}
            ${order.mp_status    ? `<dt>Estado MP:</dt><dd>${escapeHtml(order.mp_status)}</dd>` : ''}
            ${order.mp_external_reference ? `<dt>Ref:</dt><dd style="font-size:11px;">${escapeHtml(order.mp_external_reference)}</dd>` : ''}
          </dl>
        </div>

        <div class="order-card">
          <h3>Cambiar estado</h3>
          <div class="status-changer" id="statusChanger">
            ${STATUS_FLOW.map(s => `
              <button class="status-btn ${order.status === s ? 'status-btn--current' : ''}" data-set-status="${s}">${STATUS_LABELS[s]}</button>
            `).join('')}
            <button class="status-btn ${order.status === 'cancelled' ? 'status-btn--current' : ''}" data-set-status="cancelled" style="border-color:#fee2e2;color:#991b1b;">${STATUS_LABELS.cancelled}</button>
          </div>
        </div>

        <div class="order-card">
          <h3>Notas internas</h3>
          <textarea id="adminNotes" rows="3" style="width:100%;padding:9px;border:1.5px solid var(--gray-300);border-radius:8px;font-family:inherit;font-size:13px;">${escapeHtml(order.admin_notes || '')}</textarea>
          <button class="btn btn--primary btn--sm" id="saveNotesBtn" style="margin-top:8px;">Guardar notas</button>
        </div>

        <div class="order-card">
          <h3>Historial</h3>
          <div class="timeline">
            ${(events || []).map(ev => `
              <div class="timeline-item">
                <div class="timeline-item__time">${fmtDate(ev.created_at)} · ${escapeHtml(ev.actor || '')}</div>
                <div class="timeline-item__desc">${escapeHtml(ev.description || ev.event_type)}</div>
              </div>
            `).join('') || '<p style="color:var(--gray-500);font-size:13px;">Sin eventos registrados.</p>'}
          </div>
        </div>

        <button class="btn btn--ghost btn--sm" id="deleteOrderBtn" style="border-color:#fee2e2;color:#991b1b;width:100%;margin-top:8px;">🗑️ Eliminar pedido</button>
      </div>
    </div>
  `;

  // Status changer
  $('#statusChanger').addEventListener('click', async (e) => {
    const newStatus = e.target.dataset.setStatus;
    if (!newStatus || newStatus === order.status) return;
    const { error } = await sb.from('orders').update({ status: newStatus }).eq('id', order.id);
    if (error) return toast('Error: ' + error.message, 'error');
    toast('Estado actualizado', 'success');
    closeOrderModal();
    loadOrders();
  });

  // Save notes
  $('#saveNotesBtn').addEventListener('click', async () => {
    const notes = $('#adminNotes').value;
    const { error } = await sb.from('orders').update({ admin_notes: notes }).eq('id', order.id);
    if (error) return toast('Error: ' + error.message, 'error');
    toast('Notas guardadas', 'success');
  });

  // Delete order
  $('#deleteOrderBtn').addEventListener('click', async () => {
    if (!confirm(`¿Eliminar pedido #${order.id} de ${order.customer_name}? Esta acción no se puede deshacer.`)) return;
    const { error } = await sb.from('orders').delete().eq('id', order.id);
    if (error) return toast('Error: ' + error.message, 'error');
    toast('Pedido eliminado', 'success');
    closeOrderModal();
    loadOrders();
  });

  orderModal.classList.add('is-open');
}

function closeOrderModal() {
  orderModal.classList.remove('is-open');
}

orderModal.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]')) closeOrderModal();
});

// ============================================
//   NUEVO PEDIDO MANUAL
// ============================================
const manualOrderModal = $('#manualOrderModal');

function openManualOrderModal() {
  const form = $('#manualOrderForm');
  form.reset();
  form.quantity.value = 1;
  $('#manualAddressFields').style.display = 'none';
  $('#manualProductFreeText').style.display = 'none';

  // Llenar dropdown de productos del catálogo
  const sel = $('#manualProductSelect');
  sel.innerHTML = '<option value="">Selecciona producto del catálogo o escribe manualmente</option>';
  allProducts
    .filter(p => p.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.dataset.name = p.name;
      opt.dataset.price = p.price;
      opt.dataset.qp = JSON.stringify(p.quality_prices || {});
      opt.dataset.image = p.image_url || '';
      opt.textContent = p.name + ' — ' + fmtCLP(p.price);
      sel.appendChild(opt);
    });
  // Opción "manual"
  const optManual = document.createElement('option');
  optManual.value = '__manual__';
  optManual.textContent = '📝 Otro producto (escribir manualmente)';
  sel.appendChild(optManual);

  manualOrderModal.classList.add('is-open');
}

function closeManualOrderModal() {
  manualOrderModal.classList.remove('is-open');
}

// Botón abrir
$('#newManualOrderBtn').addEventListener('click', openManualOrderModal);

// Cerrar
manualOrderModal.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]')) closeManualOrderModal();
});

// Mostrar/ocultar campo de producto manual
$('#manualProductSelect').addEventListener('change', (e) => {
  const sel = e.target;
  const opt = sel.selectedOptions[0];

  if (sel.value === '__manual__') {
    $('#manualProductFreeText').style.display = 'flex';
    return;
  }
  $('#manualProductFreeText').style.display = 'none';

  // Pre-llenar precio según producto + calidad seleccionada
  if (opt && opt.dataset.price) {
    updateManualPrice();
  }
});

// Cuando cambia calidad, actualizar precio
$('#manualQuality').addEventListener('change', updateManualPrice);

function updateManualPrice() {
  const opt = $('#manualProductSelect').selectedOptions[0];
  if (!opt || !opt.dataset.price) return;
  const quality = $('#manualQuality').value;
  let qp = {};
  try { qp = JSON.parse(opt.dataset.qp || '{}'); } catch (e) { qp = {}; }
  const price = (quality && qp[quality]) ? qp[quality] : Number(opt.dataset.price);
  $('#manualUnitPrice').value = price;
}

// Mostrar/ocultar bloque de dirección
$('#manualDelivery').addEventListener('change', (e) => {
  $('#manualAddressFields').style.display = e.target.value.startsWith('Envío') ? 'block' : 'none';
});

// Submit
$('#manualOrderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);

  // Resolver producto
  const productSel = fd.get('product_id');
  let productId = null;
  let productName = '';
  let productImage = null;

  if (productSel === '__manual__') {
    productName = (fd.get('product_name_manual') || '').trim();
    if (!productName) return toast('Ingresa el nombre del producto manual', 'error');
  } else if (productSel) {
    const opt = $('#manualProductSelect').selectedOptions[0];
    productId = parseInt(productSel, 10);
    productName = opt.dataset.name;
    productImage = opt.dataset.image || null;
  } else {
    return toast('Selecciona un producto', 'error');
  }

  const quantity = parseInt(fd.get('quantity'), 10) || 1;
  const unitPrice = parseInt(fd.get('unit_price'), 10) || 0;
  const total = unitPrice * quantity;

  // Construir dirección completa si aplica
  const delivery = fd.get('delivery_method');
  const region   = fd.get('region') || '';
  const comuna   = fd.get('comuna') || '';
  const street   = fd.get('street') || '';
  const fullAddress = (delivery && delivery.startsWith('Envío'))
    ? [street, comuna, region, 'Chile'].filter(Boolean).join(', ')
    : null;

  const payload = {
    customer_name:    fd.get('customer_name').trim(),
    customer_phone:   fd.get('customer_phone').trim(),
    customer_email:   fd.get('customer_email')?.trim() || null,
    product_id:       productId,
    product_name:     productName,
    product_image_url: productImage,
    size:             fd.get('size'),
    quality:          fd.get('quality'),
    quantity:         quantity,
    unit_price:       unitPrice,
    total:            total,
    delivery_method:  delivery || null,
    region:           region || null,
    comuna:           comuna || null,
    street:           street || null,
    full_address:     fullAddress,
    comments:         fd.get('comments')?.trim() || null,
    payment_method:   'manual',
    status:           fd.get('status') || 'pending'
  };

  const { error } = await sb.from('orders').insert(payload);
  if (error) return toast('Error: ' + error.message, 'error');

  toast('Pedido manual registrado ✓', 'success');
  closeManualOrderModal();
  loadOrders();
});

// ============================================
//   CATEGORÍAS
// ============================================

let allCategories = [];

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function loadCategories() {
  const { data, error } = await sb
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })
    .range(0, 49999);  // Sin límite práctico

  if (error) {
    toast('Error cargando categorías: ' + error.message, 'error');
    return;
  }
  allCategories = data || [];
  renderCategoriesGrid();
  renderCategoryStats();
}

function renderCategoryStats() {
  const total = allCategories.length;
  const assigned = allProducts.filter(p => p.category_id).length;
  const unassigned = allProducts.filter(p => !p.category_id).length;
  $('#cStatTotal').textContent = total;
  $('#cStatAssigned').textContent = assigned;
  $('#cStatUnassigned').textContent = unassigned;
}

function renderCategoriesGrid() {
  const grid = $('#categoriesGrid');
  if (allCategories.length === 0) {
    grid.innerHTML = '<p style="color:var(--gray-500); padding: 30px; text-align: center;">No hay categorías. Crea la primera con "+ Nueva categoría".</p>';
    return;
  }

  grid.innerHTML = allCategories.map((c, idx) => {
    const count = allProducts.filter(p => p.category_id === c.id).length;
    const isFirst = idx === 0;
    const isLast  = idx === allCategories.length - 1;
    return `
      <div class="cat-card-admin" data-cat-id="${c.id}">
        <div class="cat-card-admin__order">
          <button class="ord-btn" data-move-cat="up" data-id="${c.id}" ${isFirst ? 'disabled' : ''} title="Subir">▲</button>
          <span class="ord-pos">${idx + 1}</span>
          <button class="ord-btn" data-move-cat="down" data-id="${c.id}" ${isLast ? 'disabled' : ''} title="Bajar">▼</button>
        </div>
        <div class="cat-card-admin__image ${!c.image_url ? 'cat-card-admin__image--empty' : ''}">
          ${c.image_url ? `<img src="${c.image_url}" alt="${escapeHtml(c.name)}">` : '🗂️'}
        </div>
        <div class="cat-card-admin__body">
          <div class="cat-card-admin__name">${escapeHtml(c.name)}</div>
          <div class="cat-card-admin__count">
            <strong>${count}</strong> producto${count === 1 ? '' : 's'} · /${c.slug}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

$('#categoriesGrid').addEventListener('click', async (e) => {
  // Botones de orden — manejan ellos solos, no abrir modal
  const moveBtn = e.target.closest('[data-move-cat]');
  if (moveBtn) {
    e.stopPropagation();
    const id  = parseInt(moveBtn.dataset.id, 10);
    const dir = moveBtn.dataset.moveCat; // 'up' | 'down'
    await reorderCategory(id, dir);
    return;
  }
  const card = e.target.closest('[data-cat-id]');
  if (card) openCategoryModal(parseInt(card.dataset.catId, 10));
});

let reorderingCategory = false;

async function reorderCategory(id, dir) {
  if (reorderingCategory) {
    console.log('[reorderCategory] Click ignorado: ya hay un reorder en curso');
    return;
  }
  reorderingCategory = true;
  // Disable all reorder buttons mientras procesamos
  $$('[data-move-cat]').forEach(b => b.disabled = true);

  try {
    const idx = allCategories.findIndex(c => c.id === id);
    if (idx < 0) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= allCategories.length) return;

    // Renumeracion completa: swap y luego asignar 10, 20, 30, ... a TODOS
    const newOrder = [...allCategories];
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];

    console.log('[reorderCategory] Renumerando', newOrder.length, 'categorías');

    const updates = newOrder.map((cat, i) =>
      sb.from('categories').update({ display_order: (i + 1) * 10 }).eq('id', cat.id)
    );

    const results = await Promise.all(updates);
    const errResult = results.find(r => r.error);
    if (errResult) {
      console.error('[reorderCategory] Error:', errResult.error);
      toast('Error reordenando: ' + errResult.error.message, 'error');
      // Refresh desde DB para recuperar estado consistente
      await loadCategories();
      return;
    }

    // Sincronizar estado local
    newOrder.forEach((cat, i) => { cat.display_order = (i + 1) * 10; });
    allCategories = newOrder;
    renderCategoriesGrid();
    console.log('[reorderCategory] OK');
  } finally {
    reorderingCategory = false;
    // Re-enable; renderCategoriesGrid ya pone disabled correctos
  }
}

const categoryModal = $('#categoryModal');

function openCategoryModal(categoryId = null) {
  const form = $('#categoryForm');
  form.reset();
  $('#catImgPreview').innerHTML = '<span>Sin imagen</span>';
  $('#catSlugPreview').textContent = '';

  const isEdit = !!categoryId;
  $('#categoryModalTitle').textContent = isEdit ? 'Editar categoría' : 'Nueva categoría';
  $('#deleteCategoryBtn').style.display = isEdit ? 'inline-flex' : 'none';
  $('#catProductsBlock').style.display = isEdit ? 'block' : 'none';

  if (isEdit) {
    const cat = allCategories.find(c => c.id === categoryId);
    if (!cat) return;
    $('#catHiddenId').value = cat.id;
    $('#catName').value = cat.name;
    $('#catImgUrl').value = cat.image_url || '';
    $('#catSlugPreview').textContent = '/categorias/' + cat.slug;
    if (cat.image_url) {
      $('#catImgPreview').innerHTML = `<img src="${cat.image_url}" alt="">`;
    }
    renderCatProductsList(cat.id);
  }

  categoryModal.classList.add('is-open');
}

function closeCategoryModal() {
  categoryModal.classList.remove('is-open');
}

categoryModal.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]')) closeCategoryModal();
});

$('#newCategoryBtn').addEventListener('click', () => openCategoryModal());

// Slug en vivo
$('#catName').addEventListener('input', (e) => {
  const slug = slugify(e.target.value);
  $('#catSlugPreview').textContent = slug ? '/categorias/' + slug : '';
});

// Subida de imagen para categoría
$('#catImgFileBtn').addEventListener('click', () => $('#catImgFile').click());
$('#catImgFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  $('#catImgPreview').innerHTML = `<img src="${URL.createObjectURL(file)}" alt="">`;
  toast('Subiendo imagen...');

  const ext = file.name.split('.').pop().toLowerCase();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;

  const { error } = await sb.storage
    .from('categories')
    .upload(safeName, file, { cacheControl: '3600', upsert: false });

  if (error) return toast('Error subiendo imagen: ' + error.message, 'error');

  const { data: { publicUrl } } = sb.storage.from('categories').getPublicUrl(safeName);
  $('#catImgUrl').value = publicUrl;
  toast('Imagen subida ✓', 'success');
});

$('#catImgUrl').addEventListener('input', (e) => {
  const url = e.target.value.trim();
  if (url) $('#catImgPreview').innerHTML = `<img src="${url}" alt="" onerror="this.style.display='none'">`;
});

// Lista de productos asignables — los asignados van arriba con flechas de orden
function renderCatProductsList(currentCatId) {
  const list = $('#catProductsList');
  const q = ($('#catProductSearch').value || '').toLowerCase();

  // Asignados a ESTA categoría: en el orden de display_order
  const assigned = allProducts
    .filter(p => p.category_id === currentCatId)
    .filter(p => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  // No asignados o de otra categoría: alfabético
  const others = allProducts
    .filter(p => p.category_id !== currentCatId)
    .filter(p => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));

  const html = [];
  if (assigned.length) {
    html.push('<div class="cat-products-section-title">📦 Productos en esta categoría (arrastra ▲▼ para ordenar)</div>');
    html.push(...assigned.map((p, i) => prodRow(p, currentCatId, i, assigned.length)));
  }
  if (others.length) {
    html.push('<div class="cat-products-section-title">➕ Disponibles para agregar</div>');
    html.push(...others.map(p => prodRow(p, currentCatId)));
  }
  if (!html.length) {
    html.push('<p style="padding:14px; color:var(--gray-500); font-size:13px; text-align:center;">No hay productos.</p>');
  }

  list.innerHTML = html.join('');
}

function prodRow(p, currentCatId, idx, total) {
  const isChecked = p.category_id === currentCatId;
  const otherCat = !isChecked && p.category_id
    ? allCategories.find(c => c.id === p.category_id)
    : null;

  const showArrows = isChecked && idx !== undefined;
  const isFirst = showArrows && idx === 0;
  const isLast  = showArrows && idx === total - 1;

  return `
    <div class="cat-product-row ${isChecked ? 'is-checked' : ''}" data-prod-id="${p.id}">
      ${showArrows ? `
        <div class="cat-product-row__order" onclick="event.stopPropagation()">
          <button type="button" class="ord-btn ord-btn--sm" data-move-prod="up"   data-id="${p.id}" ${isFirst ? 'disabled' : ''}>▲</button>
          <button type="button" class="ord-btn ord-btn--sm" data-move-prod="down" data-id="${p.id}" ${isLast  ? 'disabled' : ''}>▼</button>
        </div>` : ''}
      <div class="cat-product-row__check">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      </div>
      ${p.image_url
        ? `<img src="${p.image_url}" class="cat-product-row__img" alt="">`
        : `<div class="cat-product-row__img" style="display:grid;place-items:center;font-size:18px;">👟</div>`}
      <div class="cat-product-row__info">
        <div class="cat-product-row__name">${escapeHtml(p.name)}</div>
        <div class="cat-product-row__hint ${otherCat ? 'cat-product-row__hint--warn' : ''}">
          ${otherCat ? `Actualmente en: ${escapeHtml(otherCat.name)}` : (isChecked ? `#${(idx ?? 0) + 1} en la categoría` : 'Sin categoría')}
        </div>
      </div>
    </div>
  `;
}

$('#catProductSearch').addEventListener('input', () => {
  const id = parseInt($('#catHiddenId').value, 10) || null;
  renderCatProductsList(id);
});

// Click en la lista: orden (botones) o toggle (fila)
$('#catProductsList').addEventListener('click', async (e) => {
  // Botones de orden ▲▼
  const moveBtn = e.target.closest('[data-move-prod]');
  if (moveBtn) {
    e.stopPropagation();
    e.preventDefault();
    const id  = parseInt(moveBtn.dataset.id, 10);
    const dir = moveBtn.dataset.moveProd;
    const currentCatId = parseInt($('#catHiddenId').value, 10);
    await reorderProductInCategory(id, dir, currentCatId);
    return;
  }
  // Click en la fila → toggle
  const row = e.target.closest('[data-prod-id]');
  if (!row) return;
  row.classList.toggle('is-checked');
});

let reorderingProduct = false;

async function reorderProductInCategory(id, dir, catId) {
  if (reorderingProduct) return;
  reorderingProduct = true;
  $$('[data-move-prod]').forEach(b => b.disabled = true);

  try {
    const inCat = allProducts
      .filter(p => p.category_id === catId)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    const idx = inCat.findIndex(p => p.id === id);
    if (idx < 0) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= inCat.length) return;

    // Swap y renumerar TODOS los productos de esta categoría
    const newOrder = [...inCat];
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];

    const updates = newOrder.map((p, i) =>
      sb.from('products').update({ display_order: (i + 1) * 10 }).eq('id', p.id)
    );

    const results = await Promise.all(updates);
    const errResult = results.find(r => r.error);
    if (errResult) {
      console.error('[reorderProduct] Error:', errResult.error);
      toast('Error reordenando: ' + errResult.error.message, 'error');
      await loadProducts();
      renderCatProductsList(catId);
      return;
    }

    // Sincronizar memoria
    newOrder.forEach((p, i) => {
      const local = allProducts.find(x => x.id === p.id);
      if (local) local.display_order = (i + 1) * 10;
    });

    renderCatProductsList(catId);
  } finally {
    reorderingProduct = false;
  }
}

// Submit
$('#categoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const id = fd.get('category_id');
  const name = (fd.get('name') || '').trim();
  if (!name) return toast('Ingresa un nombre', 'error');
  const slug = slugify(name);
  if (!slug) return toast('Nombre inválido (sin caracteres válidos para slug)', 'error');
  const image_url = (fd.get('image_url') || '').trim() || null;

  console.log('[saveCategory]', { id, name, slug, image_url });

  let catId;
  if (id) {
    catId = parseInt(id, 10);
    const { error } = await sb.from('categories')
      .update({ name, slug, image_url })
      .eq('id', catId);
    if (error) {
      console.error('[saveCategory] update failed:', error);
      return toast('Error al actualizar: ' + (error.message || error.code), 'error');
    }
  } else {
    // Calcular display_order para la nueva categoría: al final de la lista
    const maxOrder = allCategories.length
      ? Math.max(...allCategories.map(c => c.display_order || 0))
      : 0;
    const newOrder = maxOrder + 10;

    const { data, error } = await sb.from('categories')
      .insert({ name, slug, image_url, display_order: newOrder })
      .select('id');
    if (error) {
      console.error('[saveCategory] insert failed:', error);
      const msg = error.message || error.code || 'desconocido';
      const hint = error.code === '23505'
        ? ' (ya existe una categoría con ese nombre)'
        : '';
      return toast('Error al crear: ' + msg + hint, 'error');
    }
    if (!data || !data.length) {
      console.error('[saveCategory] insert returned no data', data);
      return toast('Error: no se devolvió la categoría tras crearla. Recarga la página y verifica si quedó creada.', 'error');
    }
    catId = data[0].id;
    console.log('[saveCategory] created with id', catId, 'display_order', newOrder);
  }

  // Actualizar asignación de productos
  if (id) {
    // Productos marcados en la lista
    const checkedIds = Array.from($$('#catProductsList .cat-product-row.is-checked'))
      .map(r => parseInt(r.dataset.prodId, 10));
    // Productos previamente asignados
    const previouslyAssigned = allProducts
      .filter(p => p.category_id === catId)
      .map(p => p.id);

    const toAssign = checkedIds.filter(pid => !previouslyAssigned.includes(pid));
    const toUnassign = previouslyAssigned.filter(pid => !checkedIds.includes(pid));

    if (toAssign.length) {
      const { error } = await sb.from('products')
        .update({ category_id: catId })
        .in('id', toAssign);
      if (error) console.error('Error assigning:', error);
    }
    if (toUnassign.length) {
      const { error } = await sb.from('products')
        .update({ category_id: null })
        .in('id', toUnassign);
      if (error) console.error('Error unassigning:', error);
    }
  }

  toast(id ? 'Categoría actualizada ✓' : 'Categoría creada ✓', 'success');
  closeCategoryModal();
  await loadProducts();
  await loadCategories();
});

// Eliminar
$('#deleteCategoryBtn').addEventListener('click', async () => {
  const id = parseInt($('#catHiddenId').value, 10);
  if (!id) return;
  const cat = allCategories.find(c => c.id === id);
  if (!confirm(`¿Eliminar la categoría "${cat?.name}"? Las zapatillas no se eliminan, solo quedan sin categoría asignada.`)) return;

  const { error } = await sb.from('categories').delete().eq('id', id);
  if (error) return toast('Error: ' + error.message, 'error');
  toast('Categoría eliminada', 'success');
  closeCategoryModal();
  await loadProducts();
  await loadCategories();
});

// ============================================
//   TABS NAVIGATION
// ============================================
$$('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    $$('.tab').forEach(b => b.classList.toggle('tab--active', b === btn));
    $$('.tab-panel').forEach(p => p.classList.toggle('tab-panel--active', p.dataset.panel === target));

    if (target === 'orders')     loadOrders();
    if (target === 'products')   loadProducts();
    if (target === 'categories') loadCategories();
    if (target === 'featured')   loadFeaturedRotation();
  });
});

// ============================================
//   FEATURED / DESTACADOS + ROTACIÓN AUTOMÁTICA
// ============================================
const MAX_FEATURED = 5;
const ROTATION_HOURS = 3;

// Estado local del setting (siempre sincronizado con app_settings.featured_rotation)
let featuredRotation = {
  enabled: false,
  last_rotation_at: null,
  interval_hours: ROTATION_HOURS,
  max_featured: MAX_FEATURED,
  manual_snapshot: []
};

async function loadFeaturedRotation() {
  const { data, error } = await sb
    .from('app_settings')
    .select('value')
    .eq('key', 'featured_rotation')
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.warn('[featured] no se pudo leer app_settings:', error);
  }
  if (data?.value) {
    featuredRotation = { ...featuredRotation, ...data.value };
  }

  // Si la rotación está encendida y ya pasaron 3+ h desde la última, rotar.
  if (featuredRotation.enabled && shouldRotateNow()) {
    console.log('[featured] rotación pendiente (>3h) — ejecutando ahora');
    await performRotation({ silent: true });
  }

  renderFeaturedTab();
}

function shouldRotateNow() {
  if (!featuredRotation.last_rotation_at) return true;
  const last = new Date(featuredRotation.last_rotation_at).getTime();
  const ms = featuredRotation.interval_hours * 60 * 60 * 1000;
  return (Date.now() - last) >= ms;
}

function fmtRelativeDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function nextRotationLabel() {
  if (!featuredRotation.enabled) return 'Rotación apagada';
  const last = featuredRotation.last_rotation_at ? new Date(featuredRotation.last_rotation_at).getTime() : Date.now();
  const next = new Date(last + featuredRotation.interval_hours * 60 * 60 * 1000);
  return fmtRelativeDate(next.toISOString());
}

async function saveFeaturedRotation() {
  featuredRotation = { ...featuredRotation };
  const { error } = await sb
    .from('app_settings')
    .upsert({
      key: 'featured_rotation',
      value: featuredRotation,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  if (error) {
    console.error('[featured] error guardando setting:', error);
    toast('Error guardando configuración: ' + error.message, 'error');
    return false;
  }
  return true;
}

function renderFeaturedTab() {
  const list = $('#featuredList');
  const counter = $('#featuredCount');
  const toggle = $('#rotationToggle');
  const rotateBtn = $('#rotateNowBtn');
  const rotationCard = document.querySelector('.rotation-card');
  const rotationLast = $('#rotationLast');
  const rotationNext = $('#rotationNext');
  const hint = $('#manualSelectionHint');
  if (!list) return; // tab aún no montada (bug de carga)

  const featuredIds = allProducts.filter(p => p.featured).map(p => p.id);
  counter.textContent = featuredIds.length;
  counter.parentElement.classList.toggle('is-full', featuredIds.length >= MAX_FEATURED);

  // Rotation UI
  if (toggle) toggle.checked = !!featuredRotation.enabled;
  if (rotationCard) rotationCard.classList.toggle('is-on', !!featuredRotation.enabled);
  if (rotateBtn) rotateBtn.disabled = !featuredRotation.enabled;
  if (rotationLast) rotationLast.textContent = fmtRelativeDate(featuredRotation.last_rotation_at);
  if (rotationNext) rotationNext.textContent = nextRotationLabel();

  // Auto ON = manual bloqueado
  list.classList.toggle('is-locked', !!featuredRotation.enabled);
  if (hint) {
    hint.textContent = featuredRotation.enabled
      ? '⚠️ Rotación automática activa — la selección manual está deshabilitada. Apágala para volver a elegir manualmente.'
      : `Marca hasta ${MAX_FEATURED} productos. Estos aparecerán en la home cuando la rotación automática esté apagada.`;
  }

  if (allProducts.length === 0) {
    list.innerHTML = '<p style="color:var(--gray-500); padding: 24px; text-align: center;">No hay productos cargados aún.</p>';
    return;
  }

  const activeOnly = allProducts.filter(p => p.active !== false);
  list.innerHTML = activeOnly.map(p => {
    const on = p.featured ? 'is-featured' : '';
    const priceInfo = p.quality_prices?.G5 || p.quality_prices?.PK || p.price;
    return `
      <div class="feat-item ${on}" data-feat-id="${p.id}">
        ${p.image_url
          ? `<img src="${p.image_url}" class="feat-item__img" alt="">`
          : `<div class="feat-item__img feat-item__img--empty">👟</div>`}
        <div class="feat-item__info">
          <div class="feat-item__name">${escapeHtml(p.name)}</div>
          <div class="feat-item__meta">${priceInfo ? fmtCLP(priceInfo) : 'Sin precio'}</div>
        </div>
        <div class="feat-item__star">★</div>
      </div>
    `;
  }).join('');
}

// Click en una tarjeta = toggle manual (con guard)
document.addEventListener('click', async (e) => {
  const card = e.target.closest('#featuredList .feat-item');
  if (!card) return;
  if (featuredRotation.enabled) {
    return toast('Apaga la rotación automática para hacer selección manual.', 'error');
  }
  const id = parseInt(card.dataset.featId, 10);
  const p = allProducts.find(x => x.id === id);
  if (!p) return;

  const currentCount = allProducts.filter(x => x.featured).length;
  const nextValue = !p.featured;
  if (nextValue && currentCount >= MAX_FEATURED) {
    return toast('Ya tienes 5 productos destacados, desmarca uno para agregar otro.', 'error');
  }
  const { error } = await sb.from('products').update({ featured: nextValue }).eq('id', id);
  if (error) return toast('Error: ' + error.message, 'error');
  p.featured = nextValue;
  renderFeaturedTab();
  renderTable();
  renderStats();
});

// Toggle rotación automática
document.addEventListener('change', async (e) => {
  const toggle = e.target.closest('#rotationToggle');
  if (!toggle) return;

  const nowOn = toggle.checked;
  if (nowOn) {
    // Guardar snapshot manual antes de arrancar la auto-rotación
    const manualIds = allProducts.filter(p => p.featured).map(p => p.id);
    featuredRotation.manual_snapshot = manualIds;
    featuredRotation.enabled = true;
    const ok = await saveFeaturedRotation();
    if (!ok) { toggle.checked = false; featuredRotation.enabled = false; return; }
    toast('Rotación automática activada — rotando ahora...', 'success');
    await performRotation({ silent: false });
  } else {
    // Restaurar snapshot manual
    featuredRotation.enabled = false;
    const ok = await saveFeaturedRotation();
    if (!ok) { toggle.checked = true; featuredRotation.enabled = true; return; }
    await restoreManualSnapshot();
    toast('Rotación apagada — restaurada tu selección manual', 'success');
  }
});

// Botón "Rotar ahora"
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('#rotateNowBtn');
  if (!btn) return;
  if (!featuredRotation.enabled) return;
  btn.disabled = true;
  await performRotation({ silent: false });
  btn.disabled = false;
});

async function performRotation({ silent } = {}) {
  const pool = allProducts.filter(p => p.active !== false);
  if (pool.length === 0) {
    if (!silent) toast('No hay productos activos para rotar.', 'error');
    return;
  }

  // Selección aleatoria de hasta MAX_FEATURED
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, Math.min(MAX_FEATURED, pool.length)).map(p => p.id);

  // Desmarcar todos primero, luego marcar los ganadores
  const currentFeatured = allProducts.filter(p => p.featured).map(p => p.id);
  const toUnfeature = currentFeatured.filter(id => !winners.includes(id));
  const toFeature = winners.filter(id => !currentFeatured.includes(id));

  if (toUnfeature.length) {
    const { error } = await sb.from('products').update({ featured: false }).in('id', toUnfeature);
    if (error) {
      if (!silent) toast('Error rotando (paso 1): ' + error.message, 'error');
      return;
    }
  }
  if (toFeature.length) {
    const { error } = await sb.from('products').update({ featured: true }).in('id', toFeature);
    if (error) {
      if (!silent) toast('Error rotando (paso 2): ' + error.message, 'error');
      return;
    }
  }

  // Sincronizar estado local
  allProducts.forEach(p => { p.featured = winners.includes(p.id); });
  featuredRotation.last_rotation_at = new Date().toISOString();
  await saveFeaturedRotation();

  if (!silent) toast(`Rotación completada — ${winners.length} nuevos destacados`, 'success');
  renderFeaturedTab();
  renderTable();
  renderStats();
}

async function restoreManualSnapshot() {
  const snap = Array.isArray(featuredRotation.manual_snapshot) ? featuredRotation.manual_snapshot : [];
  const validSnap = snap.filter(id => allProducts.some(p => p.id === id)).slice(0, MAX_FEATURED);
  const currentFeatured = allProducts.filter(p => p.featured).map(p => p.id);
  const toUnfeature = currentFeatured.filter(id => !validSnap.includes(id));
  const toFeature = validSnap.filter(id => !currentFeatured.includes(id));

  if (toUnfeature.length) {
    await sb.from('products').update({ featured: false }).in('id', toUnfeature);
  }
  if (toFeature.length) {
    await sb.from('products').update({ featured: true }).in('id', toFeature);
  }

  allProducts.forEach(p => { p.featured = validSnap.includes(p.id); });
  renderFeaturedTab();
  renderTable();
  renderStats();
}

// ============ INIT ============
checkAuth();
