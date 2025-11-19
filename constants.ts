// Prefer Vite env variable when available; fall back to a relative `/api` path.
export const API_BASE_URL = (import.meta.env as any).VITE_API_BASE_URL || '/api';