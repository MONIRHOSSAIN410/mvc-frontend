import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios.js";
import {
  createLocalAccount,
  findLocalAccount,
  clearLocalAccount,
} from "../../data/localAccount.js";

const USER_KEY = "cookme-user";
const TOKEN_KEY = "cookme-token";

const loadUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
};

const persist = (user, token) => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token || "");
  } catch {
    /* ignore */
  }
};

/**
 * Did we actually reach the CookMe API?
 *
 * The API always answers a problem with JSON: { success: false, message }.
 * So anything else — no response at all, a timeout, a 404 from broken
 * routing, a 5xx, an HTML error page from the host, an empty body — means we
 * are not talking to our API, whatever status code came back. In that case
 * the browser-only profile takes over instead of showing a dead end.
 *
 * Only a real, readable message from our own API is shown to the customer.
 */
const apiUnreachable = (err) => {
  const res = err.response;
  if (!res) return true; // network error, CORS block, DNS failure
  if (err.code === "ECONNABORTED") return true; // timeout

  const { status } = res;
  if (status === 404 || status === 503 || status >= 500) return true;

  const message = res.data?.message;
  return typeof message !== "string" || !message.trim();
};

/** Logs enough to diagnose a failure without guessing. */
const explain = (label, err) => {
  const res = err.response;
  // eslint-disable-next-line no-console
  console.warn(
    `[CookMe] ${label} failed`,
    {
      url: err.config?.baseURL ? `${err.config.baseURL}${err.config.url}` : err.config?.url,
      status: res?.status ?? "(no response)",
      code: err.code,
      body: res?.data,
    }
  );
};

export const registerUser = createAsyncThunk(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/users/register", payload);
      persist(data.user, data.token);
      return data.user;
    } catch (err) {
      explain("register", err);

      // No backend, or a backend that is not answering like our API: keep a
      // browser-only profile so the shop can still be used. It is not a real
      // account — see src/data/localAccount.js.
      if (apiUnreachable(err)) {
        try {
          const user = createLocalAccount(payload);
          persist(user, "");
          return user;
        } catch (localErr) {
          return rejectWithValue(localErr.message);
        }
      }

      // Our API answered with a real reason — show exactly that.
      return rejectWithValue(err.response.data.message);
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/users/login", payload);
      persist(data.user, data.token);
      return data.user;
    } catch (err) {
      explain("login", err);

      if (apiUnreachable(err)) {
        const user = findLocalAccount(payload?.identifier);
        if (user) {
          persist(user, "");
          return user;
        }
        return rejectWithValue(
          "The CookMe server is not reachable, and no account has been created " +
            "in this browser yet. Please sign up first."
        );
      }

      return rejectWithValue(err.response.data.message);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: { user: loadUser(), loading: false, error: null },
  reducers: {
    logout(state) {
      state.user = null;
      state.error = null;
      try {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* ignore */
      }
      clearLocalAccount();
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (b) => {
    [registerUser, loginUser].forEach((thunk) => {
      b.addCase(thunk.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
        .addCase(thunk.fulfilled, (s, a) => {
          s.loading = false;
          s.error = null;
          s.user = a.payload;
        })
        .addCase(thunk.rejected, (s, a) => {
          s.loading = false;
          s.error = a.payload;
        });
    });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
