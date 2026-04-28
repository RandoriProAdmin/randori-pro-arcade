/**
 * Prüft, ob aktuell ein Eingabe-Element fokussiert ist.
 * Spiel-Keyboard-Handler sollen früh zurückkehren, wenn `true` —
 * sonst werden Buchstaben (W/A/S/D/Pfeile/Leertaste) aus den Spielen
 * abgefangen, bevor sie ins Textfeld gelangen.
 */
export function isInputActive(): boolean {
  const a = (typeof document !== 'undefined' ? document.activeElement : null) as
    | HTMLElement
    | null;
  if (!a) return false;
  const tag = a.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (a.getAttribute('contenteditable') === 'true') return true;
  return false;
}
