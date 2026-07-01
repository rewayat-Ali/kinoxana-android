/**
 * كىنوخانا — Mobile App
 * Uyghur RTL Movie Streaming App
 * 4 Tabs: باشبەت / كاتېگورىيە / پائالىيەت / مېنىڭ
 */

const App = {
  state: {
    currentPage: 'home',
    categories: [],
    movies: [],
    activeCategory: null,
    favorites: [],
    history: [],
    user: null,
    searchQuery: '',
    currentMovie: null,
    activitiesLoaded: false,
  },

  // ===== Init =====
  init() {
    this.loadFonts();
    setTimeout(() => {
      if (Api.isLoggedIn()) {
        this.showMainApp();
        this.loadInitialData();
      } else {
        this.showAuth();
      }
    }, 1500);
    this.bindEvents();
  },

  // ===== Font Loading =====
  loadFonts() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        document.documentElement.classList.add('font-loaded');
        console.log('UKIJ Ekran font loaded successfully');
      }).catch(() => {
        console.warn('UKIJ Ekran font failed to load, using fallback');
      });
    }
    if (document.fonts && document.fonts.load) {
      document.fonts.load('16px UKIJEkran').catch(() => {});
    }
  },

  // ===== WeChat Auth =====
  getWechatCode() {
    return new Promise((resolve, reject) => {
      if (window.AndroidBridge && window.AndroidBridge.wechatLogin) {
        window.AndroidBridge.wechatLogin((code) => {
          if (code && code !== 'null' && code !== 'undefined') {
            resolve(code);
          } else {
            reject(new Error('WeChat ئىجازەت ئېلىنمىدى'));
          }
        });
      } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.wechatLogin) {
        window.webkit.messageHandlers.wechatLogin.postMessage({});
        window._wechatLoginCallback = (code) => {
          if (code && code !== 'null' && code !== 'undefined') {
            resolve(code);
          } else {
            reject(new Error('WeChat ئىجازەت ئېلىنمىدى'));
          }
        };
      } else {
        const mockCode = 'mock_' + Date.now();
        console.warn('WeChat SDK not available, using mock code for testing');
        resolve(mockCode);
      }
    });
  },

  // ===== Navigation =====
  showScreen(id) {
    const screens = document.querySelectorAll('.screen');
    const current = document.querySelector('.screen.active');
    const next = document.getElementById(id);
    if (current === next) return;
    screens.forEach(s => s.classList.remove('active'));
    next.classList.add('active');
  },

  showAuth() { this.showScreen('auth-screen'); },
  showMainApp() { this.showScreen('main-app'); },

  switchPage(page) {
    this.state.currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navBtn) navBtn.classList.add('active');

    const titles = {
      home: 'كىنوخانا',
      categories: 'كاتېگورىيە',
      activities: 'پائالىيەت',
      profile: 'مېنىڭ',
    };
    document.getElementById('page-title').textContent = titles[page] || '';
    document.getElementById('search-bar').classList.add('hidden');

    // Show search button only on home
    const searchBtn = document.getElementById('search-btn');
    searchBtn.style.display = (page === 'home') ? 'flex' : 'none';

    if (page === 'categories') this.loadCategoriesPage();
    if (page === 'activities') this.loadActivities();
    if (page === 'profile') this.loadProfile();
  },

  // ===== Event Binding =====
  bindEvents() {
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
        document.getElementById('auth-error').textContent = '';
      });
    });

    // Login
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'كىرىۋاتىدۇ...';
      document.getElementById('auth-error').textContent = '';
      try {
        const res = await Api.login(fd.get('username').trim(), fd.get('password').trim());
        const token = res.access_token || res.token || (typeof res === 'string' ? res : null);
        if (!token) throw { message: 'توكن ئېلىنمىدى' };
        Api.setToken(token);
        this.showMainApp();
        this.loadInitialData();
        this.showToast('مۇۋەپپەقىيەتلىك كىردىڭىز', 'success');
      } catch (err) {
        document.getElementById('auth-error').textContent = err.message || 'كىرىش مەغلۇب بولدى';
      } finally {
        btn.disabled = false; btn.textContent = 'كىرىش';
      }
    });

    // Register
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        username: fd.get('username').trim(),
        nickname: fd.get('nickname').trim(),
        password: fd.get('password').trim(),
        email: fd.get('email').trim() || undefined,
        role: 'user',
      };
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'تىزىملىتىۋاتىدۇ...';
      document.getElementById('auth-error').textContent = '';
      try {
        await Api.register(data);
        const loginRes = await Api.login(data.username, data.password);
        const token = loginRes.access_token || loginRes.token;
        if (token) {
          Api.setToken(token);
          this.showMainApp();
          this.loadInitialData();
          this.showToast('تىزىملىتىش مۇۋەپپەقىيەتلىك بولدى', 'success');
        }
      } catch (err) {
        document.getElementById('auth-error').textContent = err.message || 'تىزىملىتىش مەغلۇب بولدى';
      } finally {
        btn.disabled = false; btn.textContent = 'تىزىملىتىش';
      }
    });

    // WeChat Login
    document.getElementById('wechat-login-btn').addEventListener('click', async () => {
      const btn = document.getElementById('wechat-login-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'WeChat ئارقىلىق كىرىۋاتىدۇ...';
      document.getElementById('auth-error').textContent = '';
      try {
        const code = await this.getWechatCode();
        if (!code) throw { message: 'WeChat ئىجازەت ئېلىنمىدى' };
        const res = await Api.wechatLogin(code);
        const token = res.access_token || res.token || (typeof res === 'string' ? res : null);
        if (!token) throw { message: 'توكن ئېلىنمىدى' };
        Api.setToken(token);
        this.showMainApp();
        this.loadInitialData();
        this.showToast('مۇۋەپپەقىيەتلىك كىردىڭىز', 'success');
      } catch (err) {
        if (err.message && err.message.includes('ئىجازەت ئېلىنمىدى')) {
          this.showToast(err.message, 'error');
        } else {
          document.getElementById('auth-error').textContent = err.message || 'WeChat ئارقىلىق كىرىش مەغلۇب بولدى';
        }
      } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = 'WeChat ئارقىلىق كىرىش';
      }
    });

    // WeChat Register
    document.getElementById('wechat-register-btn').addEventListener('click', async () => {
      const btn = document.getElementById('wechat-register-btn');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'تىزىملىتىۋاتىدۇ...';
      document.getElementById('auth-error').textContent = '';
      try {
        const code = await this.getWechatCode();
        if (!code) throw { message: 'WeChat ئىجازەت ئېلىنمىدى' };
        const nicknameInput = document.querySelector('#register-form input[name="nickname"]');
        const nickname = nicknameInput ? nicknameInput.value.trim() : '';
        const res = await Api.wechatRegister(code, nickname);
        const token = res.access_token || res.token || (typeof res === 'string' ? res : null);
        if (token) {
          Api.setToken(token);
          this.showMainApp();
          this.loadInitialData();
          this.showToast('تىزىملىتىش مۇۋەپپەقىيەتلىك بولدى', 'success');
        }
      } catch (err) {
        if (err.message && err.message.includes('ئىجازەت ئېلىنمىدى')) {
          this.showToast(err.message, 'error');
        } else {
          document.getElementById('auth-error').textContent = err.message || 'WeChat ئارقىلىق تىزىملىتىش مەغلۇب بولدى';
        }
      } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = 'WeChat ئارقىلىق تىزىملىتىش';
      }
    });

    // Bottom nav
    document.querySelectorAll('.nav-item').forEach(nav => {
      nav.addEventListener('click', () => this.switchPage(nav.dataset.page));
    });

    // Search
    document.getElementById('search-btn').addEventListener('click', () => {
      const sb = document.getElementById('search-bar');
      sb.classList.toggle('hidden');
      if (!sb.classList.contains('hidden')) document.getElementById('search-input').focus();
    });
    document.getElementById('search-close').addEventListener('click', () => {
      document.getElementById('search-bar').classList.add('hidden');
      document.getElementById('search-input').value = '';
      this.state.searchQuery = '';
      this.renderMovies();
    });
    document.getElementById('search-input').addEventListener('input', (e) => {
      this.state.searchQuery = e.target.value.trim();
      this.renderMovies();
    });

    // Detail close
    document.getElementById('detail-close').addEventListener('click', () => this.closeDetail());

    // List modal close
    document.getElementById('list-modal-close').addEventListener('click', () => {
      document.getElementById('list-modal').classList.remove('active');
    });

    // Edit profile
    document.getElementById('menu-edit-profile').addEventListener('click', () => this.openEditProfile());
    document.getElementById('edit-close').addEventListener('click', () => {
      document.getElementById('edit-modal').classList.remove('active');
    });
    document.getElementById('edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'ساقلىنىۋاتىدۇ...';
      try {
        await Api.updateProfile({ nickname: fd.get('nickname').trim(), email: fd.get('email').trim() || undefined });
        this.showToast('ئۇچۇرلىرىڭىز ساقلاندى', 'success');
        document.getElementById('edit-modal').classList.remove('active');
        this.loadProfile();
      } catch (err) {
        this.showToast(err.message || 'ساقلاش مەغلۇب بولدى', 'error');
      } finally {
        btn.disabled = false; btn.textContent = 'ساقلاش';
      }
    });

    // VIP check (menu + promo banner)
    const vipHandler = async () => {
      try {
        const res = await Api.checkVip();
        if (res.isVip || res.vip || res.active) {
          const exp = res.expiresAt ? new Date(res.expiresAt).toLocaleDateString('ug') : '';
          this.showToast(exp ? `VIP ئەزا — ۋاقتى: ${exp}` : 'VIP ئەزاسى — ھوقۇقىڭىز ئاكتىپ', 'success');
        } else {
          this.showToast('VIP ھوقۇقىڭىز يوق', 'error');
        }
      } catch (err) {
        this.showToast(err.message || 'تەكشۈرۈش مەغلۇب بولدى', 'error');
      }
    };
    document.getElementById('menu-vip').addEventListener('click', vipHandler);
    document.getElementById('promo-vip-btn').addEventListener('click', vipHandler);

    // Profile stat items -> open list modal
    document.getElementById('stat-history').addEventListener('click', () => this.openListModal('history'));
    document.getElementById('stat-favorites').addEventListener('click', () => this.openListModal('favorites'));
    document.getElementById('menu-history').addEventListener('click', () => this.openListModal('history'));
    document.getElementById('menu-favorites').addEventListener('click', () => this.openListModal('favorites'));

    // Logout
    document.getElementById('menu-logout').addEventListener('click', () => {
      Api.setToken(null);
      this.state.user = null;
      this.state.movies = [];
      this.state.categories = [];
      this.state.favorites = [];
      this.state.history = [];
      this.state.activitiesLoaded = false;
      this.showAuth();
      this.showToast('چىكىندىڭىز', 'success');
    });

    // Detail actions
    document.getElementById('btn-fav').addEventListener('click', () => this.toggleFavorite());
    document.getElementById('btn-play').addEventListener('click', () => {
      if (this.state.currentMovie) {
        this.showToast('كىنو قويۇلىۋاتىدۇ...', 'success');
        this.addHistory(this.state.currentMovie.id);
      }
    });
  },

  // ===== Data Loading =====
  async loadInitialData() {
    await Promise.all([this.loadMovies(), this.loadCategories()]);
    this.loadProfile();
  },

  async loadMovies() {
    try {
      const res = await Api.getMovies({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });
      this.state.movies = this.normalizeMovies(res);
      this.renderBannerAd();
      this.renderUserAvatars();
      this.renderCategoryGrids();
    } catch (err) {
      this.renderMoviesError(err.message);
    }
  },

  async loadCategories() {
    try {
      const res = await Api.getCategories();
      this.state.categories = this.normalizeList(res);
      this.renderCategoryChips();
    } catch (err) { console.error('Categories:', err); }
  },

  async loadCategoriesPage() {
    const container = document.getElementById('category-list');
    if (this.state.categories.length === 0) {
      container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>يۈكلىنىۋاتىدۇ...</p></div>';
      try {
        const res = await Api.getCategories();
        this.state.categories = this.normalizeList(res);
      } catch {
        container.innerHTML = this.emptyStateHTML('كاتېگورىيە تېپىلمىدى', '');
        return;
      }
    }
    this.renderCategoriesPage();
  },

  async loadProfile() {
    if (!Api.isLoggedIn()) return;
    try {
      const res = await Api.getProfile();
      this.state.user = this.normalizeUser(res);
      this.renderProfile();
      // Load counts
      this.loadProfileCounts();
    } catch (err) {
      if (err.status === 401) {
        Api.setToken(null);
        this.showAuth();
        this.showToast('ئۇلىنىش ۋاقتى توشتى، قايتا كىرىڭ', 'error');
      }
    }
  },

  async loadProfileCounts() {
    try {
      const [favRes, histRes] = await Promise.all([
        Api.getFavorites().catch(() => []),
        Api.getHistory().catch(() => []),
      ]);
      this.state.favorites = this.normalizeMovies(favRes);
      this.state.history = this.normalizeMovies(histRes);
      document.getElementById('fav-count').textContent = this.state.favorites.length;
      document.getElementById('history-count').textContent = this.state.history.length;
    } catch { /* ignore */ }
  },

  // ===== Activities Page =====
  async loadActivities() {
    if (this.state.activitiesLoaded && this.state.movies.length > 0) {
      this.renderActivities();
      return;
    }

    // Ensure movies are loaded
    if (this.state.movies.length === 0) {
      try {
        const res = await Api.getMovies({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });
        this.state.movies = this.normalizeMovies(res);
      } catch (err) {
        document.getElementById('hot-ranking').innerHTML = this.emptyStateHTML('يۈكلىيەلمىدى', err.message);
        return;
      }
    }

    this.renderActivities();
    this.state.activitiesLoaded = true;
  },

  renderActivities() {
    const movies = this.state.movies;
    if (movies.length === 0) return;

    // Hot ranking — sort by viewCount desc, top 10
    const hot = [...movies].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 10);
    this.renderRanking('hot-ranking', hot);

    // New releases — sort by id desc (latest added), top 6
    const newReleases = [...movies].sort((a, b) => {
      const aId = parseInt(String(a.id).replace(/\D/g, '')) || 0;
      const bId = parseInt(String(b.id).replace(/\D/g, '')) || 0;
      return bId - aId;
    }).slice(0, 6);
    this.renderMovieGrid('new-releases', newReleases);

    // Top rated — sort by rating desc, top 6
    const topRated = [...movies]
      .filter(m => m.rating)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);
    this.renderMovieGrid('top-rated', topRated);
  },

  renderRanking(containerId, movies) {
    const container = document.getElementById(containerId);
    if (!movies || movies.length === 0) {
      container.innerHTML = this.emptyStateHTML('كىنو تېپىلمىدى', '');
      return;
    }

    container.innerHTML = movies.map((m, i) => {
      const rank = i + 1;
      const rankClass = rank <= 3 ? `top-${rank}` : '';
      const poster = m.poster || m.backdrop;
      let posterHTML;
      if (poster) {
        posterHTML = `<img src="${this.escapeHtml(poster)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
          <div class="poster-placeholder" style="display:none;"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V4h-4z"/></svg></div>`;
      } else {
        posterHTML = `<div class="poster-placeholder"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V4h-4z"/></svg></div>`;
      }

      const views = m.viewCount !== undefined ? this.formatNumber(m.viewCount) : '';
      const rating = m.rating ? Number(m.rating).toFixed(1) : '';

      return `
        <div class="rank-item" data-id="${m.id}">
          <div class="rank-number ${rankClass}">${rank}</div>
          <div class="rank-poster">${posterHTML}</div>
          <div class="rank-info">
            <h3>${this.escapeHtml(m.title || 'نامسىز')}</h3>
            <div class="rank-meta">
              ${m.year ? `<span>${m.year}</span>` : ''}
              ${rating ? `<span class="rating-mini">★ ${rating}</span>` : ''}
              ${views ? `<span class="views"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ${views}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.rank-item').forEach(item => {
      item.addEventListener('click', () => this.openDetail(item.dataset.id));
    });
  },

  renderMovieGrid(containerId, movies) {
    const container = document.getElementById(containerId);
    if (!movies || movies.length === 0) {
      container.innerHTML = this.emptyStateHTML('كىنو تېپىلمىدى', '');
      return;
    }
    container.innerHTML = movies.map(m => this.movieCardHTML(m)).join('');
    this.bindMovieCards(container);
  },

  // ===== List Modal (favorites / history sub-page) =====
  async openListModal(type) {
    const modal = document.getElementById('list-modal');
    const titleEl = document.getElementById('list-modal-title');
    const content = document.getElementById('list-modal-content');

    const titles = {
      favorites: 'ياقتۇرىدىغانلار',
      history: 'كۆرۈش خاتىرىسى',
    };
    titleEl.textContent = titles[type] || '';
    content.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>يۈكلىنىۋاتىدۇ...</p></div>';
    modal.classList.add('active');

    try {
      let movies;
      if (type === 'favorites') {
        const res = await Api.getFavorites();
        movies = this.normalizeMovies(res);
        this.state.favorites = movies;
        document.getElementById('fav-count').textContent = movies.length;
      } else {
        const res = await Api.getHistory();
        movies = this.normalizeMovies(res);
        this.state.history = movies;
        document.getElementById('history-count').textContent = movies.length;
      }

      if (movies.length === 0) {
        const emptyMsgs = {
          favorites: ['تېخى ياقتۇرىدىغانلار يوق', 'كىنولارنى ياقتۇرۇپ ساقلاڭ'],
          history: ['كۆرۈش خاتىرىسى يوق', 'كىنو كۆرگەندە بۇ يەردە كۆرۈلىدۇ'],
        };
        content.innerHTML = this.emptyStateHTML(emptyMsgs[type][0], emptyMsgs[type][1]);
      } else {
        content.innerHTML = movies.map(m => this.movieCardHTML(m)).join('');
        this.bindMovieCards(content);
      }
    } catch (err) {
      if (err.status === 401) {
        this.showToast('كىرىڭ', 'error');
        modal.classList.remove('active');
      } else {
        content.innerHTML = this.emptyStateHTML('يۈكلىيەلمىدى', err.message);
      }
    }
  },

  // ===== Banner Ad =====
  renderBannerAd() {
    const slider = document.getElementById('banner-slider');
    const dots = document.getElementById('banner-dots');
    if (!slider || !dots) return;

    const promoMovies = this.state.movies.slice(0, 3);
    if (promoMovies.length === 0) {
      document.getElementById('banner-ad').style.display = 'none';
      return;
    }

    const tags = ['VIP ئالاھىدە', 'يېڭى چىققان', 'ئالدىنقى 10'];

    slider.innerHTML = promoMovies.map((m, i) => {
      const backdrop = m.backdrop || m.poster || '';
      const poster = m.poster || m.backdrop || '';
      const title = m.title || 'نامسىز';
      const desc = m.description || m.summary || 'بۇ كىنو ئىلەكلىك مۇنازىرە ۋە ئەڭ يۇقىرى باھاغا ئىگە.';
      return `
        <div class="banner-slide" data-index="${i}">
          <div class="banner-card" data-id="${m.id}">
            <div class="banner-bg" style="background-image: url('${this.escapeHtml(backdrop)}');"></div>
            <div class="banner-overlay"></div>
            <div class="banner-content">
              <div class="banner-text">
                <span class="banner-tag">${tags[i % tags.length]}</span>
                <div class="banner-title">${this.escapeHtml(title)}</div>
                <div class="banner-desc">${this.escapeHtml(desc.slice(0, 50))}${desc.length > 50 ? '...' : ''}</div>
              </div>
              <img class="banner-poster" src="${this.escapeHtml(poster)}" alt="${this.escapeHtml(title)}" onerror="this.style.display='none';">
              <div class="banner-cta">
                كۆرۈش
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    dots.innerHTML = promoMovies.map((_, i) =>
      `<div class="banner-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`
    ).join('');

    this.initBannerSlider();
  },

  initBannerSlider() {
    const slider = document.getElementById('banner-slider');
    const slides = slider.querySelectorAll('.banner-slide');
    const dots = document.querySelectorAll('.banner-dot');
    let current = 0;
    let autoTimer = null;

    const goTo = (index) => {
      current = (index + slides.length) % slides.length;
      slider.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    };

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        goTo(parseInt(dot.dataset.index));
        resetAuto();
      });
    });

    slider.querySelectorAll('.banner-card').forEach(card => {
      card.addEventListener('click', () => this.openDetail(card.dataset.id));
    });

    const startAuto = () => {
      autoTimer = setInterval(() => goTo(current + 1), 5000);
    };
    const resetAuto = () => {
      clearInterval(autoTimer);
      startAuto();
    };
    startAuto();
  },

  // ===== User Avatars =====
  renderUserAvatars() {
    const container = document.getElementById('user-avatars');
    if (!container) return;

    const users = [
      { name: 'ئابدۇرېھىم', avatar: '', vip: true, badge: 'V' },
      { name: 'گۈلچېخرە', avatar: '', vip: false, badge: '' },
      { name: 'مەمەتئەلى', avatar: '', vip: true, badge: 'V' },
      { name: 'نۇرگۈل', avatar: '', vip: false, badge: '' },
      { name: 'ئىسمايىل', avatar: '', vip: false, badge: '' },
    ];

    const colors = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)',
    ];

    container.innerHTML = users.map((user, i) => {
      const initial = user.name ? user.name.charAt(0) : '?';
      return `
        <div class="user-avatar-item" style="animation-delay: ${i * 0.08}s" data-idx="${i}">
          <div class="user-avatar-ring ${user.vip ? 'vip' : ''}">
            ${user.avatar
              ? `<img class="user-avatar-img" src="${this.escapeHtml(user.avatar)}" alt="${this.escapeHtml(user.name)}">`
              : `<div class="user-avatar-placeholder" style="background: ${colors[i % colors.length]}; color: white; font-weight: 700; font-size: 1.1rem;">${initial}</div>`
            }
            ${user.badge ? `<span class="user-avatar-badge">${user.badge}</span>` : ''}
          </div>
          <span class="user-avatar-name">${this.escapeHtml(user.name)}</span>
        </div>`;
    }).join('');

    this.bindAvatarInteractions(container);
  },

  bindAvatarInteractions(container) {
    const items = container.querySelectorAll('.user-avatar-item');
    items.forEach(item => {
      const ring = item.querySelector('.user-avatar-ring');
      const inner = ring.querySelector('.user-avatar-img, .user-avatar-placeholder');
      let hoverTimer = null;

      item.addEventListener('mouseenter', () => {
        ring.style.animationDuration = '2s';
        if (inner) inner.style.animationDuration = '2s';
      });

      item.addEventListener('mouseleave', () => {
        const isVip = ring.classList.contains('vip');
        ring.style.animationDuration = isVip ? '6s' : '8s';
        if (inner) inner.style.animationDuration = isVip ? '6s' : '8s';
      });

      item.addEventListener('click', () => {
        ring.style.animation = 'none';
        inner.style.animation = 'none';
        void ring.offsetWidth;
        ring.style.animation = 'avatarPop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), avatarSpin 8s linear infinite';
        if (inner) {
          inner.style.animation = 'none';
          void inner.offsetWidth;
          inner.style.animation = 'avatarSpinReverse 8s linear infinite';
        }
        this.showToast(item.querySelector('.user-avatar-name').textContent + ' نى زىيارەت قىلىش');
      });
    });
  },

  // ===== Category Grids =====
  renderCategoryGrids() {
    const cats = [
      { key: 'movie', gridId: 'grid-movie', keywords: ['كىنو', '电影', 'movie', 'film'] },
      { key: 'tv', gridId: 'grid-tv', keywords: ['تېلېۋىزىيە', '电视剧', 'tv', 'series', 'پەسلىل'] },
      { key: 'anime', gridId: 'grid-anime', keywords: ['كارتۇن', '动漫', 'anime', 'cartoon', '动画'] },
    ];

    cats.forEach(cat => {
      const grid = document.getElementById(cat.gridId);
      if (!grid) return;

      let filtered = this.state.movies.filter(m => {
        const cats = m.categories || m.categoryIds || [];
        const catName = (m.category && (m.category.name || m.category.title || '')) || '';
        const title = m.title || '';
        const allText = [...cats.map(c => (c.name || c.title || '')), catName, title].join(' ').toLowerCase();
        return cat.keywords.some(kw => allText.includes(kw.toLowerCase()));
      });

      if (filtered.length < 9) {
        const allMovies = [...this.state.movies];
        const usedIds = new Set(filtered.map(m => m.id));
        for (const m of allMovies) {
          if (filtered.length >= 9) break;
          if (!usedIds.has(m.id)) {
            filtered.push(m);
            usedIds.add(m.id);
          }
        }
      }

      filtered = filtered.slice(0, 9);

      if (filtered.length === 0) {
        grid.innerHTML = this.emptyStateHTML('مەزمۇن يوق', '');
        return;
      }

      grid.innerHTML = filtered.map((m, i) => this.movieCardHTML(m, i)).join('');
      this.bindMovieCards(grid);
    });
  },

  // ===== Rendering =====
  renderMovies() {
    const container = document.getElementById('movie-grid');
    let movies = this.state.movies;

    if (this.state.activeCategory) {
      movies = movies.filter(m => {
        const cats = m.categories || m.categoryIds || [];
        return cats.includes(this.state.activeCategory) ||
               (m.category && m.category.id === this.state.activeCategory);
      });
    }

    if (this.state.searchQuery) {
      const q = this.state.searchQuery.toLowerCase();
      movies = movies.filter(m =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.originalTitle || '').toLowerCase().includes(q) ||
        (m.director || '').toLowerCase().includes(q)
      );
    }

    if (movies.length === 0) {
      container.innerHTML = this.emptyStateHTML('كىنو تېپىلمىدى', 'باشقا ئاچقۇچ سۆز سىناپ بېقىڭ');
      return;
    }

    const displayMovies = movies.slice(0, 9);
    container.innerHTML = displayMovies.map((m, i) => this.movieCardHTML(m, i)).join('');
    this.bindMovieCards(container);
  },

  renderMoviesError(msg) {
    ['grid-movie', 'grid-tv', 'grid-anime'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<div class="empty-state"><h3>يۈكلىيەلمىدى</h3><p>${msg || 'كېيىن قايتا سىناڭ'}</p></div>`;
    });
  },

  renderCategoryChips() {
    const container = document.getElementById('category-chips');
    if (!container) return;
    let html = `<button class="category-chip active" data-cat="">ھەممىسى</button>`;
    html += this.state.categories.map((c, i) => {
      const name = c.name || c.title || c.label || 'كاتېگورىيە';
      return `<button class="category-chip" data-cat="${c.id}" style="animation-delay: ${i * 0.03}s">${this.escapeHtml(name)}</button>`;
    }).join('');
    container.innerHTML = html;

    container.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.state.activeCategory = chip.dataset.cat || null;
        this.renderMovies();
      });
    });
  },

  renderCategoriesPage() {
    const container = document.getElementById('category-list');
    if (this.state.categories.length === 0) {
      container.innerHTML = this.emptyStateHTML('كاتېگورىيە يوق', '');
      return;
    }
    container.innerHTML = this.state.categories.map(c => {
      const name = c.name || c.title || c.label || 'كاتېگورىيە';
      const desc = c.description || '';
      return `
        <div class="category-card" data-cat="${c.id}">
          <div class="cat-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
              <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
              <line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/>
              <line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/>
              <line x1="17" y1="7" x2="22" y2="7"/>
            </svg>
          </div>
          <div class="cat-info">
            <h3>${this.escapeHtml(name)}</h3>
            ${desc ? `<p>${this.escapeHtml(desc)}</p>` : ''}
          </div>
          <svg class="chevron" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </div>`;
    }).join('');

    container.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const catId = card.dataset.cat;
        this.state.activeCategory = catId;
        this.switchPage('home');
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        const target = document.querySelector(`.chip[data-cat="${catId}"]`);
        if (target) target.classList.add('active');
        this.renderMovies();
      });
    });
  },

  renderProfile() {
    const user = this.state.user;
    if (!user) return;

    document.getElementById('profile-nickname').textContent = user.nickname || user.username || '';
    document.getElementById('profile-username').textContent = '@' + (user.username || '');

    const roleEl = document.getElementById('profile-role');
    const role = user.role || 'user';
    roleEl.className = `role-badge ${role}`;
    const roleLabels = { user: 'ئادەتتىكى ئەزا', vip: 'VIP ئەزا', admin: 'باشقۇرغۇچى' };
    roleEl.textContent = roleLabels[role] || role;

    const vipText = document.getElementById('vip-status-text');
    if (role === 'vip') {
      if (user.vipExpiresAt) {
        const exp = new Date(user.vipExpiresAt).toLocaleDateString('ug');
        vipText.textContent = `VIP ھوقۇقىڭىز ئاكتىپ — ۋاقتى: ${exp}`;
      } else {
        vipText.textContent = 'VIP ھوقۇقىڭىز ئاكتىپ';
      }
    } else if (role === 'admin') {
      vipText.textContent = 'باشقۇرغۇچى ھوقۇقى';
    } else {
      vipText.textContent = 'VIP ئەزا بولۇپ تېخىمۇ كۆپ كىنو كۆرۈڭ';
    }
  },

  movieCardHTML(movie, index = 0) {
    const poster = movie.poster || movie.backdrop;
    const title = movie.title || 'نامسىز';
    const year = movie.year || '';
    const rating = movie.rating ? Number(movie.rating).toFixed(1) : null;
    const isNew = index < 6;
    const delay = (index % 12) * 0.03;

    let posterHTML;
    if (poster) {
      posterHTML = `<img src="${this.escapeHtml(poster)}" alt="${this.escapeHtml(title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
        <div class="poster-placeholder" style="display:none;"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V4h-4z"/></svg></div>`;
    } else {
      posterHTML = `<div class="poster-placeholder"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V4h-4z"/></svg></div>`;
    }

    return `
      <div class="movie-card" data-id="${movie.id}" style="animation-delay: ${delay}s">
        ${isNew ? '<span class="movie-card-badge">يېڭى</span>' : ''}
        <span class="movie-card-hd">HD</span>
        <img class="movie-poster" src="${this.escapeHtml(poster || '')}" alt="${this.escapeHtml(title)}" loading="lazy" onerror="this.style.display='none';">
        <div class="movie-card-info">
          <div class="movie-title">${this.escapeHtml(title)}</div>
          <div class="movie-meta">
            ${rating ? `<span class="movie-rating">★ ${rating}</span>` : ''}
            ${year ? `<span class="movie-year">${year}</span>` : ''}
          </div>
        </div>
      </div>`;
  },

  bindMovieCards(container) {
    container.querySelectorAll('.movie-card').forEach(card => {
      card.addEventListener('click', () => this.openDetail(card.dataset.id));
    });
  },

  // ===== Movie Detail =====
  async openDetail(id) {
    const modal = document.getElementById('movie-detail');
    modal.classList.add('active');
    document.getElementById('detail-title').textContent = 'يۈكلىنىۋاتىدۇ...';
    document.getElementById('detail-description').textContent = '';
    document.getElementById('detail-poster-img').style.display = 'none';
    document.getElementById('detail-original-title').textContent = '';

    try {
      const movie = await Api.getMovie(id);
      const m = this.normalizeMovie(movie);
      this.state.currentMovie = m;

      document.getElementById('detail-title').textContent = m.title || 'نامسىز';

      if (m.originalTitle) {
        document.getElementById('detail-original-title').textContent = m.originalTitle;
        document.getElementById('detail-original-title').style.display = 'block';
      } else {
        document.getElementById('detail-original-title').style.display = 'none';
      }

      const metaItems = [];
      if (m.year) metaItems.push(`<span class="meta-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>${m.year}</span></span>`);
      if (m.duration) metaItems.push(`<span class="meta-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg><span>${m.duration} مىنۇت</span></span>`);
      if (m.rating) metaItems.push(`<span class="meta-item rating-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg><span>${Number(m.rating).toFixed(1)}</span></span>`);
      if (m.viewCount !== undefined) metaItems.push(`<span class="meta-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>${this.formatNumber(m.viewCount)} كۆرۈلگەن</span></span>`);
      document.querySelector('.detail-meta').innerHTML = metaItems.join('');

      const bd = m.backdrop || m.poster;
      const bdImg = document.getElementById('detail-backdrop-img');
      if (bd) { bdImg.src = bd; bdImg.style.display = 'block'; }
      else { bdImg.style.display = 'none'; }

      const posterImg = document.getElementById('detail-poster-img');
      if (m.poster) {
        posterImg.src = m.poster;
        posterImg.style.display = 'block';
      }

      document.getElementById('detail-description').textContent = m.description || 'چۈشەندۈرۈش يوق';

      const dirSec = document.getElementById('detail-director-section');
      if (m.director) { dirSec.style.display = 'block'; document.getElementById('detail-director').textContent = m.director; }
      else { dirSec.style.display = 'none'; }

      const castSec = document.getElementById('detail-cast-section');
      if (m.cast) { castSec.style.display = 'block'; document.getElementById('detail-cast').textContent = m.cast; }
      else { castSec.style.display = 'none'; }

      const catEl = document.getElementById('detail-categories');
      if (m.categoryNames && m.categoryNames.length > 0) {
        catEl.innerHTML = m.categoryNames.map(n => `<span class="tag">${this.escapeHtml(n)}</span>`).join('');
        catEl.style.display = 'flex';
      } else {
        catEl.style.display = 'none';
      }

      this.checkFavoriteStatus(m.id);
      this.incrementView(m.id);
      this.bindDetailButtons();
      setTimeout(() => this.renderEpisodes(), 50);
    } catch (err) {
      this.showToast(err.message || 'كىنو ئۇچۇرىنى يۈكلىيەلمىدى', 'error');
      this.closeDetail();
    }
  },

  bindDetailButtons() {
    const shareBtn = document.getElementById('btn-share');
    const downloadBtn = document.getElementById('btn-download');
    const playBtn = document.getElementById('btn-play');

    if (shareBtn && !shareBtn._bound) {
      shareBtn._bound = true;
      shareBtn.addEventListener('click', () => {
        shareBtn.style.animation = 'none';
        void shareBtn.offsetWidth;
        shareBtn.style.animation = 'heartBeat 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        this.showToast('ھەمبەھىرلەش مۇۋەپپەقىيەتلىك', 'success');
        setTimeout(() => { shareBtn.style.animation = ''; }, 500);
      });
    }

    if (downloadBtn && !downloadBtn._bound) {
      downloadBtn._bound = true;
      downloadBtn.addEventListener('click', () => {
        downloadBtn.style.animation = 'none';
        void downloadBtn.offsetWidth;
        downloadBtn.style.animation = 'heartBeat 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        this.showToast('چۈشۈرۈش باشلىنىدۇ...', 'success');
        setTimeout(() => { downloadBtn.style.animation = ''; }, 500);
      });
    }

    if (playBtn && !playBtn._bound) {
      playBtn._bound = true;
      playBtn.addEventListener('click', () => {
        playBtn.style.transform = 'scale(0.95)';
        setTimeout(() => { playBtn.style.transform = ''; }, 150);
      });
    }
  },

  // ===== Episodes =====
  renderEpisodes() {
    const section = document.getElementById('episodes-section');
    const grid = document.getElementById('episodes-grid');
    const countEl = document.getElementById('episodes-count');
    if (!section || !grid) return;

    const m = this.state.currentMovie;
    if (!m) return;

    const catNames = (m.categoryNames || []).join(' ').toLowerCase();
    const title = (m.title || '').toLowerCase();
    const isSeries = /tv|series|تېلېۋىزىيە|电视剧|پەسلىل|连续剧|drama|cartoon|كارتۇن|动漫|动画|anime/.test(catNames + ' ' + title);
    const hasEpisodes = m.totalEpisodes && m.totalEpisodes > 1;

    if (!isSeries && !hasEpisodes) {
      section.style.display = 'none';
      return;
    }

    const episodeCount = hasEpisodes ? m.totalEpisodes : (isSeries ? 12 : 0);
    if (episodeCount <= 0) {
      section.style.display = 'none';
      return;
    }

    const vipStart = Math.floor(episodeCount * 0.4);

    const episodes = [];
    for (let i = 1; i <= episodeCount; i++) {
      episodes.push({
        num: i,
        vip: i > vipStart,
        played: i < 4,
        title: `${i}-قىسىم`
      });
    }

    this.state.episodes = episodes;
    this.state.epFilter = 'all';
    this.state.currentEp = 3;

    countEl.textContent = `${episodeCount} قىسىم`;
    section.style.display = 'block';

    this.renderEpisodeGrid(episodes);
    this.bindEpisodeFilters();
  },

  renderEpisodeGrid(episodes) {
    const grid = document.getElementById('episodes-grid');
    if (!grid) return;

    grid.className = 'episodes-grid';

    grid.innerHTML = episodes.map((ep, i) => `
      <div class="episode-item ${ep.vip ? 'vip' : ''} ${ep.played ? 'played' : ''} ${this.state.currentEp === ep.num ? 'playing' : ''}"
           data-ep="${ep.num}"
           style="animation-delay: ${i * 0.02}s">
        <span class="ep-num">${ep.num}</span>
      </div>
    `).join('');

    grid.querySelectorAll('.episode-item').forEach(item => {
      item.addEventListener('click', () => {
        const epNum = parseInt(item.dataset.ep);
        this.selectEpisode(epNum);
      });
    });
  },

  selectEpisode(epNum) {
    const ep = this.state.episodes.find(e => e.num === epNum);
    if (!ep) return;

    if (ep.vip) {
      this.showToast('بۇ قىسىم ئەزا ئىشلىتىشىگە خاس', 'error');
      return;
    }

    this.state.currentEp = epNum;

    document.querySelectorAll('.episode-item').forEach(item => {
      const n = parseInt(item.dataset.ep);
      item.classList.remove('playing');
      if (n === epNum) item.classList.add('playing');
      if (n < epNum) item.classList.add('played');
    });

    const epItem = document.querySelector(`.episode-item[data-ep="${epNum}"]`);
    if (epItem) {
      epItem.style.animation = 'none';
      void epItem.offsetWidth;
      epItem.style.animation = 'heartBeat 0.35s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    }

    this.showToast(`${epNum}-قىسىم قويۇلىۋاتىدۇ...`, 'success');
  },

  bindEpisodeFilters() {
    const btns = document.querySelectorAll('.ep-filter-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        if (this.state.epFilter === filter) return;

        this.state.epFilter = filter;
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        let filtered = this.state.episodes;
        if (filter === 'free') filtered = this.state.episodes.filter(e => !e.vip);
        if (filter === 'vip') filtered = this.state.episodes.filter(e => e.vip);

        this.renderEpisodeGrid(filtered);
      });
    });
  },

  closeDetail() {
    const modal = document.getElementById('movie-detail');
    modal.style.animation = 'slideUp 0.3s reverse ease forwards';
    setTimeout(() => {
      modal.classList.remove('active');
      modal.style.animation = '';
      this.state.currentMovie = null;
    }, 280);
  },

  // ===== Favorites =====
  async checkFavoriteStatus(movieId) {
    const btn = document.getElementById('btn-fav');
    const btnText = document.getElementById('btn-fav-text');
    btn.classList.remove('active');
    btnText.textContent = 'ياقتۇرۇش';
    try {
      const res = await Api.getFavorites();
      const favs = this.normalizeMovies(res);
      if (favs.some(f => f.id === movieId)) {
        btn.classList.add('active');
        btnText.textContent = 'ياقتۇرۇلدى';
      }
    } catch { /* ignore */ }
  },

  async toggleFavorite() {
    if (!this.state.currentMovie) return;
    const movieId = this.state.currentMovie.id;
    const btn = document.getElementById('btn-fav');
    const btnText = document.getElementById('btn-fav-text');
    const isFav = btn.classList.contains('active');
    try {
      if (isFav) {
        await Api.removeFavorite(movieId);
        btn.classList.remove('active');
        btnText.textContent = 'ياقتۇرۇش';
        this.showToast('ياقتۇرىدىغانلاردىن چىقىرىلدى', 'success');
      } else {
        await Api.addFavorite(movieId);
        btn.classList.add('active');
        btnText.textContent = 'ياقتۇرۇلدى';
        this.showToast('ياقتۇرىدىغانلارغا قوشۇلدى', 'success');
      }
      // Update count
      this.loadProfileCounts();
    } catch (err) {
      this.showToast(err.message || 'مەشغۇلات مەغلۇب بولدى', 'error');
    }
  },

  async addHistory(movieId) {
    try { await Api.addHistory(movieId); this.loadProfileCounts(); } catch { /* silent */ }
  },

  async incrementView(movieId) {
    try { await Api.incrementView(movieId); } catch { /* silent */ }
  },

  // ===== Edit Profile =====
  openEditProfile() {
    const form = document.getElementById('edit-form');
    const user = this.state.user;
    if (user) {
      form.querySelector('[name="nickname"]').value = user.nickname || '';
      form.querySelector('[name="email"]').value = user.email || '';
    }
    document.getElementById('edit-modal').classList.add('active');
  },

  // ===== Utils =====
  showToast(msg, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  },

  formatNumber(n) {
    if (n === undefined || n === null) return '';
    const num = Number(n);
    if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return String(num);
  },

  emptyStateHTML(title, desc) {
    return `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <h3>${this.escapeHtml(title)}</h3>
        ${desc ? `<p>${this.escapeHtml(desc)}</p>` : ''}
      </div>`;
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  },

  // ===== Data Normalization =====
  normalizeMovies(res) {
    if (Array.isArray(res)) return res.map(m => this.normalizeMovie(m));
    if (res.data && Array.isArray(res.data)) return res.data.map(m => this.normalizeMovie(m));
    if (res.movies && Array.isArray(res.movies)) return res.movies.map(m => this.normalizeMovie(m));
    if (res.items && Array.isArray(res.items)) return res.items.map(m => this.normalizeMovie(m));
    return [];
  },

  normalizeMovie(m) {
    if (!m) return {};
    return {
      id: m.id || m._id || m.movieId,
      title: m.title || m.name,
      originalTitle: m.originalTitle || m.original_title,
      description: m.description || m.summary || m.plot,
      poster: m.poster || m.posterUrl || m.poster_url || m.thumbnail,
      backdrop: m.backdrop || m.backdropUrl || m.backdrop_url || m.cover,
      year: m.year || m.releaseYear,
      duration: m.duration,
      rating: m.rating || m.imdbRating || m.score,
      director: m.director,
      cast: m.cast || m.actors,
      actors: m.actors,
      viewCount: m.viewCount || m.views || m.view_count,
      categories: m.categories || m.categoryIds || [],
      categoryNames: m.categoryNames || (m.categories && m.categories.map ?
        m.categories.map(c => typeof c === 'object' ? (c.name || c.title) : c).filter(Boolean) : []),
      sources: m.sources || m.source_url || m.source || m.videoUrl,
      vip: m.vip,
      isActive: m.isActive,
      country: m.country,
    };
  },

  normalizeList(res) {
    if (Array.isArray(res)) return res;
    if (res.data && Array.isArray(res.data)) return res.data;
    if (res.categories) return res.categories;
    if (res.items) return res.items;
    return [];
  },

  normalizeUser(res) {
    if (!res) return null;
    const u = res.data || res.user || res;
    return {
      id: u.id || u._id,
      username: u.username,
      nickname: u.nickname || u.name,
      email: u.email,
      phone: u.phone,
      avatar: u.avatar,
      role: u.role || 'user',
      status: u.status,
      vipExpiresAt: u.vipExpiresAt,
      loginCount: u.loginCount,
      lastLoginAt: u.lastLoginAt,
      isActive: u.isActive,
    };
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
