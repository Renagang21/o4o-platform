import {
  axios_default
} from "./chunk-A5HYYSF6.js";

// ../../packages/auth-client/dist/client.js
var AuthClient = class {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.api = axios_default.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json"
      }
    });
    this.api.interceptors.request.use((config) => {
      var _a;
      let token = localStorage.getItem("accessToken") || localStorage.getItem("authToken");
      if (!token) {
        const authStorage = localStorage.getItem("admin-auth-storage");
        if (authStorage) {
          try {
            const parsed = JSON.parse(authStorage);
            if ((_a = parsed.state) == null ? void 0 : _a.token) {
              token = parsed.state.token;
            }
          } catch {
          }
        }
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }
  async login(credentials) {
    let authUrl;
    if (this.baseURL.includes("api.neture.co.kr")) {
      authUrl = "https://api.neture.co.kr/api/auth/login";
    } else {
      authUrl = `${this.baseURL.replace("/api/v1", "/api")}/auth/login`;
    }
    const response = await axios_default.post(authUrl, credentials);
    return response.data;
  }
  async logout() {
    let authUrl;
    if (this.baseURL.includes("api.neture.co.kr")) {
      authUrl = "https://api.neture.co.kr/api/auth/logout";
    } else {
      authUrl = `${this.baseURL.replace("/api/v1", "/api")}/auth/logout`;
    }
    await axios_default.post(authUrl);
  }
  async checkSession() {
    try {
      const response = await this.api.get("/accounts/sso/check");
      return response.data;
    } catch (error) {
      return { isAuthenticated: false };
    }
  }
};
var getApiUrl = () => {
  var _a, _b, _c;
  const DEFAULT_API_URL = "https://api.neture.co.kr/api";
  if (typeof window === "undefined") {
    return DEFAULT_API_URL;
  }
  try {
    if ((_c = (_b = (_a = globalThis.import) == null ? void 0 : _a.meta) == null ? void 0 : _b.env) == null ? void 0 : _c.VITE_API_URL) {
      return globalThis.import.meta.env.VITE_API_URL;
    }
  } catch {
  }
  if (window.__API_URL__) {
    return window.__API_URL__;
  }
  return DEFAULT_API_URL;
};
var authClient = new AuthClient(getApiUrl());

// ../../packages/auth-client/dist/cookie-client.js
var CookieAuthClient = class {
  constructor(baseURL) {
    this.refreshPromise = null;
    this.currentToken = null;
    this.baseURL = baseURL;
    this.api = axios_default.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json"
      },
      withCredentials: true
      // Important for cookies
    });
    this.api.interceptors.response.use((response) => response, async (error) => {
      var _a;
      const originalRequest = error.config;
      if (((_a = error.response) == null ? void 0 : _a.status) === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        if (this.refreshPromise) {
          const success2 = await this.refreshPromise;
          if (success2) {
            return this.api.request(originalRequest);
          }
          throw error;
        }
        this.refreshPromise = this.refreshToken();
        const success = await this.refreshPromise;
        this.refreshPromise = null;
        if (success) {
          return this.api.request(originalRequest);
        }
      }
      return Promise.reject(error);
    });
  }
  async login(credentials) {
    const response = await this.api.post("/auth/v2/login", credentials);
    if (response.data.token) {
      this.currentToken = response.data.token;
    }
    return response.data;
  }
  async register(data) {
    const response = await this.api.post("/auth/v2/register", data);
    return response.data;
  }
  async logout() {
    try {
      await this.api.post("/auth/v2/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.currentToken = null;
    }
  }
  async logoutAll() {
    await this.api.post("/auth/v2/logout-all");
    this.currentToken = null;
  }
  async refreshToken() {
    try {
      const response = await this.api.post("/auth/v2/refresh");
      return response.data.success;
    } catch (error) {
      return false;
    }
  }
  async getCurrentUser() {
    try {
      const response = await this.api.get("/auth/v2/me");
      return response.data.user;
    } catch (error) {
      return null;
    }
  }
  getApiUrl() {
    return this.baseURL;
  }
  getAccessToken() {
    return this.currentToken;
  }
  // Cross-tab communication for session sync
  setupSessionSync() {
    if (typeof window === "undefined")
      return;
    window.addEventListener("storage", (event) => {
      if (event.key === "auth-logout") {
        window.location.reload();
      } else if (event.key === "auth-login") {
        this.refreshToken();
      }
    });
  }
  // Notify other tabs about auth changes
  broadcastAuthChange(type) {
    if (typeof window === "undefined")
      return;
    const key = `auth-${type}`;
    localStorage.setItem(key, Date.now().toString());
    setTimeout(() => localStorage.removeItem(key), 100);
  }
  // Enhanced login with session sync
  async loginWithSync(credentials) {
    const response = await this.login(credentials);
    this.broadcastAuthChange("login");
    return response;
  }
  // Enhanced logout with session sync
  async logoutWithSync() {
    await this.logout();
    this.broadcastAuthChange("logout");
  }
};
var cookieAuthClient = new CookieAuthClient(typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:4000/api/v1" : "/api/v1");
if (typeof window !== "undefined") {
  cookieAuthClient.setupSessionSync();
}

// ../../packages/auth-client/dist/sso-client.js
var SSOClient = class {
  constructor(config) {
    this.checkInterval = null;
    this.handleStorageEvent = (event) => {
      if (event.key === "sso:logout") {
        this.handleLogout();
      } else if (event.key === "sso:login") {
        this.checkSession();
      }
    };
    this.config = {
      checkInterval: 3e4,
      // Check every 30 seconds
      ...config
    };
  }
  /**
   * Initialize SSO monitoring
   */
  initialize(onSessionChange) {
    this.onSessionChange = onSessionChange;
    if (typeof window !== "undefined") {
      window.addEventListener("storage", this.handleStorageEvent);
    }
    this.startSessionMonitoring();
    this.checkSession();
  }
  /**
   * Clean up resources
   */
  destroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", this.handleStorageEvent);
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  /**
   * Start monitoring session status
   */
  startSessionMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.checkInterval = setInterval(() => {
      this.checkSession();
    }, this.config.checkInterval);
  }
  /**
   * Check current session status
   */
  async checkSession() {
    var _a, _b, _c;
    try {
      const response = await fetch(`${this.config.apiUrl}/auth/v2/me`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        (_a = this.onSessionChange) == null ? void 0 : _a.call(this, user);
        return user;
      } else {
        (_b = this.onSessionChange) == null ? void 0 : _b.call(this, null);
        return null;
      }
    } catch (error) {
      console.error("Session check error:", error);
      (_c = this.onSessionChange) == null ? void 0 : _c.call(this, null);
      return null;
    }
  }
  /**
   * Broadcast login event to other tabs
   */
  broadcastLogin() {
    if (typeof window !== "undefined") {
      localStorage.setItem("sso:login", Date.now().toString());
      localStorage.removeItem("sso:login");
    }
  }
  /**
   * Broadcast logout event to other tabs
   */
  broadcastLogout() {
    if (typeof window !== "undefined") {
      localStorage.setItem("sso:logout", Date.now().toString());
      localStorage.removeItem("sso:logout");
    }
  }
  /**
   * Handle logout from another tab/app
   */
  handleLogout() {
    var _a;
    (_a = this.onSessionChange) == null ? void 0 : _a.call(this, null);
    if (this.config.domain) {
      window.location.href = "/login";
    }
  }
  /**
   * Get session cookie value
   */
  getSessionId() {
    if (typeof document === "undefined")
      return null;
    const match = document.cookie.match(/sessionId=([^;]+)/);
    return match ? match[1] : null;
  }
  /**
   * Check if user has an active session
   */
  hasSession() {
    return !!this.getSessionId();
  }
};
var ssoClient = new SSOClient({
  apiUrl: typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:4000/api/v1" : "/api/v1"
});

export {
  AuthClient,
  authClient,
  CookieAuthClient,
  cookieAuthClient,
  SSOClient,
  ssoClient
};
//# sourceMappingURL=chunk-SZHEMHVR.js.map
