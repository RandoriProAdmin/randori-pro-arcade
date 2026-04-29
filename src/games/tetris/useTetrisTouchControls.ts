import { useEffect, useRef, type RefObject } from 'react';
import { useTouchDevice } from '../../lib/touchDevice';

interface TetrisTouchConfig {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRotate: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  onTogglePause: () => void;
  isPlaying: boolean;
}

/**
 * Tetris-Touch-Steuerung mit Zonen-System:
 *   - Untere Hälfte des Canvas wird in 3 Zonen geteilt (links / mitte / rechts)
 *   - Tap in Links/Rechts/Mitte = Bewegen / Rotieren / Bewegen
 *   - Halten in Links/Rechts = Auto-Repeat (200ms initial, dann alle 80ms)
 *   - Tap in oberer Hälfte (überall) = Rotieren
 *   - Vertikaler Swipe (|dy| >= 50, |dy| > |dx|) = Hard Drop
 *   - Kurzer Swipe nach unten (30–80px, |dx| < 30) = Soft Drop
 *   - Zwei-Finger-Tap = Pause / Resume
 */
export function useTetrisTouchControls(config: TetrisTouchConfig) {
  const isTouch = useTouchDevice();
  // Konfig in Ref halten, damit der Effekt nur an isPlaying / isTouch hängt
  const cfgRef = useRef(config);
  cfgRef.current = config;

  useEffect(() => {
    if (!isTouch || !config.isPlaying) return;
    const canvas = config.canvasRef.current;
    if (!canvas) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let handled = false;
    let multiTouch = false;
    let repeatTimeout: number | null = null;
    let repeatInterval: number | null = null;
    let repeatAction: (() => void) | null = null;

    const clearAutoRepeat = () => {
      if (repeatTimeout !== null) {
        window.clearTimeout(repeatTimeout);
        repeatTimeout = null;
      }
      if (repeatInterval !== null) {
        window.clearInterval(repeatInterval);
        repeatInterval = null;
      }
      repeatAction = null;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        // Zwei-Finger-Tap → Pause/Resume togglen
        multiTouch = true;
        handled = true;
        clearAutoRepeat();
        cfgRef.current.onTogglePause();
        return;
      }
      e.preventDefault();
      multiTouch = false;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
      handled = false;

      const rect = canvas.getBoundingClientRect();
      const relX = (touch.clientX - rect.left) / rect.width;
      const relY = (touch.clientY - rect.top) / rect.height;

      if (relY > 0.5) {
        const zone = relX < 0.33 ? 'left' : relX > 0.66 ? 'right' : 'middle';
        if (zone === 'left') repeatAction = cfgRef.current.onMoveLeft;
        else if (zone === 'right') repeatAction = cfgRef.current.onMoveRight;
        if (zone !== 'middle') {
          repeatTimeout = window.setTimeout(() => {
            repeatAction?.();
            repeatInterval = window.setInterval(() => {
              repeatAction?.();
            }, 80);
          }, 200);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (multiTouch) return;
      e.preventDefault();
      if (handled) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      // Sobald deutlich bewegt wird, Auto-Repeat abbrechen (Tap-Halten ist vorbei)
      if (absDx > 12 || absDy > 12) clearAutoRepeat();
      // Vertikaler Swipe → sofort Hard Drop (Priorität über horizontal)
      if (absDy > absDx && absDy >= 50) {
        handled = true;
        cfgRef.current.onHardDrop();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (multiTouch) {
        // Wenn der zweite Finger losgelassen wird, Multi-Touch-Modus zurücksetzen
        if (e.touches.length === 0) multiTouch = false;
        return;
      }
      e.preventDefault();
      clearAutoRepeat();
      if (handled) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const distance = Math.hypot(dx, dy);
      const elapsed = Date.now() - startTime;

      // Tap = wenig Bewegung & kurz
      if (distance < 15 && elapsed < 300) {
        const rect = canvas.getBoundingClientRect();
        const relX = (touch.clientX - rect.left) / rect.width;
        const relY = (touch.clientY - rect.top) / rect.height;
        if (relY > 0.5) {
          if (relX < 0.33) cfgRef.current.onMoveLeft();
          else if (relX > 0.66) cfgRef.current.onMoveRight();
          else cfgRef.current.onRotate();
        } else {
          cfgRef.current.onRotate();
        }
        return;
      }

      // Kurzer Swipe nach unten (30–80px, vertikal-dominant) = Soft Drop
      if (dy > 30 && dy < 80 && Math.abs(dx) < 30) {
        cfgRef.current.onSoftDrop();
      }
    };

    const handleTouchCancel = () => {
      clearAutoRepeat();
      handled = false;
      multiTouch = false;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      clearAutoRepeat();
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isTouch, config.isPlaying, config.canvasRef]);
}
