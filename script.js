/* ============================================
   KUZPOTATO — Premium Script
   ============================================ */

// Mobile block: redirect mobile devices to a friendly 'site unavailable' page
;(function(){
    try {
        var isMobileUA = /Mobi|Android|iPhone|iPad|iPod|IEMobile|BlackBerry|Opera Mini/i.test(navigator.userAgent || '');
        var smallScreen = (typeof window !== 'undefined' && window.innerWidth && window.innerWidth <= 800);
        if(isMobileUA || smallScreen){
            // Avoid redirect loop if already on the unavailable page
            if(!/mobile-unavailable\.html$/.test(window.location.pathname)){
                window.location.replace('mobile-unavailable.html');
            }
        }
    } catch(e) { /* ignore */ }
})();


document.addEventListener('DOMContentLoaded', () => {
    // --- DATA ---
    const products = [
        { 
            id: 1, 
            name: 'Сибирский Премиум', 
            category: 'premium', 
            price: 120, 
            unit: 'кг', 
            desc: 'Элитный сорт с полей Кузбасса. Идеален для запекания и пюре.', 
            // ★ ВСТАВЬТЕ ПУТЬ К КАРТИНКЕ (например, "images/potato-premium.jpg")
            img: 'images/potato-premium.jpg', 
            chars: { 'Сорт': 'Гала', 'Вес': '1 кг', 'Происхождение': 'Кемерово', 'Хранение': '3-5°C' } 
        },
        { 
            id: 2, 
            name: 'Фермерский Отбор', 
            category: 'farm', 
            price: 85, 
            unit: 'кг', 
            desc: 'Крупные клубни, ручная переборка. Для жарки и супов.', 
            // ★ ВСТАВЬТЕ ПУТЬ К КАРТИНКЕ
            img: 'images/potato-farm.jpg', 
            chars: { 'Сорт': 'Ред Скарлет', 'Вес': '1 кг', 'Происхождение': 'Кемерово', 'Хранение': '3-5°C' } 
        },
        { 
            id: 3, 
            name: 'Ранний Кузбасский', 
            category: 'early', 
            price: 150, 
            unit: 'кг', 
            desc: 'Молодой картофель, первый урожай. Нежный вкус.', 
            // ★ ВСТАВЬТЕ ПУТЬ К КАРТИНКЕ
            img: 'images/potato-early.jpg', 
            chars: { 'Сорт': 'Жуковский', 'Вес': '1 кг', 'Происхождение': 'Кемерово', 'Сезон': 'Июнь-Июль' } 
        },
        { 
            id: 4, 
            name: 'Универсальный Стандарт', 
            category: 'universal', 
            price: 65, 
            unit: 'кг', 
            desc: 'Надёжный сорт для повседневных блюд. Хорошо хранится.', 
            // ★ ВСТАВЬТЕ ПУТЬ К КАРТИНКЕ
            img: 'images/potato-universal.jpg', 
            chars: { 'Сорт': 'Невский', 'Вес': '1 кг', 'Происхождение': 'Кемерово', 'Хранение': 'до 8 мес' } 
        },
        { 
            id: 5, 
            name: 'Премиум Розовый', 
            category: 'premium', 
            price: 135, 
            unit: 'кг', 
            desc: 'Розовая кожура, жёлтая мякоть. Деликатесный вкус.', 
            // ★ ВСТАВЬТЕ ПУТЬ К КАРТИНКЕ
            img: 'images/potato-premium-pink.jpg', 
            chars: { 'Сорт': 'Розара', 'Вес': '1 кг', 'Происхождение': 'Кемерово', 'Хранение': '3-5°C' } 
        },
        { 
            id: 6, 
            name: 'Фермерский Мешок', 
            category: 'farm', 
            price: 750, 
            unit: '10 кг', 
            desc: 'Эконом-упаковка для семьи. 10 кг отборного картофеля.', 
            // ★ ВСТАВЬТЕ ПУТЬ К КАРТИНКЕ
            img: 'images/potato-bag.jpg', 
            chars: { 'Сорт': 'Гала', 'Вес': '10 кг', 'Происхождение': 'Кемерово', 'Хранение': '3-5°C' } 
        },
    ];

    // Try load products from server, fallback to static `products`
    async function getProductsRemoteOrLocal(){
        try{
            const resp = await apiFetch('/api/products', { cache: 'no-store' });
            if(resp.ok){
                const list = await resp.json();
                return list.map(p => ({ id: p.id, name: p.title, category: 'catalog', price: p.price, unit: 'шт', desc: p.description || p.note || '', img: p.image_url || 'images/potato-universal.jpg', chars: {} }));
            }
        }catch(e){ /* ignore */ }
        return products;
    }

    // --- CART (localStorage) ---
    const CART_KEY = 'kuzpotato_cart';

    function getCart() {
        const raw = localStorage.getItem(CART_KEY);
        return raw ? JSON.parse(raw) : [];
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCartBadge();
    }

    function addToCart(productId, qty = 1) {
        const cart = getCart();
        const existing = cart.find(item => item.productId === productId);
        if (existing) {
            existing.qty += qty;
        } else {
            cart.push({ productId, qty });
        }
        saveCart(cart);
    }

    function removeFromCart(productId) {
        let cart = getCart();
        cart = cart.filter(item => item.productId !== productId);
        saveCart(cart);
        renderCart();
    }

    function updateCartQty(productId, delta) {
        const cart = getCart();
        const item = cart.find(i => i.productId === productId);
        if (item) {
            item.qty = Math.max(1, item.qty + delta);
            saveCart(cart);
            renderCart();
        }
    }

    function updateCartBadge() {
        const badge = document.getElementById('cartBadge');
        if (!badge) return;
        const cart = getCart();
        const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
        badge.textContent = totalItems;
    }

    // --- RENDER PRODUCT CARDS ---
    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-category', product.category);
        // ★ Изменено: теперь используется <img> с путём из product.img
        card.innerHTML = `
            <img src="${product.img}" alt="${product.name}" class="product-card__image">
            <div class="product-card__body">
                <span class="product-card__category">${getCategoryLabel(product.category)}</span>
                <h3>${product.name}</h3>
                <p class="product-card__desc">${product.desc}</p>
                <div class="product-card__footer">
                    <span class="product-card__price">${product.price} ₽ <span>/ ${product.unit}</span></span>
                    <button class="btn--add" data-id="${product.id}">В корзину</button>
                </div>
            </div>
            <a href="product.html?id=${product.id}" class="product-card__overlay-link" style="position:absolute;inset:0;z-index:1;"></a>
        `;
        // Prevent add to cart button from triggering the link
        const addBtn = card.querySelector('.btn--add');
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            addToCart(product.id, 1);
            // Visual feedback
            addBtn.textContent = 'Добавлено!';
            addBtn.style.background = '#2D5016';
            setTimeout(() => {
                addBtn.textContent = 'В корзину';
                addBtn.style.background = '';
            }, 1200);
        });
        return card;
    }

    function getCategoryLabel(cat) {
        const map = { premium: 'Премиум', farm: 'Фермерский', early: 'Ранний', universal: 'Универсальный' };
        return map[cat] || cat;
    }

    // --- PAGE SPECIFIC RENDERING ---
    const path = window.location.pathname;

    // Index page popular products
    const popularGrid = document.getElementById('popularProducts');
    if (popularGrid) {
        (async ()=>{
            const list = await getProductsRemoteOrLocal();
            const popular = list.slice(0,3);
            popular.forEach(p => popularGrid.appendChild(createProductCard(p)));
        })();
    }

    // Catalog page
    const catalogGrid = document.getElementById('catalogGrid');
    if (catalogGrid) {
        function renderCatalog(filter = 'all') {
            catalogGrid.innerHTML = '';
            (async ()=>{
                const list = await getProductsRemoteOrLocal();
                const filtered = filter === 'all' ? list : list.filter(p => p.category === filter);
                filtered.forEach(p => catalogGrid.appendChild(createProductCard(p)));
            })();
        }
        renderCatalog();

        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('filter-btn--active'));
                btn.classList.add('filter-btn--active');
                renderCatalog(btn.dataset.filter);
            });
        });
    }

    // Product detail page
    const productDetail = document.getElementById('productDetail');
    if (productDetail) {
        const params = new URLSearchParams(window.location.search);
        const productId = parseInt(params.get('id'));
        const product = products.find(p => p.id === productId);
        if (product) {
            let qty = 1;
            // ★ Изменено: картинка в детальной странице тоже берётся из product.img
            productDetail.innerHTML = `
                <img src="${product.img}" alt="${product.name}" class="product-page__image">
                <div class="product-page__info">
                    <span class="product-page__category">${getCategoryLabel(product.category)}</span>
                    <h1>${product.name}</h1>
                    <p class="product-page__price">${product.price} ₽ <span>/ ${product.unit}</span></p>
                    <p class="product-page__desc">${product.desc}</p>
                    <div class="product-page__chars">
                        ${Object.entries(product.chars).map(([key, val]) => `<div class="product-page__char"><strong>${key}</strong> ${val}</div>`).join('')}
                    </div>
                    <div class="product-page__actions">
                        <div class="qty-input">
                            <button id="qtyMinus">−</button>
                            <input type="number" id="qtyValue" value="1" min="1" readonly>
                            <button id="qtyPlus">+</button>
                        </div>
                        <button class="btn btn--gold btn--lg" id="addToCartBtn">Добавить в корзину — ${product.price * qty} ₽</button>
                    </div>
                </div>
            `;
            const qtyInput = document.getElementById('qtyValue');
            const addBtn = document.getElementById('addToCartBtn');
            document.getElementById('qtyMinus').addEventListener('click', () => {
                qty = Math.max(1, qty - 1);
                qtyInput.value = qty;
                addBtn.textContent = `Добавить в корзину — ${product.price * qty} ₽`;
            });
            document.getElementById('qtyPlus').addEventListener('click', () => {
                qty++;
                qtyInput.value = qty;
                addBtn.textContent = `Добавить в корзину — ${product.price * qty} ₽`;
            });
            addBtn.addEventListener('click', () => {
                addToCart(product.id, qty);
                addBtn.textContent = 'Добавлено!';
                addBtn.style.background = '#2D5016';
                setTimeout(() => {
                    addBtn.textContent = `Добавить в корзину — ${product.price * qty} ₽`;
                    addBtn.style.background = '';
                }, 1500);
            });
        } else {
            productDetail.innerHTML = '<p>Товар не найден.</p>';
        }
    }

    // Cart page
    const cartContainer = document.getElementById('cartContainer');
    if (cartContainer) {
        renderCart();
    }
    function renderCart() {
        if (!cartContainer) return;
        const cart = getCart();
        if (cart.length === 0) {
            cartContainer.innerHTML = `
                <div class="cart-empty">
                    <h3>Корзина пуста</h3>
                    <p>Добавьте товары из каталога</p>
                    <a href="catalog.html" class="btn btn--gold">Перейти в каталог</a>
                </div>`;
            return;
        }
        let itemsHtml = '<div class="cart__items">';
        let total = 0;
        cart.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return;
            const subtotal = product.price * item.qty;
            total += subtotal;
            // ★ Изменено: картинка в корзине берётся из product.img
            itemsHtml += `
                <div class="cart-item">
                    <img src="${product.img}" alt="${product.name}" class="cart-item__image">
                    <div class="cart-item__name">${product.name}</div>
                    <div class="cart-item__qty">
                        <div class="qty-input">
                            <button data-action="minus" data-id="${product.id}">−</button>
                            <input type="number" value="${item.qty}" readonly>
                            <button data-action="plus" data-id="${product.id}">+</button>
                        </div>
                    </div>
                    <div class="cart-item__price">${subtotal} ₽</div>
                    <button class="cart-item__remove" data-id="${product.id}">✕</button>
                </div>`;
        });
        itemsHtml += '</div>';
        itemsHtml += `
            <div class="cart__summary">
                <h3>Итого</h3>
                <div class="cart__total">${total} ₽</div>
                <a href="checkout.html" class="btn btn--gold btn--lg">Оформить заказ</a>
            </div>`;
        cartContainer.innerHTML = itemsHtml;

        // Event listeners for qty and remove
        cartContainer.querySelectorAll('[data-action="minus"]').forEach(btn => {
            btn.addEventListener('click', () => updateCartQty(parseInt(btn.dataset.id), -1));
        });
        cartContainer.querySelectorAll('[data-action="plus"]').forEach(btn => {
            btn.addEventListener('click', () => updateCartQty(parseInt(btn.dataset.id), 1));
        });
        cartContainer.querySelectorAll('.cart-item__remove').forEach(btn => {
            btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id)));
        });
    }

    // Checkout page
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        // Render order summary
        const checkoutItems = document.getElementById('checkoutItems');
        const cart = getCart();
        if (cart.length === 0) {
            checkoutItems.innerHTML = '<p>Корзина пуста. <a href="catalog.html">Добавьте товары</a></p>';
        } else {
            let summaryHtml = '';
            let total = 0;
            cart.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (!product) return;
                const subtotal = product.price * item.qty;
                total += subtotal;
                summaryHtml += `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>${product.name} x${item.qty}</span><span>${subtotal} ₽</span></div>`;
            });
            summaryHtml += `<hr style="margin:16px 0;border-color:var(--border)"><div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.2rem;"><span>Итого</span><span>${total} ₽</span></div>`;
            checkoutItems.innerHTML = summaryHtml;
        }

        // Form submit
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            document.querySelector('.checkout__form-wrap').querySelector('.checkout__form').style.display = 'none';
            document.getElementById('checkoutSuccess').style.display = 'block';
            localStorage.removeItem(CART_KEY);
            updateCartBadge();
        });
    }

    // Contact form
    const contactsForm = document.getElementById('contactsForm');
    if (contactsForm) {
        contactsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            contactsForm.style.display = 'none';
            document.getElementById('contactsSuccess').style.display = 'block';
        });
    }

    // --- BURGER MENU ---
    const burger = document.getElementById('burger');
    const nav = document.getElementById('nav');
    if (burger && nav) {
        burger.addEventListener('click', () => {
            nav.classList.toggle('nav--open');
            burger.classList.toggle('active');
        });
        nav.querySelectorAll('.nav__link').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('nav--open');
                burger.classList.remove('active');
            });
        });
    }

    // --- SCROLL FADE-IN ANIMATIONS ---
    const fadeElements = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.15 });

    fadeElements.forEach(el => observer.observe(el));

    // --- Admin Console / Profile / Chat Buttons for logged user ---
    try{
        const userStr = sessionStorage.getItem('user');
        if(userStr){
            const user = JSON.parse(userStr);
            const headerActions = document.querySelector('.header__actions');
            if(headerActions){
                if(user && user.role === 'admin'){
                    if(!document.getElementById('adminConsoleBtn')){
                        const btn = document.createElement('button');
                        btn.id = 'adminConsoleBtn';
                        btn.className = 'btn btn--outline-dark btn--console';
                        btn.textContent = 'Консоль';
                        btn.title = 'Консоль администратора';
                        btn.addEventListener('click', ()=>{
                                window.location.href = 'admin.html';
                            });
                        headerActions.insertBefore(btn, headerActions.firstChild);
                    }
                    if(!document.getElementById('adminChatsBtn')){
                        const btn = document.createElement('button');
                        btn.id = 'adminChatsBtn';
                        btn.className = 'btn btn--outline-dark btn--console';
                        btn.innerHTML = '<span class="profile-avatar">💬</span> Чаты';
                        btn.title = 'Чаты администратора';
                        btn.addEventListener('click', ()=>{
                            window.location.href = 'chat.html';
                        });
                        headerActions.insertBefore(btn, headerActions.firstChild);
                    }
                } else {
                    if(!document.getElementById('profileBtn')){
                        const btn = document.createElement('button');
                        btn.id = 'profileBtn';
                        btn.className = 'btn btn--outline-dark btn--console';
                        btn.innerHTML = '<span class="profile-avatar">👤</span> Профиль';
                        btn.title = 'Профиль';
                        btn.addEventListener('click', ()=>{
                            window.location.href = 'profile.html';
                        });
                        headerActions.insertBefore(btn, headerActions.firstChild);
                    }
                    if(!document.getElementById('chatBtn')){
                        const btn = document.createElement('button');
                        btn.id = 'chatBtn';
                        btn.className = 'btn btn--outline-dark btn--console';
                        btn.innerHTML = '<span class="profile-avatar">💬</span> Чат';
                        btn.title = 'Открыть чат';
                        btn.addEventListener('click', ()=>{
                            window.location.href = 'chat.html';
                        });
                        headerActions.insertBefore(btn, headerActions.firstChild);
                    }
                }
            }
        }
    }catch(e){/* ignore parse errors */}

    window.apiFetch = async function(path, opts = {}) {
        opts = opts || {};
        opts.headers = opts.headers || {};
        try {
            const userStr = sessionStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                if (user && user.token) {
                    opts.headers['Authorization'] = 'Bearer ' + user.token;
                }
            }
        } catch (e) {}
        return fetch(path, opts);
    };

    window.logoutUser = async function() {
        try {
            await apiFetch('/api/logout', { method: 'POST' });
        } catch (e) {
            console.warn('Logout request failed', e);
        }
        sessionStorage.removeItem('user');
        window.location.href = 'login.html';
    };

    window.updateStoredUser = function(updatedData) {
        const userStr = sessionStorage.getItem('user');
        if (!userStr) return;
        const stored = JSON.parse(userStr);
        const merged = { ...stored, ...updatedData };
           try { sessionStorage.setItem('user', JSON.stringify(merged)); } catch (e) {}
    };

    window.loadUserProfile = function() {
        const profileCard = document.getElementById('profileCard');
        if(!profileCard){
            return;
        }

        const userStr = sessionStorage.getItem('user');
        if(!userStr){
            window.location.href = 'login.html';
            return;
        }

        const user = JSON.parse(userStr);
        if(user.role === 'admin'){
            profileCard.innerHTML = `
                <div class="profile-page-notice">
                    <h1>Администратор</h1>
                    <p>Администраторам доступна консоль, а не профиль пользователя.</p>
                    <a class="btn btn--gold" href="index.html">На главную</a>
                </div>
            `;
            return;
        }

        const displayName = user.full_name ? user.full_name : user.email;
        const initials = getInitials(user.full_name || user.email);
        const safeAvatarUrl = user.avatar_url ? escapeHtml(user.avatar_url).replace(/'/g, '&#39;') : '';
        const avatarStyle = user.avatar_url ? `style="background-image: url('${safeAvatarUrl}')"` : '';

        profileCard.innerHTML = `
            <div class="profile-page-grid">
                <div class="profile-preview">
                    <div class="profile-preview__avatar" ${avatarStyle}>${user.avatar_url ? '' : initials}</div>
                    <div class="profile-preview__meta">
                        <h1>${escapeHtml(displayName)}</h1>
                        <!-- email скрыт по запросу -->
                        <p class="profile-card__role">Статус: ${escapeHtml(user.status || 'мирный')}</p>
                    </div>
                </div>
                <div class="profile-edit">
                    <h2>Редактировать профиль</h2>
                    <label class="form-row">
                        <span>Имя и фамилия</span>
                        <input id="fullNameInput" type="text" value="${escapeHtml(user.full_name || '')}" placeholder="Ваше имя и фамилия">
                    </label>
                        <label class="form-row">
                            <span>Ссылка на аватар</span>
                            <input id="avatarUrlInput" type="url" value="${escapeHtml(user.avatar_url || '')}" placeholder="https://example.com/avatar.jpg">
                        </label>

                        <label class="form-row">
                            <span>Загрузить файл аватара</span>
                            <input id="avatarFileInput" type="file" accept="image/*">
                            <div style="display:flex;gap:8px;margin-top:8px;">
                                <button class="btn btn--gold" id="uploadAvatarBtn" type="button">Загрузить</button>
                                <button class="btn" id="clearAvatarBtn" type="button">Очистить</button>
                            </div>
                            <div id="avatarUploadStatus" style="margin-top:8px;color:var(--brown-muted)"></div>
                        </label>
                    <div class="profile-actions">
                        <button class="btn btn--gold" id="saveProfileBtn" type="button">Сохранить изменения</button>
                        <button class="btn btn--outline-dark" id="logoutBtn" type="button">Выйти</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
            const fullName = document.getElementById('fullNameInput').value.trim();
            const avatarUrl = document.getElementById('avatarUrlInput').value.trim();

            const response = await apiFetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: fullName, avatar_url: avatarUrl })
            });

            if(!response.ok){
                const errorData = await response.json().catch(() => null);
                alert('Ошибка при сохранении профиля: ' + (errorData?.error || response.statusText));
                return;
            }

            updateStoredUser({ full_name: fullName, avatar_url: avatarUrl });
            alert('Профиль успешно обновлён');
            window.loadUserProfile();
        });

        // Upload handlers (server-side proxy)
        const avatarFileInput = document.getElementById('avatarFileInput');
        const uploadBtn = document.getElementById('uploadAvatarBtn');
        const clearBtn = document.getElementById('clearAvatarBtn');
        const statusEl = document.getElementById('avatarUploadStatus');

        uploadBtn?.addEventListener('click', async () => {
            if (!avatarFileInput || !avatarFileInput.files || avatarFileInput.files.length === 0) {
                alert('Выберите файл для загрузки');
                return;
            }
            const file = avatarFileInput.files[0];
            statusEl.textContent = 'Загружаю...';
            uploadBtn.disabled = true;

            try {
                const form = new FormData();
                form.append('file', file);

                const resp = await apiFetch('/api/upload_avatar', {
                    method: 'POST',
                    body: form
                });

                const data = await resp.json();
                if (!resp.ok || !data || !data.url) {
                    throw new Error((data && data.error) ? data.error : (resp.statusText || 'Upload failed'));
                }

                const uploadedUrl = data.url;
                document.getElementById('avatarUrlInput').value = uploadedUrl;
                updateStoredUser({ avatar_url: uploadedUrl });
                statusEl.textContent = 'Загружено успешно';
                window.loadUserProfile();
            } catch (e) {
                console.error(e);
                statusEl.textContent = 'Ошибка загрузки: ' + (e.message || e);
                alert('Ошибка загрузки: ' + (e.message || e));
            } finally {
                uploadBtn.disabled = false;
                setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 4000);
            }
        });

        clearBtn?.addEventListener('click', () => {
            document.getElementById('avatarUrlInput').value = '';
            avatarFileInput.value = '';
            updateStoredUser({ avatar_url: '' });
            window.loadUserProfile();
        });
        const logoutBtn = document.getElementById('logoutBtn');
        if(logoutBtn){
            logoutBtn.addEventListener('click', window.logoutUser);
        }
    };

    window.loadChatPage = async function() {
        const userStr = sessionStorage.getItem('user');
        if(!userStr){
            window.location.href = 'login.html';
            return;
        }

        const user = JSON.parse(userStr);
        const chatTitle = document.getElementById('chatTitle');
        const chatMessages = document.getElementById('chatMessages');
        const chatForm = document.getElementById('chatForm');
        const chatInput = document.getElementById('chatInput');
        const chatSidebar = document.getElementById('chatSidebar');

        if(!chatMessages || !chatForm || !chatInput){
            return;
        }

        const isAdmin = user.role === 'admin';
        let activePartnerId = null;

        if(isAdmin){
            const response = await apiFetch('/api/chat/conversations', { cache: 'no-store' });
            const conversations = response.ok ? await response.json() : [];
            if(conversations.length === 0){
                if(chatSidebar){
                    chatSidebar.innerHTML = '<div class="chat-sidebar__title">Чаты</div><p class="chat-empty">Пока нет сообщений от пользователей.</p>';
                }
                chatTitle.textContent = 'Чаты администратора';
                chatMessages.innerHTML = '<div class="chat-empty">Выберите чат пользователя слева или ожидайте сообщения.</div>';
                chatInput.disabled = true;
                chatForm.querySelector('button')?.setAttribute('disabled', 'disabled');
            } else {
                activePartnerId = conversations[0].id;
                window.currentChatPartnerId = activePartnerId;
                renderChatSidebar(conversations, activePartnerId);
                await loadChatMessages(activePartnerId, conversations[0].displayName || conversations[0].email);
                chatInput.disabled = false;
                chatForm.querySelector('button')?.removeAttribute('disabled');
            }
        } else {
            if(chatSidebar){
                chatSidebar.style.display = 'none';
            }
            chatTitle.textContent = 'Чат с администрацией';
            await loadChatMessages(null, 'Администрация');
        }

        chatForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const text = chatInput.value.trim();
            if(!text){
                return;
            }
            const currentPartnerId = isAdmin ? window.currentChatPartnerId : null;
            await sendChatMessage(text, currentPartnerId, isAdmin);
            chatInput.value = '';
            await loadChatMessages(currentPartnerId, isAdmin ? getChatPartnerEmail(currentPartnerId) : 'Администрация');
            if(isAdmin){
                await refreshChatSidebar(currentPartnerId);
            }
        });
    };

    async function sendChatMessage(text, recipientId, isAdmin) {
        const body = { text };
        if(isAdmin && recipientId){
            body.recipientId = recipientId;
        }
        const response = await apiFetch('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if(!response.ok){
            const errorData = await response.json().catch(() => null);
            alert('Не удалось отправить сообщение: ' + (errorData?.error || response.statusText));
        }
    }

    async function loadChatMessages(partnerId, title) {
        const userStr = sessionStorage.getItem('user');
        if(!userStr){
            window.location.href = 'login.html';
            return;
        }
        const user = JSON.parse(userStr);
        const chatTitle = document.getElementById('chatTitle');
        const chatMessages = document.getElementById('chatMessages');

        if(chatTitle){
            chatTitle.textContent = title || 'Чат';
        }

        const query = user.role === 'admin' ? `?with=${partnerId}` : '';
        const response = await apiFetch('/api/chat/messages' + query, { cache: 'no-store' });
        const messages = response.ok ? await response.json() : [];

        chatMessages.innerHTML = messages.length
            ? messages.map(message => {
                const isSent = message.sender_id === user.id;
                return `<div class="chat-message ${isSent ? 'chat-message--sent' : 'chat-message--received'}">
                    <div class="chat-message__text">${escapeHtml(message.text)}</div>
                    <div class="chat-message__time">${formatTime(message.created_at)}</div>
                </div>`;
            }).join('')
            : '<div class="chat-empty">Начните переписку. Сообщения будут отображаться здесь.</div>';

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function refreshChatSidebar(selectedId) {
        const response = await apiFetch('/api/chat/conversations', { cache: 'no-store' });
        const conversations = response.ok ? await response.json() : [];
        renderChatSidebar(conversations, selectedId);
    }

    function renderChatSidebar(conversations, activeId) {
        const chatSidebar = document.getElementById('chatSidebar');
        if(!chatSidebar){
            return;
        }
        chatSidebar.innerHTML = `<div class="chat-sidebar__title">Чаты</div>` + conversations.map(conv => {
            const title = escapeHtml(conv.displayName || conv.email || 'Пользователь');
            return `<button type="button" class="chat-contact-item ${conv.id === activeId ? 'active' : ''}" data-id="${conv.id}" data-name="${title}">
                <strong>${title}</strong>
                <span class="chat-contact-item__preview">${escapeHtml(conv.lastMessage || 'Новая переписка')}</span>
            </button>`;
        }).join('');

        chatSidebar.querySelectorAll('.chat-contact-item').forEach(button => {
            button.addEventListener('click', async () => {
                const partnerId = Number(button.dataset.id);
                const partnerName = button.dataset.name || 'Пользователь';
                renderChatSidebar(conversations, partnerId);
                await loadChatMessages(partnerId, `Чат с ${partnerName}`);
                window.currentChatPartnerName = partnerName;
                window.currentChatPartnerId = partnerId;
            });
        });
    }

    function getChatPartnerEmail(partnerId) {
        const chatSidebar = document.getElementById('chatSidebar');
        if(!chatSidebar) return 'Пользователь';
        const active = chatSidebar.querySelector(`.chat-contact-item[data-id="${partnerId}"]`);
        return active ? active.dataset.name || 'Пользователь' : 'Пользователь';
    }

    function escapeHtml(text) {
        return text.replace(/[&<>"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[ch]);
    }

    function formatTime(value) {
        const date = new Date(value);
        if(isNaN(date)) return '';
        return date.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    function getInitials(email) {
        const name = (email || '').split('@')[0].trim();
        if(!name) return 'U';
        return name.substring(0, 2).toUpperCase();
    }

    // --- Admin console loader (admin.html) ---
    window.loadAdminConsole = async function() {
        const userStr = sessionStorage.getItem('user');
        if(!userStr){ window.location.href = 'login.html'; return; }
        const user = JSON.parse(userStr);
        if(!user || user.role !== 'admin'){
            document.getElementById('adminNotice').textContent = 'Требуется доступ администратора.';
            return;
        }

        const addBtn = document.getElementById('addProductBtn');
        const formWrapper = document.getElementById('productFormWrapper');
        const cancelBtn = document.getElementById('cancelProductBtn');
        const submitBtn = document.getElementById('submitProductBtn');
        const uploadStatus = document.getElementById('productUploadStatus');

        addBtn?.addEventListener('click', () => {
            formWrapper.style.display = formWrapper.style.display === 'none' ? 'block' : 'none';
        });
        cancelBtn?.addEventListener('click', () => {
            formWrapper.style.display = 'none';
        });

        async function fetchProducts() {
            try {
                const resp = await apiFetch('/api/products', { cache: 'no-store' });
                if(!resp.ok) throw new Error('Failed to load');
                const products = await resp.json();
                renderProductsList(products);
            } catch (e) {
                document.getElementById('adminNotice').textContent = 'Ошибка загрузки товаров.';
            }
        }

        function renderProductsList(products){
            const wrapper = document.getElementById('productsList');
            if(!wrapper) return;
            if(!products || products.length === 0){
                wrapper.innerHTML = '<p class="admin-empty">Товары ещё не добавлены.</p>';
                return;
            }
            wrapper.innerHTML = products.map(p => `
                <div class="product-card admin-card" data-id="${p.id}">
                    <img src="${p.image_url || 'images/potato-universal.jpg'}" alt="${escapeHtml(p.title)}" class="product-card__image">
                    <div class="product-card__body">
                        <h3>${escapeHtml(p.title)}</h3>
                        <p class="product-card__desc">${escapeHtml(p.description || p.note || '')}</p>
                        <div class="product-card__footer">
                            <span class="product-card__price">${p.price || 0} ₽</span>
                            <div style="margin-left:auto;display:flex;gap:8px;">
                                <button class="btn btn--sm btn--outline-dark editProductBtn" data-id="${p.id}">Изменить</button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            // attach edit handlers
            wrapper.querySelectorAll('.editProductBtn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = Number(btn.dataset.id);
                    await openEditProduct(id);
                });
            });
        }

        async function openEditProduct(id){
            try{
                const resp = await apiFetch('/api/products/' + id);
                if(!resp.ok) throw new Error('Не удалось загрузить товар');
                const prod = await resp.json();
                // populate form
                document.getElementById('prodTitle').value = prod.title || '';
                document.getElementById('prodDescription').value = prod.description || prod.note || '';
                document.getElementById('prodPrice').value = prod.price || 0;
                document.getElementById('prodNote').value = prod.note || '';
                document.getElementById('prodImageFile').value = '';
                // set hidden edit state
                const form = document.getElementById('productForm');
                form.dataset.editId = prod.id;
                document.getElementById('submitProductBtn').textContent = 'Сохранить изменения';
                document.getElementById('deleteProductBtn').style.display = 'inline-flex';
                document.getElementById('productFormWrapper').style.display = 'block';
                document.getElementById('productUploadStatus').textContent = '';
            } catch(e){
                alert('Ошибка: ' + (e.message || e));
            }
        }

        submitBtn?.addEventListener('click', async () => {
            const title = document.getElementById('prodTitle').value.trim();
            const description = document.getElementById('prodDescription').value.trim();
            const price = parseFloat(document.getElementById('prodPrice').value) || 0;
            const note = document.getElementById('prodNote').value.trim();
            const fileInput = document.getElementById('prodImageFile');

            if(!title){ alert('Укажите название товара'); return; }
            submitBtn.disabled = true;
            uploadStatus.textContent = 'Создаю товар...';

            try {
                // detect edit vs create
                const form = document.getElementById('productForm');
                const editId = form.dataset.editId ? Number(form.dataset.editId) : null;
                let imageUrl = '';
                if(fileInput && fileInput.files && fileInput.files.length > 0){
                    uploadStatus.textContent = 'Загружаю изображение...';
                    const formData = new FormData();
                    formData.append('file', fileInput.files[0]);
                    const upResp = await apiFetch('/api/upload_product_image', { method: 'POST', body: formData });
                    const upData = await upResp.json();
                    if(!upResp.ok) throw new Error(upData?.error || 'Upload failed');
                    imageUrl = upData.url;
                }

                uploadStatus.textContent = editId ? 'Сохраняю изменения...' : 'Сохраняю товар...';
                let resp;
                if(editId){
                    resp = await apiFetch('/api/products/' + editId, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title, description, image_url: imageUrl, price, note })
                    });
                } else {
                    resp = await apiFetch('/api/products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title, description, image_url: imageUrl, price, note })
                    });
                }
                const created = await resp.json();
                if(!resp.ok) throw new Error(created?.error || 'Create/Update failed');

                uploadStatus.textContent = editId ? 'Изменения сохранены' : 'Товар создан';
                document.getElementById('productForm').reset();
                delete form.dataset.editId;
                document.getElementById('submitProductBtn').textContent = 'Создать товар';
                document.getElementById('deleteProductBtn').style.display = 'none';
                formWrapper.style.display = 'none';
                await fetchProducts();
                setTimeout(()=> uploadStatus.textContent = '', 3000);
            } catch (e) {
                console.error(e);
                uploadStatus.textContent = 'Ошибка: ' + (e.message || e);
                alert('Ошибка: ' + (e.message || e));
            } finally {
                submitBtn.disabled = false;
            }
        });

        // delete handler
        const deleteBtn = document.getElementById('deleteProductBtn');
        deleteBtn?.addEventListener('click', async () => {
            if(!confirm('Удалить этот товар?')) return;
            const form = document.getElementById('productForm');
            const editId = form.dataset.editId ? Number(form.dataset.editId) : null;
            if(!editId) return;
            try{
                const resp = await apiFetch('/api/products/' + editId, { method: 'DELETE' });
                const data = await resp.json();
                if(!resp.ok) throw new Error(data?.error || 'Delete failed');
                document.getElementById('productForm').reset();
                delete form.dataset.editId;
                document.getElementById('submitProductBtn').textContent = 'Создать товар';
                document.getElementById('deleteProductBtn').style.display = 'none';
                document.getElementById('productFormWrapper').style.display = 'none';
                await fetchProducts();
            }catch(e){
                alert('Ошибка удаления: ' + (e.message || e));
            }
        });

        await fetchProducts();
    };

    // Initial cart badge update
    updateCartBadge();
});
