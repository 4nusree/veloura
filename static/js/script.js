// ===========================
// HERO SLIDER
// ===========================
(function () {
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  if (!prevBtn || !nextBtn) return;

  var slides = document.querySelectorAll('.slide');
  var dots   = document.querySelectorAll('.dot');

  var current = 0;
  var timer   = null;

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAuto() {
    clearInterval(timer);
    timer = setInterval(next, 4000);
  }

  function resetAuto() {
    clearInterval(timer);
    startAuto();
  }

  nextBtn.addEventListener('click', function () { next(); resetAuto(); });
  prevBtn.addEventListener('click', function () { prev(); resetAuto(); });

  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      goTo(parseInt(dot.dataset.index, 10));
      resetAuto();
    });
  });

  startAuto();
})();


// ===========================
// SEARCH BAR TOGGLE
// ===========================
(function () {
  var wrap      = document.getElementById('searchBarWrap');
  var toggleBtn = document.getElementById('searchToggleBtn');
  var input     = document.getElementById('searchInput');
  var submitBtn = document.getElementById('searchSubmitBtn');
  if (!wrap || !toggleBtn || !input) return;

  function doSearch() {
    var q = input.value.trim();
    if (q) {
      window.location.href = '/shop?search=' + encodeURIComponent(q);
    }
  }

  toggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var isOpen = wrap.classList.toggle('open');
    if (isOpen) {
      input.focus();
    }
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      doSearch();
    });
  }

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { doSearch(); }
    if (e.key === 'Escape') { wrap.classList.remove('open'); }
  });

  document.addEventListener('click', function (e) {
    if (!wrap.contains(e.target)) {
      wrap.classList.remove('open');
    }
  });
})();


// ===========================
// HEADER SCROLL SHADOW
// ===========================
(function () {
  var header = document.querySelector('.header');
  if (!header) return;
  window.addEventListener('scroll', function () {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
})();


// ===========================
// TOAST NOTIFICATION
// ===========================
var _toastTimer = null;

function showToast(message, isError) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  clearTimeout(_toastTimer);
  toast.textContent = message;
  toast.className = 'toast toast--visible' + (isError ? ' toast--error' : '');
  _toastTimer = setTimeout(function () {
    toast.classList.remove('toast--visible');
  }, 3000);
}


// ===========================
// AUTH HELPERS
// ===========================
function getRole()     { return localStorage.getItem('user_role') || null; }
function getUsername() { return localStorage.getItem('user_name') || null; }

function logout() {
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_name');
  window.location.href = '/';
}

function updateAuthHeader() {
  var el = document.getElementById('auth-action');
  if (!el) return;
  var role = getRole();
  if (role) {
    var name = getUsername() || 'Account';
    el.innerHTML =
      '<span class="auth-username" data-testid="text-auth-username">' + name + '</span>' +
      '<button class="login-btn logout-btn" data-testid="button-logout" onclick="logout()">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
        '<span>Logout</span>' +
      '</button>';
  } else {
    el.innerHTML =
      '<a href="/login" class="login-btn" data-testid="button-login">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
        '<span>Login</span>' +
      '</a>';
  }
}

updateAuthHeader();


// ===========================
// CATEGORIES DROPDOWN
// ===========================
(function () {
  var dropdown = document.getElementById('categoriesDropdown');
  if (!dropdown) return;

  var trigger = dropdown.querySelector('.nav-dropdown-trigger');

  function openDropdown() {
    dropdown.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
  }

  function closeDropdown() {
    dropdown.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    if (dropdown.classList.contains('open')) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  document.addEventListener('click', function (e) {
    if (!dropdown.contains(e.target)) {
      closeDropdown();
    }
  });
})();


// ===========================
// HAMBURGER / MOBILE MENU
// ===========================
(function () {
  var hamburger = document.getElementById('hamburgerBtn');
  var mobileMenu = document.getElementById('mobileMenu');
  if (!hamburger || !mobileMenu) return;

  function openMenu() {
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileMenu.classList.add('open');
    mobileMenu.setAttribute('aria-hidden', 'false');
  }

  function closeMenu() {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
  }

  hamburger.addEventListener('click', function () {
    if (mobileMenu.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  document.addEventListener('click', function (e) {
    if (
      mobileMenu.classList.contains('open') &&
      !mobileMenu.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      closeMenu();
    }
  });
})();


// ===========================
// MOBILE CATEGORIES ACCORDION
// ===========================
(function () {
  var accordion = document.getElementById('mobileCategoriesAccordion');
  if (!accordion) return;

  var trigger = accordion.querySelector('.mobile-accordion-trigger');

  trigger.addEventListener('click', function () {
    if (accordion.classList.contains('open')) {
      accordion.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    } else {
      accordion.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });
})();


// ===========================
// IMAGE PREVIEW HELPER
// ===========================
function bindImagePreview(inputId, previewWrapId, previewImgId, statusId) {
  var input   = document.getElementById(inputId);
  var wrap    = document.getElementById(previewWrapId);
  var prevImg = document.getElementById(previewImgId);
  var status  = document.getElementById(statusId);
  if (!input || !wrap || !prevImg) return;

  var debounce = null;

  function tryLoad(url) {
    if (!url) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'flex';
    status.textContent = 'Checking…';
    status.className = 'img-preview-status img-preview-status--loading';
    prevImg.style.opacity = '0.4';
    prevImg.src = url;
    prevImg.onload = function () {
      prevImg.style.opacity = '1';
      status.textContent = 'Image looks good ✓';
      status.className = 'img-preview-status img-preview-status--ok';
    };
    prevImg.onerror = function () {
      prevImg.style.opacity = '0.15';
      status.textContent = 'Could not load image — check the URL';
      status.className = 'img-preview-status img-preview-status--err';
    };
  }

  input.addEventListener('input', function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () { tryLoad(input.value.trim()); }, 500);
  });

  input.addEventListener('blur', function () {
    clearTimeout(debounce);
    tryLoad(input.value.trim());
  });
}


// ===========================
// AUTH PAGE (Login / Register)
// ===========================
(function () {
  var form      = document.getElementById('auth-form');
  if (!form) return;

  var toggleBtn   = document.getElementById('auth-toggle-btn');
  var toggleTxt   = document.getElementById('auth-toggle-text');
  var eyebrow     = document.getElementById('auth-eyebrow');
  var cardTitle   = document.getElementById('auth-card-title');
  var cardSub     = document.getElementById('auth-card-sub');
  var submitBtn   = document.getElementById('auth-submit-btn');
  var msgEl       = document.getElementById('auth-message');
  var labelEmail  = document.getElementById('label-email');

  var registerOnlyFields = document.querySelectorAll('.register-only');
  var loginOnlyFields    = document.querySelectorAll('.login-only');
  var emailInput    = document.getElementById('email');
  var passInput     = document.getElementById('password');
  var confirmInput  = document.getElementById('confirm-password');
  var fullnameInput = document.getElementById('fullname');
  var phoneInput    = document.getElementById('phone');

  var isLogin = true;

  /* ---------- helpers ---------- */
  function showMsg(text, isError) {
    msgEl.textContent   = text;
    msgEl.className     = 'auth-message ' + (isError ? 'auth-message--error' : 'auth-message--success');
    msgEl.style.display = 'block';
  }

  function hideMsg() { msgEl.style.display = 'none'; }

  function setError(inputEl, errId, msg) {
    var errEl = document.getElementById(errId);
    if (errEl) errEl.textContent = msg;
    if (inputEl) inputEl.classList.toggle('input-error', !!msg);
  }

  function clearErrors() {
    form.querySelectorAll('.auth-error').forEach(function (el) { el.textContent = ''; });
    form.querySelectorAll('.auth-input').forEach(function (el) { el.classList.remove('input-error'); });
  }

  function isValidEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  /* ---------- mode switch ---------- */
  function setMode(loginMode) {
    isLogin = loginMode;
    clearErrors();
    hideMsg();
    updateStrengthMeter('');

    registerOnlyFields.forEach(function (el) {
      el.style.display = loginMode ? 'none' : 'flex';
    });

    loginOnlyFields.forEach(function (el) {
      el.style.display = loginMode ? 'block' : 'none';
    });

    if (loginMode) {
      eyebrow.textContent   = 'Welcome back';
      cardTitle.textContent = 'Sign In';
      cardSub.textContent   = 'Enter your credentials to access your account';
      submitBtn.textContent = 'Sign In';
      toggleTxt.textContent = "Don't have an account?";
      toggleBtn.textContent = 'Sign In';
      labelEmail.textContent = 'Username';
      emailInput.placeholder = 'Enter your username';
      passInput.setAttribute('autocomplete', 'current-password');
    } else {
      eyebrow.textContent   = 'Join us';
      cardTitle.textContent = 'Create Account';
      cardSub.textContent   = 'Sign up for a free account today';
      submitBtn.textContent = 'Create Account';
      toggleTxt.textContent = 'Already have an account?';
      toggleBtn.textContent = 'Sign In';
      labelEmail.textContent = 'Email Address';
      emailInput.placeholder = 'you@example.com';
      passInput.setAttribute('autocomplete', 'new-password');
    }
  }

  toggleBtn.addEventListener('click', function () { setMode(!isLogin); });

  /* ---------- password eye toggles ---------- */
  function setupEyeToggle(btnId, inputId, iconId) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var inp = document.getElementById(inputId);
      var icon = document.getElementById(iconId);
      var isText = inp.type === 'text';
      inp.type = isText ? 'password' : 'text';
      icon.innerHTML = isText
        ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
        : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
    });
  }
  setupEyeToggle('toggle-pass',    'password',        'eye-icon');
  setupEyeToggle('toggle-confirm', 'confirm-password', 'eye-icon-confirm');

  /* ---------- password strength ---------- */
  var pwStrengthWrap  = document.getElementById('pw-strength-wrap');
  var pwStrengthLabel = document.getElementById('pw-strength-label');
  var pwBars          = [
    document.getElementById('pw-bar-1'),
    document.getElementById('pw-bar-2'),
    document.getElementById('pw-bar-3'),
    document.getElementById('pw-bar-4')
  ];

  var strengthLevels = [
    { label: 'Weak',   cls: 'weak',   bars: 1 },
    { label: 'Fair',   cls: 'fair',   bars: 2 },
    { label: 'Good',   cls: 'good',   bars: 3 },
    { label: 'Strong', cls: 'strong', bars: 4 }
  ];

  function scorePassword(pw) {
    if (!pw) return -1;
    var score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return 0;
    if (score === 2) return 1;
    if (score === 3) return 2;
    return 3;
  }

  function updateStrengthMeter(pw) {
    if (!pwStrengthWrap) return;
    if (!pw) {
      pwBars.forEach(function (b) { b.className = 'pw-strength-bar'; });
      pwStrengthLabel.textContent = '';
      pwStrengthLabel.className   = 'pw-strength-label';
      return;
    }
    var idx   = scorePassword(pw);
    var level = strengthLevels[idx];
    pwBars.forEach(function (b, i) {
      b.className = 'pw-strength-bar' + (i < level.bars ? ' active-' + level.cls : '');
    });
    pwStrengthLabel.textContent = level.label;
    pwStrengthLabel.className   = 'pw-strength-label label-' + level.cls;
  }

  passInput.addEventListener('input', function () {
    if (!isLogin) { updateStrengthMeter(passInput.value); }
  });

  /* ---------- validation ---------- */
  function validateLogin() {
    var ok = true;
    var emailVal = emailInput.value.trim();
    var passVal  = passInput.value;

    if (!emailVal) {
      setError(emailInput, 'err-email', 'This field is required.');
      ok = false;
    } else {
      setError(emailInput, 'err-email', '');
    }

    if (!passVal) {
      setError(passInput, 'err-password', 'Password is required.');
      ok = false;
    } else {
      setError(passInput, 'err-password', '');
    }
    return ok;
  }

  function validateRegister() {
    var ok = true;

    var nameVal    = fullnameInput.value.trim();
    var emailVal   = emailInput.value.trim();
    var phoneVal   = phoneInput.value.trim();
    var passVal    = passInput.value;
    var confirmVal = confirmInput.value;

    if (!nameVal) {
      setError(fullnameInput, 'err-fullname', 'Full name is required.'); ok = false;
    } else { setError(fullnameInput, 'err-fullname', ''); }

    if (!emailVal) {
      setError(emailInput, 'err-email', 'Email is required.'); ok = false;
    } else if (!isValidEmail(emailVal)) {
      setError(emailInput, 'err-email', 'Please enter a valid email address.'); ok = false;
    } else { setError(emailInput, 'err-email', ''); }

    if (!phoneVal) {
      setError(phoneInput, 'err-phone', 'Phone number is required.'); ok = false;
    } else if (!/^\d{10,}$/.test(phoneVal.replace(/[\s\-\+]/g, ''))) {
      setError(phoneInput, 'err-phone', 'Must be at least 10 digits.'); ok = false;
    } else { setError(phoneInput, 'err-phone', ''); }

    if (!passVal) {
      setError(passInput, 'err-password', 'Password is required.'); ok = false;
    } else if (passVal.length < 6) {
      setError(passInput, 'err-password', 'Minimum 6 characters required.'); ok = false;
    } else { setError(passInput, 'err-password', ''); }

    if (!confirmVal) {
      setError(confirmInput, 'err-confirm', 'Please confirm your password.'); ok = false;
    } else if (confirmVal !== passVal) {
      setError(confirmInput, 'err-confirm', 'Passwords do not match.'); ok = false;
    } else { setError(confirmInput, 'err-confirm', ''); }

    return ok;
  }

  /* ---------- submit ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideMsg();

    var valid = isLogin ? validateLogin() : validateRegister();
    if (!valid) return;

    var url     = isLogin ? '/api/login' : '/api/register';
    var origTxt = submitBtn.textContent;
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Processing…';

    var payload = isLogin
      ? { username: emailInput.value.trim(), password: passInput.value }
      : {
          full_name: fullnameInput.value.trim(),
          email:     emailInput.value.trim(),
          phone:     phoneInput.value.trim(),
          password:  passInput.value
        };

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
      .then(function (result) {
        if (result.ok) {
          if (isLogin) {
            localStorage.setItem('user_role', result.data.role);
            localStorage.setItem('user_name', result.data.username);
            window.location.href = result.data.role === 'admin' ? '/admin' : '/';
          } else {
            showMsg('Account created! You can now sign in.', false);
            setMode(true);
            form.reset();
          }
        } else {
          showMsg(result.data.error || 'Something went wrong. Please try again.', true);
        }
      })
      .catch(function () { showMsg('Network error. Please try again.', true); })
      .finally(function () {
        submitBtn.disabled    = false;
        submitBtn.textContent = origTxt;
      });
  });
})();


// ===========================
// ADMIN PAGE
// ===========================
(function () {
  if (window.location.pathname !== '/admin') return;

  var role = getRole();
  if (role !== 'admin') {
    window.location.href = '/login';
    return;
  }

  // Elements
  var welcomeEl    = document.getElementById('admin-welcome');
  var listEl       = document.getElementById('admin-product-list');
  var formMsgEl    = document.getElementById('product-form-msg');
  var addForm      = document.getElementById('product-form');
  var addSubmitBtn = document.getElementById('prod-submit-btn');
  var statProducts = document.getElementById('stat-products');
  var statUsers    = document.getElementById('stat-users');

  // Edit modal elements
  var modal         = document.getElementById('edit-modal');
  var closeBtn      = document.getElementById('modal-close-btn');
  var cancelBtn     = document.getElementById('modal-cancel-btn');
  var editForm      = document.getElementById('edit-product-form');
  var editSubmitBtn = document.getElementById('edit-submit-btn');
  var editMsgEl     = document.getElementById('edit-form-msg');

  if (welcomeEl) {
    welcomeEl.textContent = 'Welcome, ' + (getUsername() || 'Admin');
  }

  // Bind image preview for both forms
  bindImagePreview('prod-image',      'add-image-preview-wrap',  'add-image-preview',  'add-image-status');
  bindImagePreview('edit-prod-image', 'edit-image-preview-wrap', 'edit-image-preview', 'edit-image-status');

  function adminHeaders() {
    return { 'Content-Type': 'application/json', 'X-User-Role': 'admin' };
  }

  function showFormMsg(text, isError) {
    formMsgEl.textContent = text;
    formMsgEl.className = 'auth-message ' + (isError ? 'auth-message--error' : 'auth-message--success');
    formMsgEl.style.display = 'block';
    setTimeout(function () { formMsgEl.style.display = 'none'; }, 4000);
  }

  function showEditMsg(text, isError) {
    editMsgEl.textContent = text;
    editMsgEl.className = 'auth-message ' + (isError ? 'auth-message--error' : 'auth-message--success');
    editMsgEl.style.display = 'block';
    setTimeout(function () { editMsgEl.style.display = 'none'; }, 3500);
  }

  // ---- Modal open/close ----
  function openEditModal(p) {
    document.getElementById('edit-prod-id').value       = p.id;
    document.getElementById('edit-prod-name').value     = p.name;
    document.getElementById('edit-prod-price').value    = p.price;
    document.getElementById('edit-prod-image').value    = p.image;
    document.getElementById('edit-prod-category').value = p.category;
    document.getElementById('edit-prod-sizes').value    = p.sizes  || '';
    document.getElementById('edit-prod-colors').value   = p.colors || '';
    var stockEl = document.getElementById('edit-prod-stock');
    if (stockEl) stockEl.value = (p.stock !== undefined && p.stock !== null) ? p.stock : -1;
    editMsgEl.style.display = 'none';

    // Trigger preview for existing image
    var prevWrap = document.getElementById('edit-image-preview-wrap');
    var prevImg  = document.getElementById('edit-image-preview');
    if (prevWrap && prevImg && p.image) {
      prevWrap.style.display = 'flex';
      prevImg.src = p.image;
      prevImg.style.opacity = '1';
      var st = document.getElementById('edit-image-status');
      if (st) { st.textContent = ''; st.className = 'img-preview-status'; }
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('edit-prod-name').focus();
  }

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    editForm.reset();
    var prevWrap = document.getElementById('edit-image-preview-wrap');
    if (prevWrap) prevWrap.style.display = 'none';
  }

  if (closeBtn)  closeBtn.addEventListener('click',  closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click',  closeModal);

  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') closeModal();
  });

  // ---- Stats ----
  function loadStats() {
    fetch('/api/stats', { headers: { 'X-User-Role': 'admin' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (statProducts) statProducts.textContent = d.products;
        if (statUsers)    statUsers.textContent    = d.users;
      })
      .catch(function () {});
  }

  // ---- Product list ----
  function renderProductList(products) {
    if (!listEl) return;
    if (products.length === 0) {
      listEl.innerHTML = '<p class="admin-loading">No products yet. Add one using the form.</p>';
      return;
    }

    listEl.innerHTML = '';

    products.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'admin-product-row';
      row.setAttribute('data-testid', 'admin-product-row-' + p.id);

      // Thumbnail
      var thumb = document.createElement('img');
      thumb.src = p.image;
      thumb.alt = p.name;
      thumb.className = 'admin-product-thumb';
      thumb.onerror = function () { thumb.style.opacity = '0.3'; };

      // Info
      var info = document.createElement('div');
      info.className = 'admin-product-info';

      var nameEl = document.createElement('p');
      nameEl.className = 'admin-product-name';
      nameEl.textContent = p.name;

      var meta = document.createElement('p');
      meta.className = 'admin-product-meta';
      var stockLabel = '';
      if (p.stock === 0) {
        stockLabel = ' · 🚫 Sold Out';
      } else if (p.stock > 0 && p.stock < 10) {
        stockLabel = ' · ⚠️ Stock: ' + p.stock + ' left';
      } else if (p.stock >= 10) {
        stockLabel = ' · Stock: ' + p.stock;
      }
      meta.textContent = '₹' + p.price.toLocaleString('en-IN') + ' · ' + p.category + stockLabel;

      info.appendChild(nameEl);
      info.appendChild(meta);

      // Action buttons
      var actions = document.createElement('div');
      actions.className = 'admin-row-actions';

      // Edit button
      var editBtn = document.createElement('button');
      editBtn.className = 'admin-edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('data-testid', 'button-edit-product-' + p.id);
      editBtn.addEventListener('click', function () { openEditModal(p); });

      // Delete button (with inline confirm state)
      var delBtn = document.createElement('button');
      delBtn.className = 'admin-delete-btn';
      delBtn.textContent = 'Delete';
      delBtn.setAttribute('data-testid', 'button-delete-product-' + p.id);

      var confirmWrap = document.createElement('div');
      confirmWrap.className = 'admin-confirm-wrap';
      confirmWrap.style.display = 'none';

      var confirmLabel = document.createElement('span');
      confirmLabel.className = 'admin-confirm-label';
      confirmLabel.textContent = 'Delete?';

      var confirmYes = document.createElement('button');
      confirmYes.className = 'admin-confirm-yes';
      confirmYes.textContent = 'Yes';
      confirmYes.setAttribute('data-testid', 'button-confirm-delete-' + p.id);

      var confirmNo = document.createElement('button');
      confirmNo.className = 'admin-confirm-no';
      confirmNo.textContent = 'Cancel';

      confirmWrap.appendChild(confirmLabel);
      confirmWrap.appendChild(confirmYes);
      confirmWrap.appendChild(confirmNo);

      delBtn.addEventListener('click', function () {
        delBtn.style.display = 'none';
        confirmWrap.style.display = 'flex';
      });

      confirmNo.addEventListener('click', function () {
        confirmWrap.style.display = 'none';
        delBtn.style.display = '';
      });

      confirmYes.addEventListener('click', function () {
        confirmYes.disabled = true;
        confirmYes.textContent = '…';
        fetch('/api/products/' + p.id, {
          method: 'DELETE',
          headers: { 'X-User-Role': 'admin' }
        })
          .then(function (r) { return r.json(); })
          .then(function () {
            showToast('"' + p.name + '" deleted.', false);
            loadProducts();
            loadStats();
          })
          .catch(function () {
            showToast('Delete failed. Please try again.', true);
            confirmWrap.style.display = 'none';
            delBtn.style.display = '';
          });
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      actions.appendChild(confirmWrap);

      row.appendChild(thumb);
      row.appendChild(info);
      row.appendChild(actions);
      listEl.appendChild(row);
    });
  }

  function loadProducts() {
    if (!listEl) return;
    listEl.innerHTML = '<p class="admin-loading">Loading products…</p>';
    fetch('/api/products')
      .then(function (r) { return r.json(); })
      .then(function (data) { renderProductList(data); })
      .catch(function () {
        listEl.innerHTML = '<p class="admin-loading">Failed to load products.</p>';
      });
  }

  // ---- Add Product ----
  if (addForm) {
    addForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name     = document.getElementById('prod-name').value.trim();
      var price    = document.getElementById('prod-price').value.trim();
      var image    = document.getElementById('prod-image').value.trim();
      var category = document.getElementById('prod-category').value;
      var sizes    = (document.getElementById('prod-sizes')  && document.getElementById('prod-sizes').value.trim())  || 'S,M,L,XL';
      var colors   = (document.getElementById('prod-colors') && document.getElementById('prod-colors').value.trim()) || 'Black,White,Pink';
      var stockEl  = document.getElementById('prod-stock');
      var stock    = stockEl && stockEl.value !== '' ? parseInt(stockEl.value) : -1;

      if (!name || !price || !image) {
        showFormMsg('Please fill in all fields.', true);
        return;
      }

      addSubmitBtn.disabled = true;
      addSubmitBtn.textContent = 'Adding…';

      fetch('/api/products', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ name: name, price: parseInt(price), image: image, category: category, sizes: sizes, colors: colors, stock: stock })
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (result) {
          if (result.ok) {
            showFormMsg('"' + result.data.product.name + '" added successfully!', false);
            addForm.reset();
            var prevWrap = document.getElementById('add-image-preview-wrap');
            if (prevWrap) prevWrap.style.display = 'none';
            loadProducts();
            loadStats();
          } else {
            showFormMsg(result.data.error || 'Failed to add product.', true);
          }
        })
        .catch(function () { showFormMsg('Network error. Please try again.', true); })
        .finally(function () {
          addSubmitBtn.disabled = false;
          addSubmitBtn.textContent = 'Add Product';
        });
    });
  }

  // ---- Edit Product (modal submit) ----
  if (editForm) {
    editForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var id       = document.getElementById('edit-prod-id').value;
      var name     = document.getElementById('edit-prod-name').value.trim();
      var price    = document.getElementById('edit-prod-price').value.trim();
      var image    = document.getElementById('edit-prod-image').value.trim();
      var category = document.getElementById('edit-prod-category').value;
      var sizes    = (document.getElementById('edit-prod-sizes')  && document.getElementById('edit-prod-sizes').value.trim())  || 'S,M,L,XL';
      var colors   = (document.getElementById('edit-prod-colors') && document.getElementById('edit-prod-colors').value.trim()) || 'Black,White,Pink';
      var editStockEl = document.getElementById('edit-prod-stock');
      var editStock   = editStockEl && editStockEl.value !== '' ? parseInt(editStockEl.value) : -1;

      if (!name || !price || !image) {
        showEditMsg('Please fill in all fields.', true);
        return;
      }

      editSubmitBtn.disabled = true;
      editSubmitBtn.textContent = 'Saving…';

      fetch('/api/products/' + id, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ name: name, price: parseInt(price), image: image, category: category, sizes: sizes, colors: colors, stock: editStock })
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (result) {
          if (result.ok) {
            closeModal();
            showToast('"' + result.data.product.name + '" updated successfully!', false);
            loadProducts();
            loadStats();
          } else {
            showEditMsg(result.data.error || 'Failed to update product.', true);
          }
        })
        .catch(function () { showEditMsg('Network error. Please try again.', true); })
        .finally(function () {
          editSubmitBtn.disabled = false;
          editSubmitBtn.textContent = 'Save Changes';
        });
    });
  }

  // ---- Orders list ----
  var ordersListEl   = document.getElementById('admin-orders-list');
  var ordersBadgeEl  = document.getElementById('orders-count-badge');

  function formatDate(ts) {
    if (!ts) return '—';
    var d = new Date(ts.replace(' ', 'T') + 'Z');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
           ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function renderOrders(orders) {
    if (!ordersListEl) return;
    if (ordersBadgeEl) {
      ordersBadgeEl.textContent = orders.length + (orders.length === 1 ? ' order' : ' orders');
    }
    if (orders.length === 0) {
      ordersListEl.innerHTML = '<p class="admin-loading">No orders placed yet.</p>';
      return;
    }
    var table = document.createElement('table');
    table.className = 'orders-table';
    table.setAttribute('data-testid', 'orders-table');
    table.innerHTML =
      '<thead><tr>' +
        '<th>Order ID</th>' +
        '<th>Username</th>' +
        '<th>Items</th>' +
        '<th>Total</th>' +
        '<th>Date</th>' +
      '</tr></thead>';
    var tbody = document.createElement('tbody');
    orders.forEach(function (o) {
      var itemNames = Array.isArray(o.items)
        ? o.items.map(function (i) { return i.name; }).join(', ')
        : '—';
      var tr = document.createElement('tr');
      tr.setAttribute('data-testid', 'order-row-' + o.id);
      tr.innerHTML =
        '<td data-testid="text-order-id-' + o.id + '">#' + o.id + '</td>' +
        '<td data-testid="text-order-user-' + o.id + '">' + o.username + '</td>' +
        '<td class="orders-items-cell" data-testid="text-order-items-' + o.id + '">' + itemNames + '</td>' +
        '<td data-testid="text-order-total-' + o.id + '">₹' + o.total.toLocaleString('en-IN') + '</td>' +
        '<td data-testid="text-order-date-' + o.id + '">' + formatDate(o.created_at) + '</td>';
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    ordersListEl.innerHTML = '';
    ordersListEl.appendChild(table);
  }

  function loadOrders() {
    if (!ordersListEl) return;
    fetch('/api/orders', { headers: { 'X-User-Role': 'admin' } })
      .then(function (r) { return r.json(); })
      .then(function (data) { renderOrders(data); })
      .catch(function () {
        if (ordersListEl) ordersListEl.innerHTML = '<p class="admin-loading">Failed to load orders.</p>';
      });
  }

  loadStats();
  loadProducts();
  loadOrders();
})();


// ===========================
// PRODUCT DETAIL PAGE
// ===========================
(function () {
  if (window.location.pathname !== '/product') return;

  var COLOR_MAP = {
    black: '#1a1a1a', white: '#f2f2f2', pink: '#D8A7B1', red: '#c0392b',
    blue: '#4a90d9', navy: '#1a237e', green: '#27ae60', yellow: '#f1c40f',
    orange: '#e67e22', brown: '#795548', tan: '#D2B48C', grey: '#9e9e9e',
    gray: '#9e9e9e', beige: '#f5f0e8', purple: '#8e44ad', gold: '#d4a017',
    silver: '#bdc3c7', cream: '#f8f5f0', maroon: '#6D2E46', olive: '#808000'
  };

  var loadingEl = document.getElementById('pd-loading');
  var errorEl   = document.getElementById('pd-error');
  var contentEl = document.getElementById('pd-content');

  var selectedSize  = null;
  var selectedColor = null;
  var selectedRating = 0;

  /* ---- Recently Viewed helpers ---- */
  function getRecentlyViewed() {
    try { return JSON.parse(localStorage.getItem('veloura_recent') || '[]'); } catch (e) { return []; }
  }
  function saveRecentlyViewed(product) {
    var list = getRecentlyViewed().filter(function (p) { return p.id !== product.id; });
    list.unshift({ id: product.id, name: product.name, price: product.price, image: product.image, category: product.category });
    if (list.length > 8) list = list.slice(0, 8);
    try { localStorage.setItem('veloura_recent', JSON.stringify(list)); } catch (e) {}
  }

  /* ---- Stars helpers ---- */
  function renderStars(rating, container, size) {
    container.innerHTML = '';
    var full = Math.floor(rating);
    var half = rating - full >= 0.4;
    for (var i = 1; i <= 5; i++) {
      var s = document.createElement('span');
      s.className = 'pd-star' + (size === 'big' ? ' pd-star--big' : '');
      if (i <= full) { s.classList.add('pd-star--full'); s.textContent = '★'; }
      else if (i === full + 1 && half) { s.classList.add('pd-star--half'); s.textContent = '★'; }
      else { s.classList.add('pd-star--empty'); s.textContent = '★'; }
      container.appendChild(s);
    }
  }

  /* ---- Product card builder ---- */
  function buildProductCard(p) {
    var card = document.createElement('a');
    card.href = '/product?id=' + p.id;
    card.className = 'pd-extra-card';
    card.setAttribute('data-testid', 'card-similar-' + p.id);
    card.innerHTML =
      '<div class="pd-extra-card-img"><img src="' + p.image + '" alt="' + p.name + '" loading="lazy" /></div>' +
      '<div class="pd-extra-card-info">' +
        '<p class="pd-extra-card-cat">' + p.category + '</p>' +
        '<p class="pd-extra-card-name">' + p.name + '</p>' +
        '<p class="pd-extra-card-price">' + formatPrice(p.price) + '</p>' +
      '</div>';
    return card;
  }

  /* ---- Description generator ---- */
  function getDescription(product) {
    /* Use stored description from database first */
    if (product.description && product.description.trim()) {
      return product.description.trim();
    }
    var cat  = (product.category || '').toLowerCase();
    var name = (product.name || '').toLowerCase();
    if (cat === 'kurthi' || cat === 'kurtis') {
      if (name.indexOf('anarkali') !== -1) {
        return 'A beautifully crafted Anarkali suit that blends traditional elegance with contemporary fashion. The flowing silhouette and intricate detailing make this an ideal choice for festive occasions, celebrations, and formal gatherings.';
      } else if (name.indexOf('churidhar') !== -1) {
        return 'A graceful churidhar set crafted for the woman who appreciates timeless ethnic fashion. Premium fabric and careful tailoring ensure a comfortable yet stylish look perfect for both everyday wear and special occasions.';
      } else if (name.indexOf('formal') !== -1) {
        return 'A sophisticated formal kurta designed for the modern professional. Clean lines, premium fabric and subtle detailing create a polished look that transitions effortlessly from the office to after-work events.';
      } else if (name.indexOf('crop') !== -1) {
        return 'A trendy crop top that adds contemporary flair to your ethnic wardrobe. The versatile design pairs beautifully with high-waisted palazzos, skirts, or jeans for a fashion-forward look.';
      } else {
        return 'A beautifully crafted kurti that celebrates the artistry of Indian ethnic wear. Premium fabric, meticulous stitching and thoughtful design make this a versatile piece suited for everyday occasions and festive celebrations alike.';
      }
    } else if (cat === 'women') {
      return 'Crafted for the modern woman, the ' + product.name + ' is designed to blend effortless elegance with everyday comfort. Each piece is thoughtfully tailored to celebrate your unique style, featuring refined silhouettes and premium construction that stand the test of time.';
    } else if (cat === 'men') {
      return 'The ' + product.name + ' epitomises contemporary menswear — clean lines, quality craftsmanship and a versatile aesthetic that transitions seamlessly from day to evening. Designed for the discerning man who values both style and substance.';
    } else {
      return 'The ' + product.name + ' is a statement accessory that elevates any ensemble. Crafted from premium materials with meticulous attention to detail, it pairs beautifully with both casual and formal looks, making it an indispensable addition to your collection.';
    }
  }

  function getBullets(product) {
    var cat  = (product.category || '').toLowerCase();
    var name = (product.name || '').toLowerCase();
    if (cat === 'kurthi' || cat === 'kurtis') {
      if (name.indexOf('anarkali') !== -1) {
        return ['Graceful floor-length flare for a regal silhouette', 'Premium fabric with rich embroidery or print detailing', 'Available in vibrant festive colours', 'Includes matching churidar and dupatta'];
      } else if (name.indexOf('churidhar') !== -1) {
        return ['Classic churidhar silhouette with a contemporary touch', 'Soft, breathable fabric for all-day comfort', 'Comes complete with matching dupatta', 'Available in a range of festive and everyday colours'];
      } else if (name.indexOf('formal') !== -1) {
        return ['Clean lines for a professional, polished look', 'Wrinkle-resistant fabric maintains shape all day', 'Subtle detailing suitable for corporate environments', 'Versatile styling — pair with trousers or churidar'];
      } else if (name.indexOf('crop') !== -1) {
        return ['Trendy cropped silhouette for a modern look', 'Lightweight fabric ideal for warm weather', 'Versatile — pairs with jeans, skirts, or palazzos', 'Available in vibrant prints and solid colours'];
      } else {
        return ['Flattering ethnic silhouette with thoughtful tailoring', 'Premium breathable fabric for all-day comfort', 'Available in multiple colours and prints', 'Versatile — style for casual or festive occasions'];
      }
    } else if (cat === 'women') {
      return ['Flattering silhouette with a relaxed, elegant drape', 'Premium breathable fabric for all-day comfort', 'Available in multiple colors to suit every occasion', 'Versatile design — dress up or down effortlessly'];
    } else if (cat === 'men') {
      return ['Tailored fit with premium fabric construction', 'Breathable and comfortable for all-day wear', 'Versatile colourways suitable for office and casual settings', 'Durable stitching and quality finishing'];
    } else {
      return ['Handcrafted with premium materials', 'Timeless design that complements any outfit', 'Sturdy hardware and quality closures', 'Spacious interior with thoughtful organisation'];
    }
  }

  function showError() {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl)   errorEl.style.display   = 'block';
  }

  function getColorCss(name) {
    return COLOR_MAP[name.toLowerCase()] || '#a0a0a0';
  }

  function updateTitle(product) {
    document.title = product.name + ' — Veloura';
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', product.name + ' — ' + formatPrice(product.price));
  }

  /* ---- Gallery ---- */
  function setMainPreview(url, isVideo) {
    var imgEl   = document.getElementById('pd-main-img');
    var videoEl = document.getElementById('pd-main-video');
    if (!imgEl || !videoEl) return;

    if (isVideo) {
      imgEl.style.display   = 'none';
      videoEl.style.display = 'block';
      videoEl.src = url;
      videoEl.play().catch(function () {});
    } else {
      videoEl.pause();
      videoEl.style.display = 'none';
      imgEl.style.display   = 'block';
      imgEl.src = url;
    }

    // highlight active thumbnail
    document.querySelectorAll('.pd-thumb-item').forEach(function (t) {
      t.classList.toggle('active', t.dataset.url === url && !isVideo);
      if (isVideo) t.classList.remove('active');
    });
    var vThumb = document.querySelector('.pd-thumb-item--video');
    if (vThumb) vThumb.classList.toggle('active', isVideo);
  }

  function parseImages(product) {
    /* Returns { colorKey: [url, url, ...] } or null */
    if (!product.images) return null;
    try {
      var parsed = typeof product.images === 'string'
        ? JSON.parse(product.images)
        : product.images;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (e) {}
    return null;
  }

  function getImagesForColor(imagesMap, color) {
    if (!imagesMap || !color) return null;
    /* case-insensitive key match */
    var keys = Object.keys(imagesMap);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === color.toLowerCase()) return imagesMap[keys[i]];
    }
    return null;
  }

  function renderGallery(product, color) {
    var thumbsEl = document.getElementById('pd-thumbnails');
    if (!thumbsEl) return;
    thumbsEl.innerHTML = '';

    var imagesMap = parseImages(product);
    var imageUrls = [];

    if (imagesMap && color) {
      imageUrls = getImagesForColor(imagesMap, color) || [product.image];
    } else if (imagesMap) {
      /* No color selected — show first available group */
      var firstKey = Object.keys(imagesMap)[0];
      imageUrls = firstKey ? imagesMap[firstKey] : [product.image];
    } else {
      imageUrls = [product.image];
    }

    /* Normalise to array — images map may store a plain string URL */
    if (typeof imageUrls === 'string') imageUrls = [imageUrls];
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) imageUrls = [product.image];

    imageUrls.forEach(function (url, idx) {
      var thumb = document.createElement('button');
      thumb.className = 'pd-thumb-item' + (idx === 0 ? ' active' : '');
      thumb.dataset.url = url;
      thumb.setAttribute('aria-label', 'View image ' + (idx + 1));
      thumb.setAttribute('data-testid', 'thumb-img-' + idx);

      var img = document.createElement('img');
      img.src = url;
      img.alt = 'Thumbnail ' + (idx + 1);
      img.loading = 'lazy';
      thumb.appendChild(img);

      thumb.addEventListener('click', function () { setMainPreview(url, false); });
      thumbsEl.appendChild(thumb);
    });

    /* Video thumbnail */
    if (product.video) {
      var vThumb = document.createElement('button');
      vThumb.className = 'pd-thumb-item pd-thumb-item--video';
      vThumb.setAttribute('aria-label', 'Play product video');
      vThumb.setAttribute('data-testid', 'thumb-video');
      vThumb.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      vThumb.addEventListener('click', function () { setMainPreview(product.video, true); });
      thumbsEl.appendChild(vThumb);
    }

    /* Set first image as main preview */
    setMainPreview(imageUrls[0], false);
  }

  function renderProduct(product) {
    if (loadingEl) loadingEl.style.display = 'none';

    document.getElementById('pd-main-img').src = product.image;
    document.getElementById('pd-main-img').alt = product.name;
    document.getElementById('pd-name').textContent  = product.name;
    document.getElementById('pd-price').textContent = formatPrice(product.price);
    document.getElementById('pd-category-badge').textContent = product.category;
    document.getElementById('pd-meta-category').textContent  = product.category;
    document.getElementById('pd-meta-sku').textContent = 'ATL-' + String(product.id).padStart(4, '0');

    /* Availability */
    var availEl   = document.getElementById('pd-availability');
    var addBtn    = document.getElementById('pd-add-btn');
    var isSoldOut = (product.stock === 0);
    var isLimited = (product.stock > 0 && product.stock < 10);

    if (availEl) {
      availEl.className = 'pd-meta-val';
      if (isSoldOut) {
        availEl.textContent = 'Sold Out';
        availEl.classList.add('pd-out-of-stock');
      } else if (isLimited) {
        availEl.textContent = 'Limited — only ' + product.stock + ' left';
        availEl.classList.add('pd-low-stock');
      } else {
        availEl.textContent = 'In Stock';
        availEl.classList.add('pd-in-stock');
      }
    }

    if (addBtn) {
      if (isSoldOut) {
        addBtn.disabled = true;
        addBtn.textContent = 'Sold Out';
        addBtn.classList.add('pd-add-btn--soldout');
      } else {
        addBtn.disabled = false;
        addBtn.classList.remove('pd-add-btn--soldout');
      }
    }

    updateTitle(product);

    /* Render initial gallery (no color selected) */
    renderGallery(product, null);

    // Sizes
    var sizeContainer = document.getElementById('pd-size-btns');
    var sizes = (product.sizes || 'S,M,L,XL').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    sizeContainer.innerHTML = '';
    sizes.forEach(function (size) {
      var btn = document.createElement('button');
      btn.className = 'pd-size-btn';
      btn.textContent = size;
      btn.setAttribute('data-testid', 'size-btn-' + size);
      btn.addEventListener('click', function () {
        sizeContainer.querySelectorAll('.pd-size-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selectedSize = size;
        document.getElementById('pd-selected-size').textContent = size;
        document.getElementById('pd-validation-msg').style.display = 'none';
      });
      sizeContainer.appendChild(btn);
    });

    // Colors
    var colorContainer = document.getElementById('pd-color-btns');
    var colors = (product.colors || 'Black,White,Pink').split(',').map(function (c) { return c.trim(); }).filter(Boolean);
    colorContainer.innerHTML = '';
    colors.forEach(function (color) {
      var btn = document.createElement('button');
      btn.className = 'pd-color-btn';
      btn.setAttribute('aria-label', color);
      btn.setAttribute('title', color);
      btn.setAttribute('data-testid', 'color-btn-' + color);
      btn.style.background = getColorCss(color);
      if (color.toLowerCase() === 'white' || color.toLowerCase() === 'cream') {
        btn.style.border = '2px solid rgba(43,43,43,0.2)';
      }
      btn.addEventListener('click', function () {
        colorContainer.querySelectorAll('.pd-color-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selectedColor = color;
        document.getElementById('pd-selected-color').textContent = color;
        document.getElementById('pd-validation-msg').style.display = 'none';
        /* Update gallery for selected color */
        renderGallery(product, color);
      });
      colorContainer.appendChild(btn);
    });

    // Add to Cart
    var addBtn = document.getElementById('pd-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        if (!selectedSize || !selectedColor) {
          document.getElementById('pd-validation-msg').style.display = 'block';
          return;
        }
        var currentImg = document.getElementById('pd-main-img').src;
        addToCart({
          id: product.id,
          name: product.name,
          price: product.price,
          image: currentImg || product.image,
          size: selectedSize,
          color: selectedColor
        });
        updateCartCount();
        showToast(product.name + ' (' + selectedSize + ', ' + selectedColor + ') added to cart');
      });
    }

    // Wishlist heart icon
    var wishBtn = document.getElementById('pd-wish-btn');
    function updateWishIcon() {
      var inWish = isInWishlist(product.id);
      if (wishBtn) {
        wishBtn.classList.toggle('active', inWish);
        wishBtn.setAttribute('aria-label', inWish ? 'Remove from wishlist' : 'Save to wishlist');
      }
    }
    updateWishIcon();
    if (wishBtn) {
      wishBtn.addEventListener('click', function () {
        toggleWishlist({ id: product.id, name: product.name, price: product.price, image: product.image });
        updateWishlistCount();
        updateWishIcon();
        showToast(isInWishlist(product.id) ? product.name + ' saved to wishlist' : product.name + ' removed from wishlist');
      });
    }

    // Buy Now button
    var buyBtn = document.getElementById('pd-buy-btn');
    if (buyBtn) {
      buyBtn.addEventListener('click', function () {
        if (!selectedSize || !selectedColor) {
          document.getElementById('pd-validation-msg').style.display = 'block';
          return;
        }
        var currentImg = document.getElementById('pd-main-img').src;
        addToCart({
          id: product.id,
          name: product.name,
          price: product.price,
          image: currentImg || product.image,
          size: selectedSize,
          color: selectedColor
        });
        updateCartCount();
        window.location.href = '/cart';
      });
    }

    contentEl.style.display = 'grid';

    /* ---- Tabs section ---- */
    var tabsSection = document.getElementById('pd-tabs-section');
    if (tabsSection) {
      tabsSection.style.display = 'block';
      document.getElementById('pd-description-text').textContent = getDescription(product);
      var bulletsEl = document.getElementById('pd-detail-bullets');
      bulletsEl.innerHTML = '';
      getBullets(product).forEach(function (b) {
        var li = document.createElement('li'); li.textContent = b; bulletsEl.appendChild(li);
      });
      tabsSection.querySelectorAll('.pd-tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          tabsSection.querySelectorAll('.pd-tab-btn').forEach(function (b) { b.classList.remove('active'); });
          tabsSection.querySelectorAll('.pd-tab-panel').forEach(function (p) { p.classList.remove('active'); });
          btn.classList.add('active');
          var panel = document.getElementById('tab-panel-' + btn.dataset.tab);
          if (panel) panel.classList.add('active');
        });
      });
    }

    /* ---- Reviews section ---- */
    var reviewsSection = document.getElementById('pd-reviews-section');
    if (reviewsSection) reviewsSection.style.display = 'block';
    loadAndRenderReviews(product.id);
    setupReviewForm(product.id);

    /* ---- Recently viewed ---- */
    saveRecentlyViewed(product);
    renderRecentlyViewed(product.id);
  }

  /* ---- Reviews ---- */
  function loadAndRenderReviews(productId) {
    fetch('/api/reviews?product_id=' + productId)
      .then(function (r) { return r.json(); })
      .then(function (reviews) { renderReviews(reviews, productId); })
      .catch(function () {});
  }

  function renderReviews(reviews, productId) {
    var listEl   = document.getElementById('pd-reviews-list');
    var noEl     = document.getElementById('pd-no-reviews');
    var avgEl    = document.getElementById('pd-avg-rating');
    var avgStars = document.getElementById('pd-avg-stars');
    var countEl  = document.getElementById('pd-review-count');
    var barsEl   = document.getElementById('pd-rating-bars');
    var starsDisp = document.getElementById('pd-stars-display');
    var ratingText = document.getElementById('pd-rating-text');

    /* Compute stats */
    var total = reviews.length;
    var sum   = reviews.reduce(function (acc, r) { return acc + r.rating; }, 0);
    var avg   = total > 0 ? (sum / total) : 0;
    var counts = [0, 0, 0, 0, 0]; // index 0 = 1 star
    reviews.forEach(function (r) { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++; });

    /* Header rating summary */
    if (starsDisp) renderStars(avg, starsDisp, '');
    if (ratingText) ratingText.textContent = total > 0 ? avg.toFixed(1) + ' / 5 (' + total + ' review' + (total !== 1 ? 's' : '') + ')' : 'No reviews yet';

    /* Overview panel */
    if (avgEl)   avgEl.textContent  = total > 0 ? avg.toFixed(1) : '—';
    if (avgStars) renderStars(avg, avgStars, 'big');
    if (countEl) countEl.textContent = total + ' review' + (total !== 1 ? 's' : '');

    /* Rating bars */
    if (barsEl) {
      barsEl.innerHTML = '';
      for (var s = 5; s >= 1; s--) {
        var cnt = counts[s - 1];
        var pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
        var row = document.createElement('div');
        row.className = 'pd-bar-row';
        row.innerHTML =
          '<span class="pd-bar-label">' + s + '★</span>' +
          '<div class="pd-bar-track"><div class="pd-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<span class="pd-bar-count">' + cnt + '</span>';
        barsEl.appendChild(row);
      }
    }

    /* Reviews list */
    if (listEl) {
      /* Remove previous review cards but keep no-reviews msg */
      Array.from(listEl.querySelectorAll('.pd-review-card')).forEach(function (el) { el.remove(); });

      if (total === 0) {
        if (noEl) noEl.style.display = 'block';
      } else {
        if (noEl) noEl.style.display = 'none';
        reviews.forEach(function (rev) {
          var card = document.createElement('div');
          card.className = 'pd-review-card';
          card.setAttribute('data-testid', 'review-card-' + rev.id);
          var starsHtml = '';
          for (var i = 1; i <= 5; i++) {
            starsHtml += '<span class="pd-star ' + (i <= rev.rating ? 'pd-star--full' : 'pd-star--empty') + '">★</span>';
          }
          var date = rev.created_at ? rev.created_at.split(' ')[0] : '';
          var imgHtml = rev.image_url
            ? '<div class="pd-review-img"><img src="' + rev.image_url + '" alt="Customer photo" loading="lazy" data-testid="img-review-' + rev.id + '" /></div>'
            : '';
          card.innerHTML =
            '<div class="pd-review-top">' +
              '<div class="pd-review-meta">' +
                '<span class="pd-review-author" data-testid="text-review-author-' + rev.id + '">' + rev.username + '</span>' +
                '<span class="pd-review-date" data-testid="text-review-date-' + rev.id + '">' + date + '</span>' +
              '</div>' +
              '<div class="pd-review-stars" data-testid="stars-review-' + rev.id + '">' + starsHtml + '</div>' +
            '</div>' +
            (rev.comment ? '<p class="pd-review-comment" data-testid="text-review-comment-' + rev.id + '">' + rev.comment + '</p>' : '') +
            imgHtml;
          listEl.appendChild(card);
        });
      }
    }
  }

  function setupReviewForm(productId) {
    var form     = document.getElementById('pd-review-form');
    var starPicks = document.querySelectorAll('.pd-star-pick');
    var errorEl  = document.getElementById('pd-review-error');

    /* Star picker interaction */
    starPicks.forEach(function (btn) {
      btn.addEventListener('mouseenter', function () {
        var val = parseInt(btn.dataset.val);
        starPicks.forEach(function (b) {
          b.classList.toggle('hovered', parseInt(b.dataset.val) <= val);
        });
      });
      btn.addEventListener('mouseleave', function () {
        starPicks.forEach(function (b) { b.classList.remove('hovered'); });
      });
      btn.addEventListener('click', function () {
        selectedRating = parseInt(btn.dataset.val);
        starPicks.forEach(function (b) {
          b.classList.toggle('selected', parseInt(b.dataset.val) <= selectedRating);
        });
      });
    });

    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name    = (document.getElementById('review-name').value || '').trim() || 'Anonymous';
      var comment = (document.getElementById('review-comment').value || '').trim();
      var imgUrl  = (document.getElementById('review-image-url').value || '').trim();

      if (errorEl) errorEl.style.display = 'none';

      if (!selectedRating) {
        if (errorEl) { errorEl.textContent = 'Please select a star rating.'; errorEl.style.display = 'block'; }
        return;
      }

      var payload = { product_id: productId, username: name, rating: selectedRating, comment: comment, image_url: imgUrl || null };
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function (r) { return r.json(); })
      .then(function () {
        form.reset();
        selectedRating = 0;
        starPicks.forEach(function (b) { b.classList.remove('selected', 'hovered'); });
        if (submitBtn) submitBtn.disabled = false;
        showToast('Thank you for your review!');
        loadAndRenderReviews(productId);
      })
      .catch(function () {
        if (errorEl) { errorEl.textContent = 'Failed to submit review. Please try again.'; errorEl.style.display = 'block'; }
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  /* ---- Similar & Recent ---- */
  function getSimilarityKey(product) {
    var n = (product.name || '').toLowerCase();
    if (n.indexOf('anarkali')  !== -1) return 'anarkali';
    if (n.indexOf('churidhar') !== -1) return 'churidhar';
    if (n.indexOf('formal')    !== -1) return 'formal';
    if (n.indexOf('crop')      !== -1) return 'crop';
    if (n.indexOf('kurti')     !== -1) return 'kurti';
    return (product.category || '').toLowerCase();
  }

  function renderSimilarProducts(allProducts, currentProduct) {
    var section = document.getElementById('pd-similar-section');
    var grid    = document.getElementById('pd-similar-grid');
    var viewAll = document.getElementById('pd-similar-view-all');
    if (!section || !grid) return;

    var currentKey = getSimilarityKey(currentProduct);

    /* First try to find same sub-type; fall back to same category */
    var similar = allProducts.filter(function (p) {
      return p.id !== currentProduct.id && getSimilarityKey(p) === currentKey;
    });

    if (similar.length === 0) {
      similar = allProducts.filter(function (p) {
        return p.id !== currentProduct.id &&
               (p.category || '').toLowerCase() === (currentProduct.category || '').toLowerCase();
      });
    }

    similar = similar.slice(0, 4);
    if (similar.length === 0) return;

    var catSlug = currentKey === 'anarkali'  ? 'anarkalis'  :
                  currentKey === 'churidhar' ? 'churidhars' :
                  currentKey === 'formal'    ? 'formals'    :
                  currentKey === 'crop'      ? 'crop-tops'  :
                  currentKey === 'kurti'     ? 'kurtis'     :
                  (currentProduct.category || '').toLowerCase();

    if (viewAll) viewAll.href = '/shop?category=' + encodeURIComponent(catSlug);

    grid.innerHTML = '';
    similar.forEach(function (p) { grid.appendChild(buildProductCard(p)); });
    section.style.display = 'block';
  }

  function renderRecentlyViewed(currentId) {
    var section = document.getElementById('pd-recent-section');
    var grid    = document.getElementById('pd-recent-grid');
    if (!section || !grid) return;

    var recent = getRecentlyViewed().filter(function (p) { return p.id !== currentId; }).slice(0, 4);
    if (recent.length === 0) return;

    grid.innerHTML = '';
    recent.forEach(function (p) { grid.appendChild(buildProductCard(p)); });
    section.style.display = 'block';
  }

  var params  = new URLSearchParams(window.location.search);
  var queryId = parseInt(params.get('id'), 10);

  if (!queryId) { showError(); return; }

  fetch('/api/products')
    .then(function (r) { return r.json(); })
    .then(function (products) {
      var product = products.find(function (p) { return p.id === queryId; });
      if (!product) { showError(); return; }
      renderProduct(product);
      renderSimilarProducts(products, product);
    })
    .catch(function () { showError(); });
})();


// ===========================
// SHOP PAGE
// ===========================
(function () {
  if (window.location.pathname !== '/shop') return;

  var gridEl    = document.getElementById('shop-grid');
  var emptyEl   = document.getElementById('shop-empty');
  var countEl   = document.getElementById('shop-count');
  var colorPillsEl = document.getElementById('shop-color-pills');
  if (!gridEl) return;

  var COLOR_MAP = {
    black: '#1a1a1a', white: '#f2f2f2', pink: '#D8A7B1', red: '#c0392b',
    blue: '#4a90d9', navy: '#1a237e', green: '#27ae60', yellow: '#f1c40f',
    orange: '#e67e22', brown: '#795548', tan: '#D2B48C', grey: '#9e9e9e',
    gray: '#9e9e9e', beige: '#f5f0e8', purple: '#8e44ad', gold: '#d4a017',
    silver: '#bdc3c7', cream: '#f8f5f0', maroon: '#6D2E46', olive: '#808000'
  };

  function getColorCss(name) {
    return COLOR_MAP[name.toLowerCase()] || '#a0a0a0';
  }

  var params       = new URLSearchParams(window.location.search);
  var urlCategory  = (params.get('category') || 'kurtis').toLowerCase().trim();
  var urlSearch    = (params.get('search') || '').trim();
  var activeColor  = null;

  /* ---- Smart search helpers ---- */

  /* Map singular/variant forms to canonical values */
  var SYNONYMS = {
    'woman': 'women', 'womens': 'women', 'girl': 'women', 'girls': 'women', 'female': 'women',
    'man': 'men', 'mens': 'men', 'guy': 'men', 'guys': 'men', 'male': 'men',
    'accessory': 'accessories',
    'shirts': 'shirt', 'tshirt': 'shirt', 'tshirts': 'shirt', 't-shirt': 'shirt', 't-shirts': 'shirt', 'tee': 'shirt', 'tees': 'shirt',
    'tops': 'top', 'blouses': 'blouse', 'blouse': 'top',
    'trousers': 'pant', 'pants': 'pant', 'jeans': 'jean',
    'dresses': 'dress', 'gowns': 'gown', 'skirts': 'skirt',
    'jackets': 'jacket', 'coats': 'coat', 'sweaters': 'sweater',
    'kurtas': 'kurta', 'sarees': 'saree', 'saris': 'saree',
    'kurtis': 'kurti', 'kurti': 'kurti', 'kurthi': 'kurti', 'kurthis': 'kurti',
    'anarkalis': 'anarkali', 'anarkali': 'anarkali',
    'churidhars': 'churidhar', 'churidhar': 'churidhar', 'churidar': 'churidhar', 'churidars': 'churidhar',
    'formals': 'formal', 'formal': 'formal',
    'shoes': 'shoe', 'sneakers': 'sneaker', 'sandals': 'sandal', 'heels': 'heel',
    'bags': 'bag', 'purses': 'purse', 'handbags': 'bag',
    'watches': 'watch', 'jewellery': 'jewelry', 'jewel': 'jewelry', 'necklaces': 'necklace'
  };

  /* Known categories — matched exactly so "men" never hits "women" */
  var CATEGORY_TOKENS = { 'men': true, 'women': true, 'accessories': true };

  /* Clothing-type URL slugs → keyword to match in product name */
  var CLOTHING_CAT_MAP = {
    'kurtis': 'kurti', 'anarkalis': 'anarkali', 'crop-tops': 'crop',
    'churidhars': 'churidhar', 'formals': 'formal'
  };

  function normalizeToken(tok) {
    return SYNONYMS[tok] || tok;
  }

  function tokenize(query) {
    return query.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map(normalizeToken);
  }

  /* Word-boundary safe check: tok must appear as a whole word in text */
  function wordMatch(text, tok) {
    var re = new RegExp('(?:^|[^a-z])' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:[^a-z]|$)');
    return re.test(text);
  }

  function smartSearch(products, query) {
    if (!query) return products;
    var tokens = tokenize(query);
    if (!tokens.length) return products;

    /* Split tokens into category vs. name/keyword buckets */
    var catTokens  = tokens.filter(function (t) { return CATEGORY_TOKENS[t]; });
    var nameTokens = tokens.filter(function (t) { return !CATEGORY_TOKENS[t]; });

    var result = products;

    /* Category filter — exact match on p.category (case-insensitive) */
    if (catTokens.length) {
      result = result.filter(function (p) {
        var pCat = (p.category || '').toLowerCase();
        return catTokens.some(function (ct) { return pCat === ct; });
      });
    }

    /* Name filter — every name token must appear (word boundary) in product name */
    if (nameTokens.length) {
      result = result.filter(function (p) {
        var pName = (p.name || '').toLowerCase();
        return nameTokens.every(function (nt) { return wordMatch(pName, nt); });
      });
    }

    /* Score for sort: more specific matches rank higher */
    var scored = result.map(function (p) {
      var score = 0;
      var pName = (p.name || '').toLowerCase();
      var pCat  = (p.category || '').toLowerCase();
      catTokens.forEach(function (ct)  { if (pCat === ct) score += 5; });
      nameTokens.forEach(function (nt) { if (wordMatch(pName, nt)) score += 3; });
      return { p: p, s: score };
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored.map(function (x) { return x.p; });
  }
  /* ---- End smart search helpers ---- */

  var catPillContainer = document.querySelector('.shop-cat-pills');
  var titleEl = document.getElementById('shop-title');
  var subEl   = document.getElementById('shop-sub');
  var eyebrowEl = document.getElementById('shop-eyebrow');
  var emptyMsgEl = document.querySelector('#shop-empty p');

  /* Pre-fill search input if search param exists */
  if (urlSearch) {
    var navInput = document.getElementById('searchInput');
    var navWrap  = document.getElementById('searchBarWrap');
    if (navInput) navInput.value = urlSearch;
    if (navWrap)  navWrap.classList.add('open');
  }

  /* Apply category from URL to pills */
  if (urlCategory && catPillContainer) {
    catPillContainer.querySelectorAll('.shop-pill--cat').forEach(function (p) {
      p.classList.toggle('active', p.dataset.cat === urlCategory);
    });
  }

  /* Update hero text */
  var catLabels = {
    women: 'Women', men: 'Men', accessories: 'Accessories', kurthi: 'Kurthi',
    kurtis: 'Kurtis', anarkalis: 'Anarkalis', churidhars: 'Churidhars',
    formals: 'Formals', 'crop-tops': 'Crop Tops'
  };
  if (urlSearch) {
    if (titleEl)   titleEl.textContent   = 'Search Results';
    if (subEl)     subEl.textContent     = 'Showing results for "' + urlSearch + '"';
    if (eyebrowEl) eyebrowEl.textContent = 'Search';
  } else if (urlCategory && catLabels[urlCategory]) {
    if (titleEl) titleEl.textContent = catLabels[urlCategory];
    if (subEl)   subEl.textContent   = 'Curated ' + catLabels[urlCategory] + ' styles just for you';
    if (eyebrowEl) eyebrowEl.textContent = catLabels[urlCategory] + ' Collection';
  }

  /* Category pill clicks */
  if (catPillContainer) {
    catPillContainer.querySelectorAll('.shop-pill--cat').forEach(function (pill) {
      pill.addEventListener('click', function () {
        var cat = pill.dataset.cat;
        var newUrl = cat === 'all' ? '/shop' : '/shop?category=' + cat;
        window.location.href = newUrl;
      });
    });
  }

  function buildColorPills(allProducts) {
    if (!colorPillsEl) return;
    var colorSet = {};
    allProducts.forEach(function (p) {
      (p.colors || '').split(',').forEach(function (c) {
        var col = c.trim();
        if (col) colorSet[col] = true;
      });
    });

    colorPillsEl.innerHTML = '';
    var allPill = document.createElement('button');
    allPill.className = 'shop-pill shop-pill--color active';
    allPill.dataset.color = 'all';
    allPill.textContent = 'All Colors';
    allPill.setAttribute('data-testid', 'pill-color-all');
    allPill.addEventListener('click', function () {
      activeColor = null;
      colorPillsEl.querySelectorAll('.shop-pill--color').forEach(function (p) { p.classList.remove('active'); });
      allPill.classList.add('active');
      renderProducts(currentProducts);
    });
    colorPillsEl.appendChild(allPill);

    Object.keys(colorSet).forEach(function (color) {
      var pill = document.createElement('button');
      pill.className = 'shop-pill shop-pill--color';
      pill.dataset.color = color;
      pill.setAttribute('data-testid', 'pill-color-' + color.toLowerCase());
      var swatch = document.createElement('span');
      swatch.className = 'shop-color-swatch';
      swatch.style.background = getColorCss(color);
      if (color.toLowerCase() === 'white' || color.toLowerCase() === 'cream') {
        swatch.style.border = '1px solid rgba(43,43,43,0.25)';
      }
      pill.appendChild(swatch);
      pill.appendChild(document.createTextNode(color));
      pill.addEventListener('click', function () {
        activeColor = color;
        colorPillsEl.querySelectorAll('.shop-pill--color').forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');
        renderProducts(currentProducts);
      });
      colorPillsEl.appendChild(pill);
    });
  }

  var currentProducts = [];

  function getProductImage(product, color) {
    /* Try to get color-specific image from images JSON */
    if (product.images) {
      try {
        var map = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
        if (map && typeof map === 'object') {
          var keys = Object.keys(map);
          for (var i = 0; i < keys.length; i++) {
            if (keys[i].toLowerCase() === (color || '').toLowerCase()) {
              var imgs = map[keys[i]];
              if (imgs) return Array.isArray(imgs) ? imgs[0] : imgs;
            }
          }
        }
      } catch (e) {}
    }
    return product.image;
  }

  function renderProducts(products) {
    /* Smart search filter */
    var filtered = urlSearch ? smartSearch(products, urlSearch) : products;

    /* Category filter — clothing types match by product name; others match p.category */
    if (urlCategory) {
      var clothingKw = CLOTHING_CAT_MAP[urlCategory];
      if (clothingKw) {
        filtered = filtered.filter(function (p) {
          var nameLower = (p.name || '').toLowerCase();
          var catLower  = (p.category || '').toLowerCase();

          /* For kurtis: include all Kurthi category products that are NOT churidhars, formals, anarkalis, or crop tops */
          if (urlCategory === 'kurtis') {
            if (catLower === 'kurthi' || catLower === 'kurtis') {
              return nameLower.indexOf('churidhar') === -1 &&
                     nameLower.indexOf('formal')    === -1 &&
                     nameLower.indexOf('anarkali')  === -1 &&
                     nameLower.indexOf('crop')      === -1;
            }
            return nameLower.indexOf(clothingKw) !== -1;
          }

          return nameLower.indexOf(clothingKw) !== -1;
        });
      } else {
        filtered = filtered.filter(function (p) {
          return p.category.toLowerCase() === urlCategory;
        });
      }
    }

    /* Color filter */
    if (activeColor) {
      filtered = filtered.filter(function (p) {
        return (p.colors || '').split(',').some(function (c) {
          return c.trim().toLowerCase() === activeColor.toLowerCase();
        });
      });
    }

    gridEl.innerHTML = '';

    if (filtered.length === 0) {
      if (emptyEl) {
        emptyEl.style.display = 'flex';
        if (emptyMsgEl) {
          emptyMsgEl.textContent = urlSearch
            ? 'No products found for "' + urlSearch + '".'
            : 'No products available in this category.';
        }
      }
      if (countEl) countEl.textContent = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    if (countEl) countEl.textContent = filtered.length + ' product' + (filtered.length === 1 ? '' : 's') + ' found';

    filtered.forEach(function (product, idx) {
      var displayImg = getProductImage(product, activeColor);
      var isSoldOut  = (product.stock === 0);
      var isLimited  = (product.stock > 0 && product.stock < 10);

      var card = document.createElement('article');
      card.className = 'product-card' + (isSoldOut ? ' product-sold-out' : '');
      card.setAttribute('data-testid', 'shop-card-' + product.id);

      if (isLimited) {
        var stockBadge = document.createElement('span');
        stockBadge.className = 'product-stock-badge';
        stockBadge.setAttribute('data-testid', 'badge-limited-stock-' + product.id);
        stockBadge.textContent = 'Limited — only ' + product.stock + ' left';
        card.appendChild(stockBadge);
      }

      var imgWrap = document.createElement('div');
      imgWrap.className = 'product-img-wrap';

      var imgLink = document.createElement('a');
      imgLink.href = '/product?id=' + product.id;
      imgLink.className = 'product-img-link';

      var img = document.createElement('img');
      img.src = displayImg;
      img.alt = product.name;
      img.loading = 'lazy';
      img.setAttribute('data-testid', 'img-shop-product-' + product.id);
      img._product = product;

      imgLink.appendChild(img);
      imgWrap.appendChild(imgLink);

      if (isSoldOut) {
        var soldOverlay = document.createElement('div');
        soldOverlay.className = 'sold-out-overlay';
        soldOverlay.setAttribute('data-testid', 'overlay-sold-out-' + product.id);
        soldOverlay.textContent = 'Sold Out';
        imgWrap.appendChild(soldOverlay);
      }

      /* Heart btn */
      var heartBtn = document.createElement('button');
      heartBtn.className = 'product-heart-btn' + (isInWishlist(product.id) ? ' active' : '');
      heartBtn.setAttribute('aria-label', 'Toggle wishlist');
      heartBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
      heartBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleWishlist({ id: product.id, name: product.name, price: product.price, image: product.image });
        heartBtn.classList.toggle('active', isInWishlist(product.id));
        updateWishlistCount();
      });
      imgWrap.appendChild(heartBtn);

      var cardImg = img;
      var cardSelectedImg = displayImg;

      var info = document.createElement('div');
      info.className = 'product-info';

      var nameLink = document.createElement('a');
      nameLink.href = '/product?id=' + product.id;
      nameLink.className = 'product-name product-name-link';
      nameLink.textContent = product.name;

      var sizesRow = document.createElement('div');
      sizesRow.className = 'product-card-sizes';
      var cardSizes = (product.sizes || 'S,M,L,XL').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      cardSizes.forEach(function (sz) {
        var chip = document.createElement('span');
        chip.className = 'product-card-size-chip';
        chip.textContent = sz;
        chip.setAttribute('data-testid', 'size-chip-' + product.id + '-' + sz);
        sizesRow.appendChild(chip);
      });

      var price = document.createElement('p');
      price.className = 'product-price';
      price.setAttribute('data-testid', 'text-price-' + product.id);
      price.textContent = formatPrice(product.price);

      var colorsRow = document.createElement('div');
      colorsRow.className = 'product-card-colors';

      var colorLabel = document.createElement('span');
      colorLabel.className = 'product-card-color-label';
      colorLabel.textContent = '';

      var swatchesWrap = document.createElement('div');
      swatchesWrap.className = 'product-card-swatches';
      var cardColors = (product.colors || '').split(',').map(function (c) { return c.trim(); }).filter(Boolean);
      cardColors.forEach(function (col) {
        var swatch = document.createElement('button');
        swatch.className = 'product-card-color-btn';
        swatch.title = col;
        swatch.setAttribute('aria-label', 'Select color ' + col);
        swatch.setAttribute('data-testid', 'card-color-' + product.id + '-' + col.toLowerCase());
        swatch.style.background = getColorCss(col);
        if (col.toLowerCase() === 'white' || col.toLowerCase() === 'cream') {
          swatch.style.border = '2px solid rgba(43,43,43,0.3)';
        }
        swatch.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          swatchesWrap.querySelectorAll('.product-card-color-btn').forEach(function (b) { b.classList.remove('active'); });
          swatch.classList.add('active');
          colorLabel.textContent = col;
          var newImg = getProductImage(product, col);
          cardImg.src = newImg;
          cardSelectedImg = newImg;
        });
        swatchesWrap.appendChild(swatch);
      });

      colorsRow.appendChild(colorLabel);
      colorsRow.appendChild(swatchesWrap);

      var cartBtn = document.createElement('button');
      if (isSoldOut) {
        cartBtn.className = 'product-cart-btn product-cart-btn--soldout';
        cartBtn.textContent = 'Sold Out';
        cartBtn.disabled = true;
        cartBtn.setAttribute('data-testid', 'button-shop-soldout-' + product.id);
      } else {
        cartBtn.className = 'product-cart-btn';
        cartBtn.textContent = 'Add to Cart';
        cartBtn.setAttribute('data-testid', 'button-shop-add-cart-' + product.id);
        cartBtn.addEventListener('click', function () {
          addToCart({ id: product.id, name: product.name, price: product.price, image: cardSelectedImg });
          updateCartCount();
          showToast(product.name + ' added to cart');
        });
      }

      info.appendChild(nameLink);
      info.appendChild(sizesRow);
      info.appendChild(price);
      info.appendChild(colorsRow);
      info.appendChild(cartBtn);

      card.appendChild(imgWrap);
      card.appendChild(info);
      gridEl.appendChild(card);
    });
  }

  fetch('/api/products')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      currentProducts = data;
      var pillBase = data;
      if (urlSearch) {
        pillBase = smartSearch(data, urlSearch);
      } else if (urlCategory) {
        pillBase = data.filter(function (p) { return p.category.toLowerCase() === urlCategory; });
      }
      buildColorPills(pillBase);
      renderProducts(data);
    })
    .catch(function () {
      if (emptyEl) emptyEl.style.display = 'flex';
    });
})();


// ===========================
// WISHLIST HELPERS
// ===========================
function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem('wishlist')) || [];
  } catch (e) {
    return [];
  }
}

function saveWishlist(list) {
  localStorage.setItem('wishlist', JSON.stringify(list));
}

function isInWishlist(productId) {
  return getWishlist().some(function (item) { return item.id === productId; });
}

function toggleWishlist(product) {
  var list = getWishlist();
  var idx = list.findIndex(function (item) { return item.id === product.id; });
  if (idx === -1) {
    list.push(product);
  } else {
    list.splice(idx, 1);
  }
  saveWishlist(list);
}

function updateWishlistCount() {
  var el = document.getElementById('wishlistCount');
  if (el) { el.textContent = getWishlist().length; }
}

updateWishlistCount();


// ===========================
// CART HELPERS
// ===========================
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('cart')) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(product) {
  var cart = getCart();
  cart.push(product);
  saveCart(cart);
}

function formatPrice(price) {
  return '₹' + price.toLocaleString('en-IN');
}

function updateCartCount() {
  var countEl = document.getElementById('cartCount');
  if (countEl) {
    countEl.textContent = getCart().length;
  }
}

updateCartCount();


// ===========================
// PRODUCTS — FETCH & RENDER (with category filter)
// ===========================
(function () {
  var container   = document.getElementById('product-container');
  var noMsg       = document.getElementById('no-products-msg');
  var filterBar   = document.getElementById('filter-bar');
  if (!container) return;

  var allProducts    = [];
  var activeFilter   = 'all';

  function makeHeartBtn(product) {
    var heartBtn = document.createElement('button');
    heartBtn.className = 'product-heart-btn' + (isInWishlist(product.id) ? ' active' : '');
    heartBtn.setAttribute('aria-label', 'Toggle wishlist');
    heartBtn.setAttribute('data-testid', 'button-wishlist-' + product.id);
    heartBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    heartBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleWishlist({ id: product.id, name: product.name, price: product.price, image: product.image });
      heartBtn.classList.toggle('active', isInWishlist(product.id));
      updateWishlistCount();
    });
    return heartBtn;
  }

  function renderProducts(products) {
    container.innerHTML = '';

    var filtered = activeFilter === 'all'
      ? products
      : products.filter(function (p) { return p.category === activeFilter; });

    if (noMsg) {
      noMsg.style.display = filtered.length === 0 ? 'block' : 'none';
    }

    filtered.forEach(function (product, idx) {
      var isSoldOut = (product.stock === 0);
      var isLimited = (product.stock > 0 && product.stock < 10);

      var card = document.createElement('article');
      card.className = 'product-card' + (isSoldOut ? ' product-sold-out' : '');
      card.setAttribute('data-testid', 'card-product-' + product.id);

      // Badge: alternate Trending / New
      var badge = document.createElement('span');
      badge.className = 'product-badge' + (idx % 2 === 0 ? '' : ' product-badge--new');
      badge.textContent = idx % 2 === 0 ? 'Trending' : 'New';
      card.appendChild(badge);

      if (isLimited) {
        var stockBadge = document.createElement('span');
        stockBadge.className = 'product-stock-badge';
        stockBadge.setAttribute('data-testid', 'badge-limited-stock-' + product.id);
        stockBadge.textContent = 'Limited — only ' + product.stock + ' left';
        card.appendChild(stockBadge);
      }

      var imgWrap = document.createElement('div');
      imgWrap.className = 'product-img-wrap';

      var imgLink = document.createElement('a');
      imgLink.href = '/product?id=' + product.id;
      imgLink.className = 'product-img-link';
      imgLink.setAttribute('data-testid', 'link-product-' + product.id);
      imgLink.setAttribute('aria-label', 'View ' + product.name);

      var img = document.createElement('img');
      img.src = product.image;
      img.alt = product.name;
      img.loading = 'lazy';
      img.setAttribute('data-testid', 'img-product-' + product.id);

      imgLink.appendChild(img);
      imgWrap.appendChild(imgLink);

      if (isSoldOut) {
        var soldOverlay = document.createElement('div');
        soldOverlay.className = 'sold-out-overlay';
        soldOverlay.setAttribute('data-testid', 'overlay-sold-out-' + product.id);
        soldOverlay.textContent = 'Sold Out';
        imgWrap.appendChild(soldOverlay);
      }

      imgWrap.appendChild(makeHeartBtn(product));

      var info = document.createElement('div');
      info.className = 'product-info';

      var nameLink = document.createElement('a');
      nameLink.href = '/product?id=' + product.id;
      nameLink.className = 'product-name product-name-link';
      nameLink.textContent = product.name;
      nameLink.setAttribute('data-testid', 'text-product-name-' + product.id);

      var price = document.createElement('p');
      price.className = 'product-price';
      price.textContent = formatPrice(product.price);
      price.setAttribute('data-testid', 'text-product-price-' + product.id);

      var btn = document.createElement('button');
      if (isSoldOut) {
        btn.className = 'product-cart-btn product-cart-btn--soldout';
        btn.textContent = 'Sold Out';
        btn.disabled = true;
        btn.setAttribute('data-testid', 'button-soldout-' + product.id);
      } else {
        btn.className = 'product-cart-btn';
        btn.textContent = 'Add to Cart';
        btn.setAttribute('data-testid', 'button-add-to-cart-' + product.id);
        btn.addEventListener('click', function () {
          addToCart({ id: product.id, name: product.name, price: product.price, image: product.image });
          updateCartCount();
          showToast(product.name + ' added to cart');
        });
      }

      info.appendChild(nameLink);
      info.appendChild(price);
      info.appendChild(btn);

      card.appendChild(imgWrap);
      card.appendChild(info);
      container.appendChild(card);
    });
  }

  // Category filter buttons
  if (filterBar) {
    filterBar.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeFilter = btn.dataset.filter;
        filterBar.querySelectorAll('.filter-btn').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        renderProducts(allProducts);
      });
    });
  }

  fetch('/api/products')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      allProducts = data;
      renderProducts(allProducts);
    })
    .catch(function (err) { console.error('Failed to load products:', err); });
})();


// ===========================
// CART PAGE — RENDER
// ===========================
(function () {
  var itemsEl   = document.getElementById('cart-items');
  var emptyEl   = document.getElementById('cart-empty');
  var summaryEl = document.getElementById('cart-summary');
  var totalEl   = document.getElementById('cart-total');
  if (!itemsEl) return;

  function renderCart() {
    var cart = getCart();
    itemsEl.innerHTML = '';

    if (cart.length === 0) {
      emptyEl.style.display  = 'flex';
      summaryEl.style.display = 'none';
      return;
    }

    emptyEl.style.display  = 'none';
    summaryEl.style.display = 'flex';

    cart.forEach(function (item, index) {
      var row = document.createElement('div');
      row.className = 'cart-item';
      row.setAttribute('data-testid', 'cart-item-' + item.id + '-' + index);

      var img = document.createElement('img');
      img.src = item.image;
      img.alt = item.name;
      img.className = 'cart-item-img';
      img.setAttribute('data-testid', 'img-cart-item-' + index);

      var details = document.createElement('div');
      details.className = 'cart-item-details';

      var nameEl = document.createElement('p');
      nameEl.className = 'cart-item-name';
      nameEl.textContent = item.name;
      nameEl.setAttribute('data-testid', 'text-cart-item-name-' + index);

      var priceEl = document.createElement('p');
      priceEl.className = 'cart-item-price';
      priceEl.textContent = formatPrice(item.price);
      priceEl.setAttribute('data-testid', 'text-cart-item-price-' + index);

      var removeBtn = document.createElement('button');
      removeBtn.className = 'cart-item-remove';
      removeBtn.textContent = 'Remove';
      removeBtn.setAttribute('data-testid', 'button-remove-cart-item-' + index);
      removeBtn.addEventListener('click', function () {
        var updatedCart = getCart();
        updatedCart.splice(index, 1);
        saveCart(updatedCart);
        updateCartCount();
        renderCart();
      });

      details.appendChild(nameEl);
      details.appendChild(priceEl);
      details.appendChild(removeBtn);

      row.appendChild(img);
      row.appendChild(details);
      itemsEl.appendChild(row);
    });

    var total = cart.reduce(function (sum, item) { return sum + item.price; }, 0);
    totalEl.textContent = formatPrice(total);
  }

  renderCart();

  // ---- Guard checkout behind login ----
  var checkoutLink = document.getElementById('checkout-btn');
  if (checkoutLink) {
    checkoutLink.addEventListener('click', function (e) {
      if (!getUsername()) {
        e.preventDefault();
        showToast('Please log in to proceed to checkout.');
        setTimeout(function () { window.location.href = '/login'; }, 1200);
      }
    });
  }
})();


// ===========================
// WISHLIST PAGE — RENDER
// ===========================
(function () {
  var gridEl   = document.getElementById('wishlist-grid');
  var emptyEl  = document.getElementById('wishlist-empty');
  if (!gridEl) return;

  function renderWishlist() {
    var list = getWishlist();
    gridEl.innerHTML = '';

    if (list.length === 0) {
      emptyEl.style.display = 'flex';
      gridEl.style.display  = 'none';
      return;
    }

    emptyEl.style.display = 'none';
    gridEl.style.display  = 'grid';

    list.forEach(function (item, index) {
      var card = document.createElement('article');
      card.className = 'product-card';
      card.setAttribute('data-testid', 'wishlist-card-' + item.id);

      var imgWrap = document.createElement('div');
      imgWrap.className = 'product-img-wrap';

      var img = document.createElement('img');
      img.src = item.image;
      img.alt = item.name;
      img.loading = 'lazy';
      img.setAttribute('data-testid', 'img-wishlist-item-' + index);

      imgWrap.appendChild(img);

      var info = document.createElement('div');
      info.className = 'product-info';

      var nameEl = document.createElement('p');
      nameEl.className = 'product-name';
      nameEl.textContent = item.name;
      nameEl.setAttribute('data-testid', 'text-wishlist-name-' + index);

      var priceEl = document.createElement('p');
      priceEl.className = 'product-price';
      priceEl.textContent = formatPrice(item.price);
      priceEl.setAttribute('data-testid', 'text-wishlist-price-' + index);

      var btnRow = document.createElement('div');
      btnRow.className = 'wishlist-btn-row';

      var cartBtn = document.createElement('button');
      cartBtn.className = 'product-cart-btn wishlist-add-cart-btn';
      cartBtn.textContent = 'Add to Cart';
      cartBtn.setAttribute('data-testid', 'button-wishlist-add-cart-' + index);
      cartBtn.addEventListener('click', function () {
        addToCart({ id: item.id, name: item.name, price: item.price, image: item.image });
        updateCartCount();
        showToast(item.name + ' added to cart');
      });

      var removeBtn = document.createElement('button');
      removeBtn.className = 'cart-item-remove wishlist-remove-btn';
      removeBtn.textContent = 'Remove';
      removeBtn.setAttribute('data-testid', 'button-wishlist-remove-' + index);
      removeBtn.addEventListener('click', function () {
        toggleWishlist(item);
        updateWishlistCount();
        renderWishlist();
      });

      btnRow.appendChild(cartBtn);
      btnRow.appendChild(removeBtn);

      info.appendChild(nameEl);
      info.appendChild(priceEl);
      info.appendChild(btnRow);

      card.appendChild(imgWrap);
      card.appendChild(info);
      gridEl.appendChild(card);
    });
  }

  renderWishlist();
})();


// ===========================
// SMOOTH SCROLL FOR ANCHORS
// ===========================
(function () {
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
})();

// ===========================
// VL-HEADER NAVBAR (all pages)
// ===========================
(function () {
  var vlSearchBtn   = document.getElementById('vlSearchBtn');
  var vlSearchDrop  = document.getElementById('vlSearchDrop');
  var vlSearchInput = document.getElementById('vlSearchInput');
  var vlSearchGo    = document.getElementById('vlSearchGo');

  if (vlSearchBtn && vlSearchDrop) {
    vlSearchBtn.addEventListener('click', function () {
      var isOpen = vlSearchDrop.classList.toggle('open');
      if (isOpen && vlSearchInput) vlSearchInput.focus();
    });
    document.addEventListener('click', function (e) {
      var wrap = document.getElementById('vlSearchWrap');
      if (wrap && !wrap.contains(e.target)) vlSearchDrop.classList.remove('open');
    });
  }
  if (vlSearchGo && vlSearchInput) {
    vlSearchGo.addEventListener('click', function () {
      var q = vlSearchInput.value.trim();
      if (q) window.location.href = '/shop?search=' + encodeURIComponent(q);
    });
    vlSearchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var q = vlSearchInput.value.trim();
        if (q) window.location.href = '/shop?search=' + encodeURIComponent(q);
      }
    });
  }

  var vlHamburger  = document.getElementById('vlHamburger');
  var vlMobileMenu = document.getElementById('vlMobileMenu');
  if (vlHamburger && vlMobileMenu) {
    vlHamburger.addEventListener('click', function () {
      var isOpen = vlMobileMenu.classList.toggle('open');
      vlHamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      vlMobileMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    });
  }

  var vlHeader = document.querySelector('.vl-header');
  if (vlHeader) {
    window.addEventListener('scroll', function () {
      vlHeader.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  var logoBtn  = document.getElementById('vlLogoBtn');
  var sidebar  = document.getElementById('vlSidebar');
  var overlay  = document.getElementById('vlSidebarOverlay');
  var closeBtn = document.getElementById('vlSidebarClose');

  function openSidebar() {
    if (sidebar) sidebar.classList.add('vl-sidebar--open');
    if (overlay) overlay.classList.add('vl-sidebar-overlay--visible');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('vl-sidebar--open');
    if (overlay) overlay.classList.remove('vl-sidebar-overlay--visible');
    document.body.style.overflow = '';
  }
  if (logoBtn)  logoBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (overlay)  overlay.addEventListener('click', closeSidebar);
})();
