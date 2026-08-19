import { useEffect } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ARROW_KEYS = new Set(['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft']);

// Setas de seta e texto/select precisam continuar fazendo o que sempre
// fizeram ali dentro (mover o cursor, trocar a opção) — só interceptamos
// setas fora de campos editáveis, pra não quebrar digitação.
function isTextEditable(element: Element | null): boolean {
  if (!element) return false;
  const tag = element.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (element as HTMLInputElement).type;
    return !['checkbox', 'radio', 'button', 'submit', 'range'].includes(type);
  }
  return false;
}

function isVisible(element: HTMLElement): boolean {
  return element.offsetParent !== null;
}

// Permite navegar por toda a interface só com as setas + Enter — o
// suficiente pra um controle remoto/clicker Bluetooth barato (que emula
// essas teclas) operar o app inteiro sem precisar de mouse ou Tab.
export function useArrowKeyNavigation() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const active = document.activeElement;

      if (event.key === 'Enter' && active instanceof HTMLElement && !isTextEditable(active)) {
        const type = active.tagName === 'INPUT' ? (active as HTMLInputElement).type : '';
        if (type === 'checkbox' || type === 'radio') {
          event.preventDefault();
          active.click();
        }
        return;
      }

      if (!ARROW_KEYS.has(event.key) || isTextEditable(active)) return;

      const focusable = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
      if (focusable.length === 0) return;

      const currentIndex = active instanceof HTMLElement ? focusable.indexOf(active) : -1;
      const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
      const nextIndex = forward
        ? (currentIndex + 1) % focusable.length
        : (currentIndex - 1 + focusable.length) % focusable.length;

      event.preventDefault();
      focusable[nextIndex]?.focus();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
