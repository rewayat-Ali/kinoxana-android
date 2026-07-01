/**
 * كىنوخانا API Client
 * Backend: NestJS + Express @ https://xk.uyanqi710.top
 */

const API_BASE = 'https://xk.uyanqi710.top/api/v1';

const Api = {
  _token: localStorage.getItem('kinohana_token'),

  setToken(token) {
    this._token = token;
    if (token) {
      localStorage.setItem('kinohana_token', token);
    } else {
      localStorage.removeItem('kinohana_token');
    }
  },

  getToken() {
    return this._token;
  },

  isLoggedIn() {
    return !!this._token;
  },

  async _request(method, path, body, auth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && this._token) {
      headers['Authorization'] = `Bearer ${this._token}`;
    }

    const config = { method, headers };
    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(`${API_BASE}${path}`, config);
      const text = await res.text();

      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        throw { status: res.status, message: data.message || data.error || 'خاتالىق يۈز بەردى', data };
      }

      return data;
    } catch (err) {
      if (err.status) throw err;
      throw { status: 0, message: 'تور ئۇلىنالمىدى، كېيىن قايتا سىناڭ' };
    }
  },

  // ===== Auth =====
  login(username, password) {
    return this._request('POST', '/auth/login', { username, password });
  },

  register(data) {
    return this._request('POST', '/auth/register', data);
  },

  wechatLogin(code) {
    return this._request('POST', '/auth/wechat/login', { code });
  },

  wechatRegister(code, nickname) {
    return this._request('POST', '/auth/wechat/register', { code, nickname });
  },

  // ===== Movies =====
  getMovies(params = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit);
    if (params.categoryId) query.set('categoryId', params.categoryId);
    if (params.search) query.set('search', params.search);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    const qs = query.toString();
    return this._request('GET', `/movies${qs ? '?' + qs : ''}`);
  },

  getMovie(id) {
    return this._request('GET', `/movies/${id}`);
  },

  incrementView(id) {
    return this._request('POST', `/movies/${id}/view`, null, true);
  },

  // ===== Categories =====
  getCategories() {
    return this._request('GET', '/categories');
  },

  getCategory(id) {
    return this._request('GET', `/categories/${id}`);
  },

  // ===== Member =====
  getProfile() {
    return this._request('GET', '/member/profile', null, true);
  },

  updateProfile(data) {
    return this._request('PUT', '/member/profile', data, true);
  },

  getHistory() {
    return this._request('GET', '/member/history', null, true);
  },

  addHistory(movieId) {
    return this._request('POST', `/member/history/${movieId}`, null, true);
  },

  getFavorites() {
    return this._request('GET', '/member/favorites', null, true);
  },

  addFavorite(movieId) {
    return this._request('POST', `/member/favorites/${movieId}`, null, true);
  },

  removeFavorite(movieId) {
    return this._request('DELETE', `/member/favorites/${movieId}`, null, true);
  },

  checkVip() {
    return this._request('GET', '/member/vip-status', null, true);
  },
};
