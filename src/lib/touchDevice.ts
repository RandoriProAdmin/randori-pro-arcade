import { useEffect, useState } from 'react';

/**
 * Erkennt ob das Gerät Touch unterstützt (Phone, Tablet).
 * Hybrid-Geräte (Tablet mit Tastatur) zählen ebenfalls als Touch.
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/** React-Hook-Wrapper. Beim ersten Touch flippt's auf true (für Hybrid-Geräte). */
export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(() => isTouchDevice());
  useEffect(() => {
    if (isTouch) return;
    const flip = () => setIsTouch(true);
    window.addEventListener('touchstart', flip, { once: true, passive: true });
    return () => window.removeEventListener('touchstart', flip);
  }, [isTouch]);
  return isTouch;
}
