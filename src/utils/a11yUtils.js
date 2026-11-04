/**
 * Shared Accessibility & DOM Utilities
 * Enforces keyboard navigation, focus trap, and ARIA standards per CODING_STANDARDS.md §9 and §10.
 */

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab and Shift+Tab keyboard focus within a container element
 * @param {HTMLElement} container
 * @param {KeyboardEvent} event
 */
export function trapFocus(container, event) {
  if (!container || event.key !== 'Tab') return;

  const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
