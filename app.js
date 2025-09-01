// Utilities
const formatVND = (n) => (n || 0).toLocaleString('vi-VN') + '₫';
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

// Data layer
async function loadProducts() {
  const local = localStorage.getItem('products');
  if (local) {
    try { return JSON.parse(local); } catch {}
  }
  const res = await fetch('products.json');
  const data = await res.json();
  return data;
}

function saveProducts(products) {
  localStorage.setItem('products', JSON.stringify(products));
}

function getCart() {
  try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
}
function setCart(items) { localStorage.setItem('cart', JSON.stringify(items)); updateCartCount(); }

function updateCartCount() {
  const count = getCart().reduce((s,i)=> s + i.qty, 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = count;
}

// UI render
function productCard(p) {
  const el = document.createElement('div');
  el.className = 'card product';
  el.innerHTML = `
    <div class="thumb">${p.emoji || '🎮'}</div>
    <h4>${p.title}</h4>
    <p>${p.description || ''}</p>
    <div class="tags">${(p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join(' ')}</div>
    <div class="row" style="justify-content: space-between; align-items: center;">
      <span class="price">${formatVND(p.price)}</span>
      <button class="btn primary" data-id="${p.id}">Thêm</button>
    </div>
  `;
  return el;
}

function renderProducts(list) {
  const wrap = document.getElementById('products');
  wrap.innerHTML = '';
  list.forEach(p => wrap.appendChild(productCard(p)));
}

function populateFilters(products) {
  const games = [...new Set(products.map(p => p.game))].filter(Boolean).sort();
  const sel = document.getElementById('gameFilter');
  games.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g; opt.textContent = g;
    sel.appendChild(opt);
  });
}

function applyFilters(products) {
  const q = ($('#searchInput')?.value || '').toLowerCase().trim();
  const game = $('#gameFilter')?.value || '';
  const pf = $('#priceFilter')?.value || '';
  let list = products.slice(0);

  if (q) list = list.filter(p => (p.title + ' ' + (p.description||'') + ' ' + (p.tags||[]).join(' ')).toLowerCase().includes(q));
  if (game) list = list.filter(p => p.game === game);
  if (pf) {
    const [min, max] = pf.split('-').map(Number);
    list = list.filter(p => p.price >= min && p.price <= max);
  }
  renderProducts(list);
}

function addToCart(id, products) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const cart = getCart();
  const existed = cart.find(i => i.id === id);
  if (existed) existed.qty += 1;
  else cart.push({ id, title: p.title, price: p.price, qty: 1 });
  setCart(cart);
}

function openCart(products) {
  $('#cartModal').classList.remove('hidden');
  $('#cartModal').setAttribute('aria-hidden', 'false');
  renderCart(products);
}

function closeCart() {
  $('#cartModal').classList.add('hidden');
  $('#cartModal').setAttribute('aria-hidden', 'true');
}

function renderCart(products) {
  const wrap = $('#cartItems');
  const cart = getCart();
  if (cart.length === 0) {
    wrap.innerHTML = '<p>Giỏ hàng trống.</p>';
    $('#cartTotal').textContent = formatVND(0);
    return;
  }
  wrap.innerHTML = '';
  cart.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.justifyContent = 'space-between';
    row.innerHTML = `
      <div>
        <div><strong>${item.title}</strong></div>
        <div class="badge">x${item.qty}</div>
      </div>
      <div>
        <span>${formatVND(item.price*item.qty)}</span>
        <button class="icon-btn" data-action="minus" data-index="${idx}">−</button>
        <button class="icon-btn" data-action="plus" data-index="${idx}">+</button>
        <button class="icon-btn" data-action="remove" data-index="${idx}">✕</button>
      </div>
    `;
    wrap.appendChild(row);
  });
  const total = cart.reduce((s,i)=> s + i.price*i.qty, 0);
  $('#cartTotal').textContent = formatVND(total);
}

function handleCartAction(e, products) {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.dataset.action;
  const idx = Number(btn.dataset.index);
  if (Number.isNaN(idx)) return;
  const cart = getCart();
  if (action === 'minus') cart[idx].qty = Math.max(1, cart[idx].qty - 1);
  if (action === 'plus') cart[idx].qty += 1;
  if (action === 'remove') cart.splice(idx,1);
  setCart(cart);
  renderCart(products);
}

// Checkout -> create order (local only)
function handleCheckout(e, products) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const order = {
    id: 'ORD-' + Date.now(),
    createdAt: new Date().toISOString(),
    items: getCart(),
    customer: {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone') || ''
    },
    note: formData.get('note') || '',
    payment: {
      method: formData.get('pay'),
      tx: formData.get('tx') || ''
    },
    total: getCart().reduce((s,i)=> s + i.price*i.qty, 0),
    status: 'pending'
  };
  const orders = JSON.parse(localStorage.getItem('orders') || '[]');
  orders.unshift(order);
  localStorage.setItem('orders', JSON.stringify(orders));
  setCart([]);
  renderCart(products);
  alert('Đặt hàng thành công! Mã đơn: ' + order.id + '\nAdmin sẽ liên hệ giao acc sau khi xác nhận thanh toán.');
  closeCart();
}

// Boot
(async function() {
  const products = await loadProducts();
  // setup filters
  populateFilters(products);
  applyFilters(products);

  // events
  $('#searchInput')?.addEventListener('input', () => applyFilters(products));
  $('#clearSearch')?.addEventListener('click', () => { $('#searchInput').value=''; applyFilters(products); });
  $('#gameFilter')?.addEventListener('change', () => applyFilters(products));
  $('#priceFilter')?.addEventListener('change', () => applyFilters(products));
  $('#resetFilters')?.addEventListener('click', () => {
    $('#gameFilter').value=''; $('#priceFilter').value=''; $('#searchInput').value=''; applyFilters(products);
  });

  $('#products').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    addToCart(btn.dataset.id, products);
  });

  $('#cartButton')?.addEventListener('click', () => openCart(products));
  $('#closeCart')?.addEventListener('click', closeCart);
  $('#cartItems')?.addEventListener('click', (e)=> handleCartAction(e, products));
  $('#checkoutForm')?.addEventListener('submit', (e)=> handleCheckout(e, products));

  updateCartCount();
  const year = new Date().getFullYear();
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = year;
})();


// ==== ĐĂNG NHẬP CƠ BẢN ====
const USERS = [
  { username: "admin", password: "Baoig66@:3" }
];

function isLoggedIn() {
  return localStorage.getItem("loggedInUser") !== null;
}

function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "login.html";
}

// Xử lý form login
if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", function(e) {
    e.preventDefault();
    let user = document.getElementById("username").value.trim();
    let pass = document.getElementById("password").value.trim();

    let found = USERS.find(u => u.username === user && u.password === pass);

    if (found) {
      localStorage.setItem("loggedInUser", user);
      window.location.href = "index.html"; // chuyển về trang shop
    } else {
      document.getElementById("loginError").innerText = "Sai tài khoản hoặc mật khẩu!";
    }
  });
}

// Nếu đang ở shop mà chưa login → chuyển về login.html
if (!window.location.href.includes("login.html") && !isLoggedIn()) {
  window.location.href = "login.html";
}

// ==== TELEGRAM THÔNG BÁO ====
function sendTelegram(order) {
  const token = "8286513067:AAFnqX5GmZCt1StrcUOeQwiMpZyS5XnvBqA";
  const chatId = "1666813070";

  const msg = `🛒 Đơn hàng mới
👤 Tên: ${order.name}
📧 Email: ${order.email}
📞 Liên hệ: ${order.phone}
💳 Thanh toán: ${order.payment} - Mã GD: ${order.code}
📦 Sản phẩm: ${order.items.map(i=>i.name + " x" + i.qty).join(", ")}
💵 Tổng: ${order.total.toLocaleString()} VNĐ`;

  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: msg })
  })
  .then(res => res.json())
  .then(data => console.log("✅ Đã gửi về Telegram:", data))
  .catch(err => console.error("❌ Lỗi gửi Telegram:", err));
}


// === GỬI TELEGRAM KHI ĐẶT HÀNG ===
function handleOrder(order) {
  console.log("📦 Đơn hàng mới:", order);
  sendTelegram(order);
  alert("✅ Đặt hàng thành công! Đơn của bạn đã được gửi.");
}
