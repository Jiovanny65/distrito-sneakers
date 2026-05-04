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
    .order('id', { ascending: true });

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
    if (product.image_url) {
      $('#imgPreview').innerHTML = `<img src="${product.image_url}" alt="">`;
    }
  } else {
    $('#modalTitle').textContent = 'Nuevo producto';
    form.active.checked = true;
    form.sizes.value = '38, 39, 40, 41, 42, 43, 44, 45';
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

  const payload = {
    name:        fd.get('name').trim(),
    category:    fd.get('category'),
    price:       parseInt(fd.get('price'), 10),
    tag:         fd.get('tag').trim() || null,
    image_url:   fd.get('image_url').trim() || null,
    description: fd.get('description').trim() || null,
    sizes:       splitCsv(fd.get('sizes')),
    colors:      splitCsv(fd.get('colors')),
    featured:    fd.get('featured') === 'on',
    active:      fd.get('active') === 'on'
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

// ============ INIT ============
checkAuth();
