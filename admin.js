// Simple admin panel (demo) using localStorage only
const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));

const defaultPIN = '123456';

function getPIN() {
  return localStorage.getItem('admin_pin') || defaultPIN;
}
function setPIN(pin) {
  localStorage.setItem('admin_pin', pin);
}

function requireAuth() {
  const token = sessionStorage.getItem('admin_auth');
  if (token === 'ok') {
    $('#adminPanel').classList.remove('hidden');
  } else {
    $('#adminPanel').classList.add('hidden');
  }
}

function login(pin) {
  if (pin === getPIN()) {
    sessionStorage.setItem('admin_auth', 'ok');
    alert('Đăng nhập thành công!');
    requireAuth();
    loadAdminData();
  } else {
    alert('Sai PIN');
  }
}

function logout() {
  sessionStorage.removeItem('admin_auth');
  requireAuth();
}

function loadAdminData() {
  renderProducts();
  renderOrders();
}

function getProducts() {
  try { return JSON.parse(localStorage.getItem('products') || 'null'); } catch {}
  return null;
}
async function fetchDefaultProducts() {
  const res = await fetch('products.json');
  return res.json();
}

async function renderProducts() {
  let products = getProducts();
  if (!products) {
    products = await fetchDefaultProducts();
  }
  const wrap = $('#adminProducts');
  wrap.innerHTML = '';
  products.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'card product';
    card.innerHTML = `
      <div class="thumb">${p.emoji || '🎮'}</div>
      <h4 contenteditable="true" data-field="title">${p.title}</h4>
      <p contenteditable="true" data-field="description">${p.description||''}</p>
      <div class="row">
        <span class="badge">${p.game}</span>
        <span class="badge">${(p.tags||[]).join(', ')}</span>
      </div>
      <div class="row">
        <label>Giá <input class="input" type="number" data-field="price" value="${p.price}"></label>
        <label>Game <input class="input" data-field="game" value="${p.game||''}"></label>
        <label>Emoji <input class="input" data-field="emoji" value="${p.emoji||''}"></label>
      </div>
      <div class="row">
        <label>Tags (phân tách bởi dấu phẩy) <input class="input" data-field="tags" value="${(p.tags||[]).join(', ')}"></label>
      </div>
      <div class="row">
        <button class="btn" data-action="save" data-index="${idx}">Lưu</button>
        <button class="btn ghost" data-action="delete" data-index="${idx}">Xoá</button>
      </div>
    `;
    wrap.appendChild(card);
  });

  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const idx = Number(btn.dataset.index);
    const action = btn.dataset.action;
    handleProductAction(action, idx);
  }, { once: true });
}

function handleProductAction(action, idx) {
  const wrap = $('#adminProducts');
  const cards = $$('.product', wrap);
  let products = getProducts() || [];
  // If products empty, try to seed from DOM (rendered list)
  if (products.length === 0) {
    products = $$('.product', wrap).map(card => readCard(card));
  }
  if (action === 'save') {
    const card = cards[idx];
    products[idx] = readCard(card);
    localStorage.setItem('products', JSON.stringify(products));
    alert('Đã lưu sản phẩm.');
    renderProducts();
  }
  if (action === 'delete') {
    products.splice(idx,1);
    localStorage.setItem('products', JSON.stringify(products));
    renderProducts();
  }
}

function readCard(card) {
  const get = (sel) => card.querySelector(sel);
  const title = get('[data-field="title"]').textContent.trim();
  const description = get('[data-field="description"]').textContent.trim();
  const price = Number(get('[data-field="price"]').value || 0);
  const game = get('[data-field="game"]').value.trim();
  const emoji = get('[data-field="emoji"]').value.trim();
  const tags = get('[data-field="tags"]').value.split(',').map(s=>s.trim()).filter(Boolean);
  return {
    id: title.toLowerCase().replace(/\s+/g,'-') + '-' + Math.random().toString(36).slice(2,7),
    title, description, price, game, emoji, tags
  };
}

function addProduct() {
  const products = getProducts() || [];
  products.unshift({
    id: 'new-' + Math.random().toString(36).slice(2,7),
    title: 'Sản phẩm mới',
    description: 'Mô tả...',
    price: 100000,
    game: 'Liên Quân',
    emoji: '🛡️',
    tags: ['rank đồng']
  });
  localStorage.setItem('products', JSON.stringify(products));
  renderProducts();
}

function exportJSON(key, filename) {
  const data = localStorage.getItem(key) || '[]';
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function renderOrders() {
  const wrap = $('#adminOrders');
  const orders = JSON.parse(localStorage.getItem('orders') || '[]');
  if (orders.length === 0) { wrap.innerHTML = '<p>Chưa có đơn hàng.</p>'; return; }
  wrap.innerHTML = '';
  orders.forEach((o, idx) => {
    const el = document.createElement('div');
    el.className = 'order';
    el.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <strong>${o.id}</strong>
        <span class="badge">${o.status}</span>
      </div>
      <div>Thời gian: ${new Date(o.createdAt).toLocaleString()}</div>
      <div>Khách: ${o.customer.name} — ${o.customer.email} — ${o.customer.phone||''}</div>
      <div>Thanh toán: ${o.payment.method} — Mã: ${o.payment.tx || 'N/A'}</div>
      <div>Tổng: <strong>${(o.total||0).toLocaleString('vi-VN')}₫</strong></div>
      <div>Ghi chú: ${o.note||''}</div>
      <div class="row">
        <button class="btn" data-action="status" data-index="${idx}" data-status="paid">Đánh dấu đã thanh toán</button>
        <button class="btn" data-action="status" data-index="${idx}" data-status="delivered">Đánh dấu đã giao</button>
        <button class="btn ghost" data-action="delete" data-index="${idx}">Xoá</button>
      </div>
    `;
    wrap.appendChild(el);
  });

  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const idx = Number(btn.dataset.index);
    const action = btn.dataset.action;
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    if (action === 'status') {
      orders[idx].status = btn.dataset.status;
      localStorage.setItem('orders', JSON.stringify(orders));
      renderOrders();
    }
    if (action === 'delete') {
      orders.splice(idx,1);
      localStorage.setItem('orders', JSON.stringify(orders));
      renderOrders();
    }
  }, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  $('#loginBtn').addEventListener('click', () => login($('#pinInput').value.trim()));
  $('#logoutBtn').addEventListener('click', logout);
  $('#addProductBtn').addEventListener('click', addProduct);
  $('#exportProductsBtn').addEventListener('click', () => exportJSON('products', 'products.json'));
  $('#exportOrdersBtn').addEventListener('click', () => exportJSON('orders', 'orders.json'));
  $('#importProductsInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      localStorage.setItem('products', JSON.stringify(data));
      alert('Đã nhập sản phẩm.');
      renderProducts();
    } catch {
      alert('File không hợp lệ');
    }
  });
  $('.tabs')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.tab'); if (!btn) return;
    $$('.tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    $$('.tab-panel').forEach(p=>p.classList.add('hidden'));
    $('#'+btn.dataset.tab).classList.remove('hidden');
  });
  $('#saveSettings').addEventListener('click', ()=> {
    const pin = $('#pinSetting').value.trim();
    if (pin && /^\d{4,8}$/.test(pin)) { setPIN(pin); alert('Đã lưu PIN.'); }
    else alert('PIN 4-8 chữ số');
  });
});
