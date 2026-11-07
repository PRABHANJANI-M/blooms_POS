import { useEffect } from 'react';

type Handler = (e: KeyboardEvent) => void;
export type HotkeyMap = Record<string, Handler>;

/**
 * Registers keyboard shortcuts such as "Alt+F2" or "F10". Key names: Alt, Ctrl, Shift + key.
 * Ignores shortcuts typed inside text fields unless they include Alt/Ctrl.
 */
export function useHotkeys(map: HotkeyMap) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      const combo = parts.join('+');
      const handler = map[combo];
      if (!handler) return;
      const target = e.target as HTMLElement | null;
      const typing = !!target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (typing && !e.altKey && !e.ctrlKey && !/^F\d+$/.test(e.key) && !['PageUp', 'PageDown'].includes(e.key)) return;
      e.preventDefault();
      handler(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [map]);
}
