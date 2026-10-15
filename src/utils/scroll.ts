/** Scroll to a small section anchor, never to a tall form/table container. */
export function scrollToSection(anchor: HTMLElement | null): void {
  if (!anchor) return;
  const header = document.querySelector<HTMLElement>('[data-admin-header]');
  const offset = (header?.getBoundingClientRect().height ?? 72) + 16;
  const top = Math.max(0, window.scrollY + anchor.getBoundingClientRect().top - offset);
  window.scrollTo({ top, left: window.scrollX, behavior: 'instant' });
}
