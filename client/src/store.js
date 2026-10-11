import { configureStore } from '@reduxjs/toolkit';
import projectsReducer from './features/projects/projectsSlice.js';
import authReducer from './features/auth/authSlice.js';

export const store = configureStore({
  reducer: {
    projects: projectsReducer,
    auth: authReducer,
  },
});
