/**
 * Data-mode switch. The app ships in "demo" mode: every read returns sample data and every
 * write is kept in memory for the session. Set VITE_DATA_MODE=api once a backend is wired in
 * (see README -> "Connecting a backend").
 */
export const DATA_MODE: 'demo' | 'api' = import.meta.env.VITE_DATA_MODE === 'api' ? 'api' : 'demo';
export const isDemo = DATA_MODE === 'demo';
export const APP_NAME = (import.meta.env.VITE_APP_NAME as string | undefined) ?? 'Blooms AI';
