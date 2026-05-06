/* ============================================
   Distrito Sneakers — Admin Panel Logic
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
  loadProducts();
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
    .order('id', { ascending: true })
    .range(0, 9999);

  if (error) {
    toast('Error cargando productos: ' + error.message, 'error');
    return;
  }
  allProducts = data || [];
  renderTable();
  renderStats();
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

function openProductModal(product = null) {
  const form = $('#productForm');
  form.reset();
  $('#imgPreview').innerHTML = '<span>Sin imagen</span>';

  if (product) {
    $('#modalTitle').textContent = 'Editar producto';
    form.id.value          = product.id;
    form.name.value        = product.name || '';
    form.category.value    = product.category || 'zapatillas';
    form.price.value       = product.price || '';
    form.tag.value         = product.tag || '';
    form.image_url.value   = product.image_url || '';
    form.sizes.value       = (product.sizes || []).join(', ');
    form.colors.value      = (product.colors || []).join(', ');
    form.description.value = product.description || '';
    form.featured.checked  = !!product.featured;
    form.active.checked    = product.active !== false;
    // Cargar precios por calidad si existen
    const qp = product.quality_prices || {};
    form.price_PK.value = qp.PK || '';
    form.price_G5.value = qp.G5 || '';
    form.price_OG.value = qp.OG || '';
    if (product.image_url) {
      $('#imgPreview').innerHTML = `<img src="${product.image_url}" alt="">`;
    }
  } else {
    $('#modalTitle').textContent = 'Nuevo producto';
    form.active.checked = true;
    form.sizes.value = '38, 39, 40, 41, 42, 43, 44, 45';
    form.price_PK.value = '';
    form.price_G5.value = '';
    form.price_OG.value = '';
  }

  modal.classList.add('is-open');
}

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
  const id = fd.get('id');

  // Construir quality_prices solo con las calidades que tienen valor
  const qp = {};
  ['PK', 'G5', 'OG'].forEach(k => {
    const v = parseInt(fd.get('price_' + k), 10);
    if (v > 0) qp[k] = v;
  });

  const payload = {
    name:           fd.get('name').trim(),
    category:       fd.get('category'),
    price:          parseInt(fd.get('price'), 10),
    quality_prices: Object.keys(qp).length ? qp : null,
    tag:            fd.get('tag').trim() || null,
    image_url:      fd.get('image_url').trim() || null,
    description:    fd.get('description').trim() || null,
    sizes:          splitCsv(fd.get('sizes')),
    colors:         splitCsv(fd.get('colors')),
    featured:       fd.get('featured') === 'on',
    active:         fd.get('active') === 'on'
  };

  let result;
  if (id) {
    result = await sb.from('products').update(payload).eq('id', id);
  } else {
    result = await sb.from('products').insert(payload);
  }

  if (result.error) return toast('Error: ' + result.error.message, 'error');
  toast(id ? 'Producto actualizado ✓' : 'Producto creado ✓', 'success');
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
    .range(0, 9999);

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
//   TABS NAVIGATION
// ============================================
$$('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    $$('.tab').forEach(b => b.classList.toggle('tab--active', b === btn));
    $$('.tab-panel').forEach(p => p.classList.toggle('tab-panel--active', p.dataset.panel === target));

    if (target === 'orders') loadOrders();
    if (target === 'products') loadProducts();
  });
});

// ============ INIT ============
checkAuth();
