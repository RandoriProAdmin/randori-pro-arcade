import { useEffect } from 'react';

/**
 * Sperrt den GESAMTEN Viewport solange ein Spiel aktiv ist:
 *   - body fixed (kein Scrollen)
 *   - touchmove blockiert (auch außerhalb des Canvas)
 *   - Pinch-Zoom blockiert
 *   - Pull-to-Refresh blockiert
 * Beim Cleanup wird die Scroll-Position wiederhergestellt.
 */
export function useGameViewportLock(isGameActive: boolean) {
  useEffect(() => {
    if (!isGameActive) return;

    const scrollY = window.scrollY;

    const preventAllScroll = (e: TouchEvent) => {
      e.preventDefault();
    };
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    document.addEventListener('touchmove', preventAllScroll, { passive: false });
    document.addEventListener('touchstart', preventZoom, { passive: false });

    const body = document.body.style;
    const html = document.documentElement.style;

    body.position = 'fixed';
    body.top = `-${scrollY}px`;
    body.left = '0';
    body.right = '0';
    body.overflow = 'hidden';
    body.touchAction = 'none';
    body.overscrollBehavior = 'none';

    html.overflow = 'hidden';
    html.touchAction = 'none';
    html.overscrollBehavior = 'none';

    return () => {
      document.removeEventListener('touchmove', preventAllScroll);
      document.removeEventListener('touchstart', preventZoom);

      body.position = '';
      body.top = '';
      body.left = '';
      body.right = '';
      body.overflow = '';
      body.touchAction = '';
      body.overscrollBehavior = '';

      html.overflow = '';
      html.touchAction = '';
      html.overscrollBehavior = '';

      window.scrollTo(0, scrollY);
    };
  }, [isGameActive]);
}
