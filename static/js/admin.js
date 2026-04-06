// ===========================
// ADMIN DASHBOARD — admin.js
// ===========================
(function () {
  'use strict';

  // ── Auth headers ──────────────────────────────────────────────
  function authHeaders() {
    var role = localStorage.getItem('user_role') || '';
    var user = localStorage.getItem('user_name')  || '';
    return {
      'Content-Type': 'application/json',
      'X-User-Role':  role,
      'X-Username':   user
    };
  }

  function getRole() { return localStorage.getItem('user_role') || ''; }
  function getUser() { return localStorage.getItem('user_name')  || ''; }

  // ── Guard ─────────────────────────────────────────────────────
  if (getRole() !== 'admin') {
    fetch('/api/me')
      .then(function (r) {
        if (!r.ok) throw new Error('unauthorized');
        return r.json();
      })
      .then(function (me) {
        if (me.role === 'admin') {
          localStorage.setItem('user_role', me.role);
          localStorage.setItem('user_name', me.username);
          window.location.reload();
          return;
        }
        window.location.href = '/login';
      })
      .catch(function () {
        window.location.href = '/login';
      });
    return;
  }

  // ── Set username badge ─────────────────────────────────────────
  var badge = document.getElementById('adminUserBadge');
  if (badge) badge.textContent = getUser() || 'Admin';

  // ── Toast ──────────────────────────────────────────────────────
  var toastEl   = document.getElementById('admToast');
  var toastTimer = null;
  function showToast(msg, type) {
    if (!toastEl) return;
    toastEl.textContent  = msg;
    toastEl.className    = 'adm-toast adm-toast-' + (type || 'success') + ' visible';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = 'adm-toast'; }, 3200);
  }

  // ── Modal helpers ──────────────────────────────────────────────
  function openModal(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  }
  function closeModal(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  document.querySelectorAll('[data-close]').forEach(function (btn) {
    btn.addEventListener('click', function () { closeModal(btn.dataset.close); });
  });
  document.querySelectorAll('.adm-modal-backdrop').forEach(function (bd) {
    bd.addEventListener('click', function (e) {
      if (e.target === bd) closeModal(bd.id);
    });
  });

  // ── Sidebar toggle ─────────────────────────────────────────────
  var sidebar = document.getElementById('admSidebar');
  var toggleBtn = document.getElementById('sidebarToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      sidebar.classList.toggle('collapsed');
    });
  }

  // ── Tab switching ──────────────────────────────────────────────
  var tabTitles = {
    dashboard: 'Dashboard',
    products:  'Products',
    orders:    'Orders',
    users:     'Users',
    inventory: 'Inventory',
    messages:  'Contact Messages'
  };

  function switchTab(tabId) {
    document.querySelectorAll('.adm-nav-item').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });
    document.querySelectorAll('.adm-tab').forEach(function (t) {
      t.classList.toggle('active', t.id === 'tab-' + tabId);
    });
    var titleEl = document.getElementById('tabTitle');
    if (titleEl) titleEl.textContent = tabTitles[tabId] || tabId;

    switch (tabId) {
      case 'dashboard':  loadDashboard();  break;
      case 'products':   loadProducts();   break;
      case 'orders':     loadOrders();     break;
      case 'users':      loadUsers();      break;
      case 'inventory':  loadInventory();  break;
      case 'messages':   loadMessages();   break;
    }
  }

  document.querySelectorAll('.adm-nav-item').forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
  });

  // ── Pagination helper ──────────────────────────────────────────
  function renderPagination(containerId, currentPage, totalCount, perPage, onPageChange) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var totalPages = Math.ceil(totalCount / perPage);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    var html = '';
    html += '<button class="adm-page-btn" ' + (currentPage === 1 ? 'disabled' : '') +
            ' data-page="' + (currentPage - 1) + '">‹ Prev</button>';
    for (var i = 1; i <= totalPages; i++) {
      html += '<button class="adm-page-btn' + (i === currentPage ? ' active' : '') +
              '" data-page="' + i + '">' + i + '</button>';
    }
    html += '<button class="adm-page-btn" ' + (currentPage === totalPages ? 'disabled' : '') +
            ' data-page="' + (currentPage + 1) + '">Next ›</button>';
    container.innerHTML = html;

    container.querySelectorAll('.adm-page-btn:not([disabled])').forEach(function (btn) {
      btn.addEventListener('click', function () { onPageChange(parseInt(btn.dataset.page)); });
    });
  }

  // ── Format helpers ─────────────────────────────────────────────
  function fmtCurrency(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
  function fmtDate(s)      { return s ? s.split(' ')[0] : '—'; }
  function esc(s)          { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function safeUrl(url) {
    try {
      var parsed = new URL(String(url || ''), window.location.origin);
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.href : '';
    } catch (e) {
      return '';
    }
  }

  var STATUS_COLORS = {
    Pending:   'adm-badge-orange',
    Paid:      'adm-badge-blue',
    Shipped:   'adm-badge-purple',
    Delivered: 'adm-badge-green',
    Cancelled: 'adm-badge-red'
  };

  function statusBadge(s) {
    var cls = STATUS_COLORS[s] || 'adm-badge-grey';
    return '<span class="adm-badge ' + cls + '">' + esc(s) + '</span>';
  }


  // =============================================
  // TAB: DASHBOARD
  // =============================================
  var chartSalesInst  = null;
  var chartStatusInst = null;
  var chartTopInst    = null;

  function loadDashboard() {
    loadStats();
    loadChartSales();
    loadChartStatus();
    loadChartTop();
    loadActivity();
  }

  function loadStats() {
    fetch('/api/stats', { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        setText('ds-products', d.products);
        setText('ds-orders30', d.orders_30d);
        setText('ds-revenue30', fmtCurrency(d.revenue_30d));
        setText('ds-pending',   d.pending_orders);
        setText('ds-lowstock',  d.low_stock);
      })
      .catch(function () { showToast('Failed to load stats', 'error'); });
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function loadChartSales() {
    fetch('/api/admin/chart/sales', { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var labels   = data.map(function (d) { return d.date.slice(5); });
        var revenues = data.map(function (d) { return d.revenue; });
        var ctx      = document.getElementById('chartSales');
        if (!ctx) return;
        if (chartSalesInst) chartSalesInst.destroy();
        chartSalesInst = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Revenue (₹)',
              data:  revenues,
              borderColor: '#c8a96e',
              backgroundColor: 'rgba(200,169,110,0.12)',
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 5
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 11 } } },
              y: { beginAtZero: true, ticks: { font: { size: 11 },
                   callback: function (v) { return '₹' + v.toLocaleString('en-IN'); } } }
            }
          }
        });
      });
  }

  function loadChartStatus() {
    fetch('/api/admin/chart/orders-by-status', { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var ctx = document.getElementById('chartStatus');
        if (!ctx) return;
        if (chartStatusInst) chartStatusInst.destroy();
        var COLORS = { Pending:'#f59e0b', Paid:'#3b82f6', Shipped:'#8b5cf6', Delivered:'#22c55e', Cancelled:'#ef4444' };
        chartStatusInst = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels:   data.map(function (d) { return d.status; }),
            datasets: [{
              data:            data.map(function (d) { return d.count; }),
              backgroundColor: data.map(function (d) { return COLORS[d.status] || '#94a3b8'; }),
              borderWidth: 2,
              borderColor: '#fff'
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } } }
          }
        });
      });
  }

  function loadChartTop() {
    fetch('/api/admin/chart/top-products', { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var ctx = document.getElementById('chartTop');
        if (!ctx) return;
        if (chartTopInst) chartTopInst.destroy();
        chartTopInst = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.map(function (d) {
              var n = d.name;
              return n.length > 16 ? n.slice(0, 15) + '…' : n;
            }),
            datasets: [{
              label: 'Units Sold',
              data:  data.map(function (d) { return d.count; }),
              backgroundColor: '#c8a96e',
              borderRadius: 4
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
              y: { grid: { display: false }, ticks: { font: { size: 11 } } }
            }
          }
        });
      });
  }

  function loadActivity() {
    var feed = document.getElementById('activityFeed');
    if (feed) feed.innerHTML = '<p class="adm-loading">Loading…</p>';
    fetch('/api/admin/audit-log?limit=25', { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!feed) return;
        if (!data.length) { feed.innerHTML = '<p class="adm-empty">No activity yet.</p>'; return; }
        var ACTION_ICONS = {
          create: '➕', update: '✏️', delete: '🗑️', status_change: '🔄',
          role_change: '👤', session_revoke: '🔒', stock_adjust: '📦',
          bulk_status: '⚡', import: '📥', notes_update: '📝', account_status: '🔐'
        };
        feed.innerHTML = data.map(function (a) {
          var icon = ACTION_ICONS[a.action] || '•';
          return '<div class="adm-activity-item" data-testid="activity-item-' + a.id + '">' +
            '<span class="adm-activity-icon">' + icon + '</span>' +
            '<div class="adm-activity-content">' +
              '<span class="adm-activity-detail">' + esc(a.detail || a.action) + '</span>' +
              '<span class="adm-activity-meta">by ' + esc(a.username) + ' · ' + fmtDate(a.created_at) + '</span>' +
            '</div></div>';
        }).join('');
      });
  }

  var refreshBtn = document.getElementById('refreshActivity');
  if (refreshBtn) refreshBtn.addEventListener('click', loadActivity);


  // =============================================
  // TAB: PRODUCTS
  // =============================================
  var prodPage    = 1;
  var prodAll     = [];
  var prodFiltered = [];
  var PROD_PER_PAGE = 10;
  var selectedProductIds = new Set();

  function loadProducts() {
    document.getElementById('prodTableBody').innerHTML =
      '<tr><td colspan="9" class="adm-loading">Loading…</td></tr>';
    fetch('/api/products', { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        prodAll = data;
        prodPage = 1;
        selectedProductIds.clear();
        renderProductsTable();
      })
      .catch(function () { showToast('Failed to load products', 'error'); });
  }

  function filterProducts() {
    var search    = (document.getElementById('prodSearch').value || '').toLowerCase();
    var catFilter = document.getElementById('prodCatFilter').value;
    var stockF    = document.getElementById('prodStockFilter').value;

    return prodAll.filter(function (p) {
      var matchSearch = !search || p.name.toLowerCase().includes(search) ||
                        (p.code || '').toLowerCase().includes(search);
      var matchCat    = !catFilter || p.category === catFilter;
      var matchStock  = true;
      if (stockF === 'low')  matchStock = p.stock >= 0 && p.stock <= 10;
      if (stockF === 'out')  matchStock = p.stock === 0;
      return matchSearch && matchCat && matchStock;
    });
  }

  function renderProductsTable() {
    prodFiltered  = filterProducts();
    var startIdx  = (prodPage - 1) * PROD_PER_PAGE;
    var pageItems = prodFiltered.slice(startIdx, startIdx + PROD_PER_PAGE);
    var tbody     = document.getElementById('prodTableBody');
    if (!tbody) return;

    if (!pageItems.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="adm-empty">No products found.</td></tr>';
      document.getElementById('prodPagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = pageItems.map(function (p) {
      var stockLabel = p.stock === -1 ? '<span class="adm-badge adm-badge-blue">Unlimited</span>' :
                       p.stock === 0  ? '<span class="adm-badge adm-badge-red">Out of Stock</span>' :
                       p.stock <= 10  ? '<span class="adm-badge adm-badge-orange">' + p.stock + '</span>' :
                                        '<span class="adm-badge adm-badge-green">' + p.stock + '</span>';
      var statusBadgeHtml = p.active
        ? '<span class="adm-badge adm-badge-green">Active</span>'
        : '<span class="adm-badge adm-badge-grey">Inactive</span>';
      var checked = selectedProductIds.has(p.id) ? 'checked' : '';
      return '<tr data-testid="product-row-' + p.id + '">' +
        '<td><input type="checkbox" class="prod-check" data-id="' + p.id + '" ' + checked + ' data-testid="checkbox-product-' + p.id + '" /></td>' +
        '<td><img src="' + safeUrl(p.image) + '" alt="" class="adm-thumb" loading="lazy" /></td>' +
        '<td data-testid="product-name-' + p.id + '"><strong>' + esc(p.name) + '</strong></td>' +
        '<td data-testid="product-code-' + p.id + '">' + esc(p.code || '—') + '</td>' +
        '<td>' + esc(p.category) + '</td>' +
        '<td data-testid="product-price-' + p.id + '">' + fmtCurrency(p.price) + '</td>' +
        '<td>' + stockLabel + '</td>' +
        '<td>' + statusBadgeHtml + '</td>' +
        '<td class="adm-action-cell">' +
          '<button class="adm-icon-btn" title="Edit" data-action="edit-product" data-id="' + p.id + '" data-testid="button-edit-product-' + p.id + '">✏️</button>' +
          '<button class="adm-icon-btn adm-icon-btn-danger" title="Delete" data-action="delete-product" data-id="' + p.id + '" data-testid="button-delete-product-' + p.id + '">🗑️</button>' +
        '</td></tr>';
    }).join('');

    renderPagination('prodPagination', prodPage, prodFiltered.length, PROD_PER_PAGE, function (p) {
      prodPage = p; renderProductsTable();
    });

    // Checkbox logic
    tbody.querySelectorAll('.prod-check').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var id = parseInt(cb.dataset.id);
        if (cb.checked) selectedProductIds.add(id);
        else selectedProductIds.delete(id);
        updateBulkButtons();
      });
    });

    // Action buttons
    tbody.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.dataset.action;
        var id     = parseInt(btn.dataset.id);
        var prod   = prodAll.find(function (p) { return p.id === id; });
        if (action === 'edit-product'   && prod) openProductModal(prod);
        if (action === 'delete-product' && prod) openDeleteModal(id, prod.name);
      });
    });
  }

  function updateBulkButtons() {
    var hasSel = selectedProductIds.size > 0;
    document.getElementById('bulkActivateBtn').style.display   = hasSel ? '' : 'none';
    document.getElementById('bulkDeactivateBtn').style.display = hasSel ? '' : 'none';
  }

  // Select all
  document.getElementById('selectAllProducts').addEventListener('change', function () {
    var checked = this.checked;
    document.querySelectorAll('.prod-check').forEach(function (cb) {
      var id = parseInt(cb.dataset.id);
      cb.checked = checked;
      if (checked) selectedProductIds.add(id);
      else selectedProductIds.delete(id);
    });
    updateBulkButtons();
  });

  // Filters
  ['prodSearch', 'prodCatFilter', 'prodStockFilter'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { prodPage = 1; renderProductsTable(); });
  });

  // Bulk buttons
  document.getElementById('bulkActivateBtn').addEventListener('click', function () {
    bulkStatus(true);
  });
  document.getElementById('bulkDeactivateBtn').addEventListener('click', function () {
    bulkStatus(false);
  });

  function bulkStatus(active) {
    var ids = Array.from(selectedProductIds);
    fetch('/api/products/bulk-status', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ids: ids, active: active })
    })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      showToast(d.message || 'Done');
      selectedProductIds.clear();
      loadProducts();
    });
  }

  // Export products
  document.getElementById('exportProdBtn').addEventListener('click', function (e) {
    e.preventDefault();
    fetch('/api/products/export', { headers: authHeaders() })
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a   = document.createElement('a');
        a.href  = url; a.download = 'products.csv'; a.click();
        URL.revokeObjectURL(url);
      });
  });

  // CSV Import
  document.getElementById('csvImportInput').addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    var fd = new FormData();
    fd.append('file', file);
    var headers = { 'X-User-Role': getRole(), 'X-Username': getUser() };
    fetch('/api/products/import', { method: 'POST', headers: headers, body: fd })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        showToast(d.message || 'Imported');
        if (d.errors && d.errors.length) console.warn('Import errors:', d.errors);
        loadProducts();
      })
      .catch(function () { showToast('Import failed', 'error'); });
    this.value = '';
  });

  // ── Add Product Modal ──────────────────────────────────────────
  document.getElementById('openAddProductBtn').addEventListener('click', function () {
    openProductModal(null);
  });

  function openProductModal(product) {
    var isEdit  = !!product;
    var modal   = document.getElementById('productModal');
    var title   = document.getElementById('productModalTitle');
    var submitBtn = document.getElementById('pm-submit');
    var msg     = document.getElementById('productModalMsg');

    title.textContent      = isEdit ? 'Edit Product' : 'Add Product';
    submitBtn.textContent  = isEdit ? 'Save Changes' : 'Add Product';
    msg.style.display      = 'none';

    document.getElementById('pm-id').value          = isEdit ? product.id : '';
    document.getElementById('pm-name').value        = isEdit ? product.name        : '';
    document.getElementById('pm-code').value        = isEdit ? (product.code || '') : '';
    document.getElementById('pm-price').value       = isEdit ? product.price       : '';
    document.getElementById('pm-category').value    = isEdit ? product.category    : 'Kurthi';
    document.getElementById('pm-image').value       = isEdit ? product.image       : '';
    document.getElementById('pm-sizes').value       = isEdit ? (product.sizes || '') : '';
    document.getElementById('pm-stock').value       = isEdit ? product.stock       : '';
    document.getElementById('pm-colors').value      = isEdit ? (product.colors || '') : '';
    document.getElementById('pm-description').value = isEdit ? (product.description || '') : '';

    // Populate color variants if editing
    var variantsDiv = document.getElementById('pm-color-variants');
    variantsDiv.innerHTML = '';
    if (isEdit && product.colors) {
      buildColorVariants(product.colors, typeof product.images === 'object' ? product.images : {});
    }

    openModal('productModal');
  }

  // Color variant image builder
  document.getElementById('pm-parse-colors').addEventListener('click', function () {
    var colors = document.getElementById('pm-colors').value;
    buildColorVariants(colors, {});
  });

  function buildColorVariants(colorsStr, existingImages) {
    var variantsDiv = document.getElementById('pm-color-variants');
    var colors = (colorsStr || '').split(',').map(function (c) { return c.trim(); }).filter(Boolean);
    if (!colors.length) { variantsDiv.innerHTML = ''; return; }

    variantsDiv.innerHTML = colors.map(function (color) {
      var imgs = (existingImages && existingImages[color]) || [];
      var inputsHtml = '';
      for (var i = 0; i < 8; i++) {
        inputsHtml += '<input class="adm-form-input adm-variant-img" type="url" ' +
          'placeholder="Image URL ' + (i + 1) + '" ' +
          'data-color="' + esc(color) + '" data-idx="' + i + '" ' +
          'value="' + esc(imgs[i] || '') + '" ' +
          'data-testid="input-variant-' + esc(color) + '-' + i + '" />';
      }
      return '<div class="adm-variant-block">' +
        '<p class="adm-variant-label">🎨 ' + esc(color) + '</p>' + inputsHtml + '</div>';
    }).join('');
  }

  function collectColorImages() {
    var result = {};
    document.querySelectorAll('.adm-variant-img').forEach(function (inp) {
      var color = inp.dataset.color;
      var idx   = parseInt(inp.dataset.idx);
      var val   = inp.value.trim();
      if (!val) return;
      if (!result[color]) result[color] = [];
      result[color][idx] = val;
    });
    // compact sparse arrays
    Object.keys(result).forEach(function (c) {
      result[c] = result[c].filter(Boolean);
    });
    return Object.keys(result).length ? result : null;
  }

  // Product form submit
  document.getElementById('productModalForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id    = document.getElementById('pm-id').value;
    var isEdit = !!id;
    var msg   = document.getElementById('productModalMsg');
    msg.style.display = 'none';

    var payload = {
      name:        document.getElementById('pm-name').value.trim(),
      code:        document.getElementById('pm-code').value.trim(),
      price:       document.getElementById('pm-price').value,
      category:    document.getElementById('pm-category').value,
      image:       document.getElementById('pm-image').value.trim(),
      sizes:       document.getElementById('pm-sizes').value.trim(),
      colors:      document.getElementById('pm-colors').value.trim(),
      stock:       document.getElementById('pm-stock').value,
      description: document.getElementById('pm-description').value.trim(),
      images:      collectColorImages()
    };

    if (!payload.name || !payload.price || !payload.image) {
      msg.textContent = 'Name, price and image are required.';
      msg.className   = 'adm-form-msg error';
      msg.style.display = '';
      return;
    }

    var url    = isEdit ? '/api/products/' + id : '/api/products';
    var method = isEdit ? 'PUT' : 'POST';

    fetch(url, { method: method, headers: authHeaders(), body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok) {
          showToast(res.d.message || 'Saved');
          closeModal('productModal');
          loadProducts();
        } else {
          msg.textContent   = res.d.error || 'Error';
          msg.className     = 'adm-form-msg error';
          msg.style.display = '';
        }
      });
  });

  // ── Delete Product ─────────────────────────────────────────────
  var pendingDeleteId = null;

  function openDeleteModal(id, name) {
    pendingDeleteId = id;
    var msgEl = document.getElementById('deleteModalMsg');
    if (msgEl) msgEl.textContent = 'Are you sure you want to delete "' + name + '"? This cannot be undone.';
    openModal('deleteModal');
  }

  document.getElementById('confirmDeleteBtn').addEventListener('click', function () {
    if (!pendingDeleteId) return;
    fetch('/api/products/' + pendingDeleteId, { method: 'DELETE', headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        showToast(d.message || 'Deleted');
        closeModal('deleteModal');
        loadProducts();
        pendingDeleteId = null;
      });
  });


  // =============================================
  // TAB: ORDERS
  // =============================================
  var ordersPage    = 1;
  var ORDERS_PER_PAGE = 20;
  var ordersTotalCount = 0;

  function loadOrders(page) {
    ordersPage = page || 1;
    var status  = document.getElementById('orderStatusFilter').value;
    var dateFrom = document.getElementById('orderDateFrom').value;
    var dateTo   = document.getElementById('orderDateTo').value;

    var params = new URLSearchParams({
      page: ordersPage, per_page: ORDERS_PER_PAGE,
      status: status, date_from: dateFrom, date_to: dateTo
    });

    document.getElementById('ordersTableBody').innerHTML =
      '<tr><td colspan="7" class="adm-loading">Loading…</td></tr>';

    fetch('/api/orders?' + params.toString(), { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        ordersTotalCount = data.total || 0;
        renderOrdersTable(data.orders || []);
      });
  }

  document.getElementById('orderFilterBtn').addEventListener('click', function () { loadOrders(1); });

  function renderOrdersTable(orders) {
    var tbody = document.getElementById('ordersTableBody');
    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="adm-empty">No orders found.</td></tr>';
      document.getElementById('ordersPagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = orders.map(function (o) {
      var statusSelect =
        '<select class="adm-select-sm order-status-select" data-order-id="' + o.id + '" data-testid="select-order-status-' + o.id + '">' +
        ['Pending','Paid','Shipped','Delivered','Cancelled'].map(function (s) {
          return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('') + '</select>';

      return '<tr data-testid="order-row-' + o.id + '">' +
        '<td data-testid="order-id-' + o.id + '">#' + o.id + '</td>' +
        '<td data-testid="order-customer-' + o.id + '">' + esc(o.customer_name || o.username) + '</td>' +
        '<td data-testid="order-total-' + o.id + '">' + fmtCurrency(o.total) + '</td>' +
        '<td>' + statusSelect + '</td>' +
        '<td>' + esc(o.payment_method || 'COD') + '</td>' +
        '<td>' + fmtDate(o.created_at) + '</td>' +
        '<td><button class="adm-icon-btn" data-action="view-order" data-order=\'' + JSON.stringify(o).replace(/'/g,"&#39;") + '\' data-testid="button-view-order-' + o.id + '" title="View">👁</button></td>' +
        '</tr>';
    }).join('');

    // Status change
    tbody.querySelectorAll('.order-status-select').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var oid = parseInt(sel.dataset.orderId);
        fetch('/api/orders/' + oid + '/status', {
          method: 'PUT', headers: authHeaders(),
          body: JSON.stringify({ status: sel.value })
        })
        .then(function (r) { return r.json(); })
        .then(function (d) { showToast(d.message || 'Updated'); });
      });
    });

    // View order
    tbody.querySelectorAll('[data-action="view-order"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var order = JSON.parse(btn.dataset.order.replace(/&#39;/g, "'"));
        openOrderModal(order);
      });
    });

    renderPagination('ordersPagination', ordersPage, ordersTotalCount, ORDERS_PER_PAGE, function (p) {
      loadOrders(p);
    });
  }

  function openOrderModal(order) {
    document.getElementById('orderModalTitle').textContent = 'Order #' + order.id;
    var body = document.getElementById('orderModalBody');

    var itemsHtml = (order.items || []).map(function (item) {
      return '<div class="adm-order-item" data-testid="order-item-' + esc(item.id) + '">' +
        (item.image ? '<img src="' + safeUrl(item.image) + '" alt="" class="adm-thumb" />' : '') +
        '<div class="adm-order-item-info">' +
          '<strong>' + esc(item.name || 'Item') + '</strong>' +
          '<span>Qty: ' + (item.qty || item.quantity || 1) +
          ' · ' + fmtCurrency(item.price || 0) + '</span>' +
        '</div></div>';
    }).join('');

    var timeline = ['Pending','Paid','Shipped','Delivered']
      .map(function (s) {
        var done = ['Pending','Paid','Shipped','Delivered','Cancelled'].indexOf(order.status) >=
                   ['Pending','Paid','Shipped','Delivered'].indexOf(s);
        return '<div class="adm-timeline-step' + (done ? ' done' : '') + '" data-testid="timeline-step-' + s + '">' +
               '<div class="adm-timeline-dot"></div><span>' + s + '</span></div>';
      }).join('');

    body.innerHTML =
      '<div class="adm-order-detail">' +
        '<div class="adm-order-section">' +
          '<h4>Customer Info</h4>' +
          '<p data-testid="order-detail-customer"><strong>Name:</strong> ' + esc(order.customer_name || order.username) + '</p>' +
          '<p data-testid="order-detail-phone"><strong>Phone:</strong> ' + esc(order.phone || '—') + '</p>' +
          '<p data-testid="order-detail-address"><strong>Address:</strong> ' + esc(order.address || '—') + '</p>' +
        '</div>' +
        '<div class="adm-order-section">' +
          '<h4>Payment</h4>' +
          '<p><strong>Method:</strong> ' + esc(order.payment_method || 'COD') + '</p>' +
          '<p data-testid="order-detail-total"><strong>Total:</strong> ' + fmtCurrency(order.total) + '</p>' +
          '<p><strong>Status:</strong> ' + statusBadge(order.status) + '</p>' +
        '</div>' +
        '<div class="adm-order-section adm-order-timeline">' +
          '<h4>Timeline</h4>' +
          '<div class="adm-timeline">' + timeline + '</div>' +
        '</div>' +
        '<div class="adm-order-section adm-order-items-section">' +
          '<h4>Line Items</h4>' + (itemsHtml || '<p class="adm-empty">No items.</p>') +
        '</div>' +
        '<div class="adm-order-section adm-order-notes-section">' +
          '<h4>Internal Notes</h4>' +
          '<textarea id="orderNotesInput" class="adm-form-input" rows="3" placeholder="Private notes for this order…" data-testid="input-order-notes">' + esc(order.notes || '') + '</textarea>' +
          '<button class="adm-btn adm-btn-ghost adm-btn-sm" id="saveOrderNotesBtn" data-order-id="' + order.id + '" style="margin-top:8px" data-testid="button-save-notes">Save Notes</button>' +
        '</div>' +
      '</div>';

    document.getElementById('saveOrderNotesBtn').addEventListener('click', function () {
      var notes = document.getElementById('orderNotesInput').value;
      fetch('/api/orders/' + order.id + '/notes', {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ notes: notes })
      })
      .then(function (r) { return r.json(); })
      .then(function (d) { showToast(d.message || 'Notes saved'); });
    });

    openModal('orderModal');
  }

  // Export orders
  document.getElementById('exportOrdersBtn').addEventListener('click', function (e) {
    e.preventDefault();
    fetch('/api/orders/export', { headers: authHeaders() })
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a   = document.createElement('a');
        a.href  = url; a.download = 'orders.csv'; a.click();
        URL.revokeObjectURL(url);
      });
  });


  // =============================================
  // TAB: USERS
  // =============================================
  var usersPage = 1;
  var USERS_PER_PAGE = 20;
  var usersTotalCount = 0;

  function loadUsers(page) {
    usersPage = page || 1;
    var search = document.getElementById('userSearch').value;
    var role   = document.getElementById('userRoleFilter').value;
    var params = new URLSearchParams({ page: usersPage, per_page: USERS_PER_PAGE, search: search, role: role });

    document.getElementById('usersTableBody').innerHTML =
      '<tr><td colspan="8" class="adm-loading">Loading…</td></tr>';

    fetch('/api/users?' + params.toString(), { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        usersTotalCount = data.total || 0;
        renderUsersTable(data.users || []);
      });
  }

  document.getElementById('userFilterBtn').addEventListener('click', function () { loadUsers(1); });
  document.getElementById('userSearch').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') loadUsers(1);
  });

  function renderUsersTable(users) {
    var tbody = document.getElementById('usersTableBody');
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="adm-empty">No users found.</td></tr>';
      document.getElementById('usersPagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = users.map(function (u, i) {
      var roleBadge = u.role === 'admin'
        ? '<span class="adm-badge adm-badge-purple">Admin</span>'
        : '<span class="adm-badge adm-badge-grey">User</span>';
      var statusBdg = u.disabled
        ? '<span class="adm-badge adm-badge-red">Disabled</span>'
        : '<span class="adm-badge adm-badge-green">Active</span>';

      return '<tr data-testid="user-row-' + u.id + '">' +
        '<td>' + ((usersPage - 1) * USERS_PER_PAGE + i + 1) + '</td>' +
        '<td data-testid="user-name-' + u.id + '">' + esc(u.full_name || u.username) + '</td>' +
        '<td data-testid="user-email-' + u.id + '">' + esc(u.email || '—') + '</td>' +
        '<td>' + roleBadge + '</td>' +
        '<td data-testid="user-orders-' + u.id + '">' + u.order_count + '</td>' +
        '<td data-testid="user-spent-' + u.id + '">' + fmtCurrency(u.total_spent) + '</td>' +
        '<td>' + statusBdg + '</td>' +
        '<td class="adm-action-cell">' +
          '<button class="adm-icon-btn" data-action="view-user" data-uid="' + u.id + '" data-testid="button-view-user-' + u.id + '" title="Profile">👁</button>' +
          '<button class="adm-icon-btn" data-action="toggle-role" data-uid="' + u.id + '" data-role="' + u.role + '" data-name="' + esc(u.username) + '" data-testid="button-toggle-role-' + u.id + '" title="Toggle Role">🔄</button>' +
          '<button class="adm-icon-btn ' + (u.disabled ? 'adm-icon-btn-success' : 'adm-icon-btn-warning') + '" data-action="toggle-status" data-uid="' + u.id + '" data-disabled="' + u.disabled + '" data-testid="button-toggle-status-' + u.id + '" title="' + (u.disabled ? 'Enable' : 'Disable') + '">' + (u.disabled ? '✅' : '🚫') + '</button>' +
          '<button class="adm-icon-btn adm-icon-btn-danger" data-action="revoke-sessions" data-uid="' + u.id + '" data-name="' + esc(u.username) + '" data-testid="button-revoke-sessions-' + u.id + '" title="Revoke Sessions">🔒</button>' +
        '</td></tr>';
    }).join('');

    tbody.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action   = btn.dataset.action;
        var uid      = parseInt(btn.dataset.uid);
        var name     = btn.dataset.name || '';
        var role     = btn.dataset.role || '';
        var disabled = parseInt(btn.dataset.disabled || '0');
        var userObj  = users.find(function (u) { return u.id === uid; });

        if (action === 'view-user' && userObj) {
          openUserModal(userObj);
        } else if (action === 'toggle-role') {
          var newRole = role === 'admin' ? 'user' : 'admin';
          var msgEl = document.getElementById('roleModalMsg');
          msgEl.textContent = 'Change ' + name + '\'s role to ' + newRole.toUpperCase() + '?';
          document.getElementById('confirmRoleBtn').dataset.uid  = uid;
          document.getElementById('confirmRoleBtn').dataset.role = newRole;
          openModal('roleModal');
        } else if (action === 'toggle-status') {
          toggleUserStatus(uid, !disabled);
        } else if (action === 'revoke-sessions') {
          if (confirm('Revoke all sessions for ' + name + '?')) {
            fetch('/api/users/' + uid + '/sessions', { method: 'DELETE', headers: authHeaders() })
              .then(function (r) { return r.json(); })
              .then(function (d) { showToast(d.message || 'Revoked'); });
          }
        }
      });
    });

    renderPagination('usersPagination', usersPage, usersTotalCount, USERS_PER_PAGE, function (p) {
      loadUsers(p);
    });
  }

  function openUserModal(user) {
    document.getElementById('userModalTitle').textContent = user.full_name || user.username;
    var body = document.getElementById('userModalBody');
    body.innerHTML =
      '<div class="adm-user-profile" data-testid="user-profile-' + user.id + '">' +
        '<div class="adm-user-avatar">' + (user.username || '?').charAt(0).toUpperCase() + '</div>' +
        '<table class="adm-profile-table">' +
          '<tr><td>Username</td><td data-testid="profile-username">' + esc(user.username) + '</td></tr>' +
          '<tr><td>Email</td><td data-testid="profile-email">' + esc(user.email || '—') + '</td></tr>' +
          '<tr><td>Phone</td><td>' + esc(user.phone || '—') + '</td></tr>' +
          '<tr><td>Role</td><td>' + esc(user.role) + '</td></tr>' +
          '<tr><td>Orders</td><td data-testid="profile-order-count">' + user.order_count + '</td></tr>' +
          '<tr><td>Total Spent</td><td data-testid="profile-total-spent">' + fmtCurrency(user.total_spent) + '</td></tr>' +
          '<tr><td>Status</td><td>' + (user.disabled ? 'Disabled' : 'Active') + '</td></tr>' +
          '<tr><td>Joined</td><td>' + fmtDate(user.created_at) + '</td></tr>' +
        '</table>' +
      '</div>';
    openModal('userModal');
  }

  function toggleUserStatus(uid, disable) {
    fetch('/api/users/' + uid + '/status', {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ disabled: disable ? 1 : 0 })
    })
    .then(function (r) { return r.json(); })
    .then(function (d) { showToast(d.message || 'Updated'); loadUsers(usersPage); });
  }

  document.getElementById('confirmRoleBtn').addEventListener('click', function () {
    var uid  = parseInt(this.dataset.uid);
    var role = this.dataset.role;
    fetch('/api/users/' + uid + '/role', {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ role: role })
    })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      showToast(d.message || 'Role updated');
      closeModal('roleModal');
      loadUsers(usersPage);
    });
  });


  // =============================================
  // TAB: INVENTORY
  // =============================================
  function loadInventory() {
    var threshold = parseInt(document.getElementById('invThreshold').value || '10');
    document.getElementById('invTableBody').innerHTML =
      '<tr><td colspan="6" class="adm-loading">Loading…</td></tr>';

    fetch('/api/inventory?threshold=' + threshold, { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (data) { renderInventoryTable(data); });
  }

  document.getElementById('invApplyBtn').addEventListener('click', function () { loadInventory(); });

  function renderInventoryTable(items) {
    var tbody = document.getElementById('invTableBody');
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="adm-empty">No low-stock items. 🎉</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(function (item) {
      var isOut = item.stock === 0;
      return '<tr class="' + (isOut ? 'adm-row-danger' : '') + '" data-testid="inv-row-' + item.id + '">' +
        '<td><img src="' + safeUrl(item.image) + '" alt="" class="adm-thumb" loading="lazy" /></td>' +
        '<td data-testid="inv-name-' + item.id + '"><strong>' + esc(item.name) + '</strong></td>' +
        '<td>' + esc(item.code || '—') + '</td>' +
        '<td>' + esc(item.category) + '</td>' +
        '<td data-testid="inv-stock-' + item.id + '">' +
          (isOut ? '<span class="adm-badge adm-badge-red">Out of Stock</span>' :
                   '<span class="adm-badge adm-badge-orange">' + item.stock + '</span>') +
        '</td>' +
        '<td>' +
          '<div class="adm-stock-adjust">' +
            '<input type="number" class="adm-stock-input" id="adj-' + item.id + '" value="0" ' +
              'placeholder="±qty" style="width:70px" data-testid="input-stock-adj-' + item.id + '" />' +
            '<button class="adm-btn adm-btn-ghost adm-btn-sm" data-action="adjust-stock" data-pid="' + item.id + '" data-testid="button-stock-adj-' + item.id + '">Apply</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('[data-action="adjust-stock"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pid    = parseInt(btn.dataset.pid);
        var adjVal = parseInt(document.getElementById('adj-' + pid).value || '0');
        if (isNaN(adjVal) || adjVal === 0) { showToast('Enter a non-zero adjustment', 'error'); return; }

        fetch('/api/inventory/' + pid + '/stock', {
          method: 'PUT', headers: authHeaders(),
          body: JSON.stringify({ adjust: adjVal })
        })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          showToast(d.message || 'Stock updated');
          loadInventory();
        });
      });
    });
  }


  // =============================================
  // MESSAGES (Contact Form Submissions)
  // =============================================
  function loadMessages() {
    var tbody = document.getElementById('messagesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="adm-loading">Loading…</td></tr>';
    fetch('/api/admin/messages', { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (msgs) {
        if (!msgs.length) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--adm-text-muted)">No messages yet.</td></tr>';
          return;
        }
        tbody.innerHTML = msgs.map(function (m) {
          return '<tr style="' + (m.read ? '' : 'font-weight:600;background:var(--adm-row-hover,#faf7f5);') + '" data-testid="msg-row-' + m.id + '">' +
            '<td>' + esc(m.id) + '</td>' +
            '<td>' + esc(m.name) + '</td>' +
            '<td><a href="mailto:' + esc(m.email) + '" style="color:inherit">' + esc(m.email) + '</a></td>' +
            '<td>' + esc(m.subject || '—') + '</td>' +
            '<td style="max-width:260px;white-space:pre-wrap;word-break:break-word">' + esc(m.message) + '</td>' +
            '<td>' + fmtDate(m.created_at) + '</td>' +
            '<td>' + (m.read
              ? '<span style="color:var(--adm-text-muted);font-size:0.82rem">Read</span>'
              : '<span style="color:#e07a5f;font-size:0.82rem;font-weight:700">New</span>') + '</td>' +
            '<td style="white-space:nowrap">' +
              (!m.read ? '<button class="adm-btn adm-btn-ghost adm-btn-sm msg-read-btn" data-id="' + m.id + '" data-testid="button-msg-read-' + m.id + '">Mark Read</button> ' : '') +
              '<button class="adm-btn adm-btn-danger adm-btn-sm msg-del-btn" data-id="' + m.id + '" data-testid="button-msg-del-' + m.id + '">Delete</button>' +
            '</td>' +
          '</tr>';
        }).join('');

        tbody.querySelectorAll('.msg-read-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            fetch('/api/admin/messages/' + btn.dataset.id + '/read', {
              method: 'PATCH', headers: authHeaders()
            }).then(function () { loadMessages(); });
          });
        });

        tbody.querySelectorAll('.msg-del-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (!confirm('Delete this message?')) return;
            fetch('/api/admin/messages/' + btn.dataset.id, {
              method: 'DELETE', headers: authHeaders()
            }).then(function () { loadMessages(); });
          });
        });
      })
      .catch(function () {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:red">Failed to load messages.</td></tr>';
      });
  }


  // =============================================
  // INIT
  // =============================================
  loadDashboard();

})();
