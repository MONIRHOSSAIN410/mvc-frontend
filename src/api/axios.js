import axios from "axios";
import { CATEGORIES, filterProducts, findProduct } from "../data/catalog.js";

/**
 * Where the API lives.
 *
 * - In development Vite proxies /api to the local server (vite.config.js).
 * - On a deployed site the default is the CookMe API on Vercel.
 * - VITE_API_URL overrides both, so a preview or a second backend needs no
 *   code change — set it in Vercel → Settings → Environment Variables and
 *   redeploy (Vite bakes the value in at build time).
 */
const DEPLOYED_API = "https://mv-new-backend.vercel.app/api";

const baseURL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? DEPLOYED_API : "/api");

const api = axios.create({
  baseURL,
  // Long enough for a cold serverless function, short enough that a broken
  // API does not hold the page hostage.
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cookme-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ------------------------------------------------------------------ *
 * Offline catalogue
 *
 * If the API is unreachable, or MongoDB has not been seeded, the shop would
 * render empty pages with no pictures. These interceptors fall back to the
 * bundled catalogue for the read-only product endpoints.
 *
 * The important part for speed: once the API has proved unreachable, we stop
 * dialling it for the rest of the session. Without this, every page paid the
 * full timeout again — which is what made the site feel so slow.
 * ------------------------------------------------------------------ */

const OFFLINE_KEY = "cookme-api-offline";

const markOffline = () => {
  try {
    sessionStorage.setItem(OFFLINE_KEY, "1");
  } catch {
    /* private mode — we just lose the shortcut */
  }
};

const markOnline = () => {
  try {
    sessionStorage.removeItem(OFFLINE_KEY);
  } catch {
    /* ignore */
  }
};

const isOffline = () => {
  try {
    return sessionStorage.getItem(OFFLINE_KEY) === "1";
  } catch {
    return false;
  }
};

const path = (c) => (c?.url || "").replace(/\?.*$/, "");
const isList = (c) => /^\/products\/?$/.test(path(c));
const isDetail = (c) => /^\/products\/[^/]+$/.test(path(c));
const isCategories = (c) => /^\/categories\/?$/.test(path(c));
const isCatalogue = (c) => isList(c) || isDetail(c) || isCategories(c);

const offline = (config, data) => ({
  data: { ...data, offline: true },
  status: 200,
  statusText: "OK (offline catalogue)",
  headers: {},
  config,
});

const listData = (config) => {
  const products = filterProducts(config.params || {});
  return { success: true, count: products.length, products };
};

const detailData = (config) => {
  const found = findProduct(path(config).split("/").pop());
  return found ? { success: true, ...found } : null;
};

const categoriesData = () => ({
  success: true,
  categories: CATEGORIES.map((c) => ({
    ...c,
    productCount: filterProducts({ category: c.slug }).length,
  })),
});

const localAnswer = (config) => {
  if (isList(config)) return listData(config);
  if (isCategories(config)) return categoriesData();
  if (isDetail(config)) return detailData(config);
  return null;
};

/**
 * While the API is known to be down, catalogue requests are answered from the
 * bundle without touching the network at all — instantly.
 */
api.interceptors.request.use((config) => {
  if (isOffline() && isCatalogue(config)) {
    const data = localAnswer(config);
    if (data) {
      config.adapter = () => Promise.resolve(offline(config, data));
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const config = response.config;

    // A real answer with real products means the backend is healthy again.
    if (isList(config) && response.data?.products?.length) {
      markOnline();
      return response;
    }

    if (isList(config) && !response.data?.products?.length) {
      return offline(config, listData(config));
    }
    if (isCategories(config) && !response.data?.categories?.length) {
      return offline(config, categoriesData());
    }
    return response;
  },
  (error) => {
    const config = error.config || {};
    const status = error.response?.status;

    // No response at all, a timeout, or the server saying it has no database:
    // the API cannot serve us, so remember it and stop waiting on every page.
    const apiIsDown =
      !error.response ||
      error.code === "ECONNABORTED" ||
      status === 503 ||
      status >= 500;

    if (apiIsDown) markOffline();

    const data = localAnswer(config);
    if (data) return Promise.resolve(offline(config, data));

    return Promise.reject(error);
  }
);

/** True when the shop is running on its bundled catalogue. */
export const apiIsOffline = isOffline;

export default api;
