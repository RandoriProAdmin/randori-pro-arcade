import { useEffect } from 'react';

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Sanfter Scroll-Lock NUR auf Touch-Geräten:
 *   - Setzt KEIN position:fixed (zerstört das Layout)
 *   - body.overflow = 'hidden' + overscrollBehavior = 'none'
 *   - touchmove wird nur dann verhindert, wenn der Touch auf dem Spielfeld
 *     liegt (canvas oder #game-container) — Buttons, Inputs, Footer-Links
 *     funktionieren weiter.
 *   - Zwei-Finger-Pinch-Zoom blockiert.
 *
 * Auf Desktop ist der Hook ein No-Op.
 */
export function useMobileScrollLock(isGameActive: boolean) {
  useEffect(() => {
    if (!isTouchDevice() || !isGameActive) return;

    const scrollY = window.scrollY;

    // OBEREN Rand des Spielfelds in den sichtbaren Bereich scrollen.
    // Wichtig: Canvas-Element direkt anvisieren (block:'start'), nicht den
    // Container — sonst landet bei großen Containern das Canvas oberhalb
    // des Viewports.
    const target =
      (document.querySelector('#game-container canvas') as HTMLElement | null) ??
      document.getElementById('game-container');
    if (target) {
      const navbar = document.querySelector('header.sticky') as HTMLElement | null;
      const navOffset = navbar ? navbar.getBoundingClientRect().height : 0;
      const rect = target.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - navOffset - 8;
      window.scrollTo(0, Math.max(0, targetY));
    }

    // Body-Scroll erst nach kurzem Delay sperren (damit das Scrollen
    // sicher durchläuft)
    const timer = window.setTimeout(() => {
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
    }, 150);

    // touchmove nur auf dem Spielfeld blockieren (Layout bleibt scrollbar
    // wo nötig — z.B. Game-Over-Modal mit Name-Form)
    const preventScrollOnGame = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.tagName === 'CANVAS' ||
        target.closest('#game-container') ||
        target.closest('.game-area')
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', preventScrollOnGame, { passive: false });

    // Pinch-Zoom blockieren
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('touchstart', preventZoom, { passive: false });

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('touchmove', preventScrollOnGame);
      document.removeEventListener('touchstart', preventZoom);
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      window.scrollTo(0, scrollY);
    };
  }, [isGameActive]);
}
