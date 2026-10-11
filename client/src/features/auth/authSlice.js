import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
const TOKEN_KEY = 'architecture_admin_token';

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // The in-memory session still works if browser storage is unavailable.
  }
}

function getTokenPayload(token) {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
}

export const loginAdmin = createAsyncThunk(
  'auth/loginAdmin',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return rejectWithValue(body.error || 'Login failed.');
      if (!body.token) return rejectWithValue('The server did not return an authentication token.');

      const payload = getTokenPayload(body.token);
      if (payload?.role !== 'admin') {
        return rejectWithValue('This account does not have administrator access.');
      }
      saveToken(body.token);
      return { token: body.token, user: { name: payload.name, email: payload.email } };
    } catch (error) {
      return rejectWithValue(error.message || 'Unable to connect to the server.');
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: readStoredToken(),
    status: 'idle',
    error: null,
  },
  reducers: {
    logout(state) {
      state.token = null;
      state.status = 'idle';
      state.error = null;
      saveToken(null);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAdmin.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.status = 'succeeded';
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
