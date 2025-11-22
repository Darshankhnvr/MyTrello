// Prefer Vite env variable when available; fall back to a relative `/api` path.
// Prefer Vite env variable when available; fall back to local backend during development
export const API_BASE_URL = (import.meta.env as any).VITE_API_BASE_URL || 'http://localhost:3001/api';