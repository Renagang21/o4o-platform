/**
 * CSS injection for responsive breakpoints.
 * Inline styles cannot use @media queries, so we inject a <style> tag once.
 */

let injected = false;

export function injectExplorationStyles(): void {
  if (injected || typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes hub-explore-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @media (max-width: 768px) {
      .hub-explore-ad-premium { grid-template-columns: 1fr !important; }
      .hub-explore-ad-normal { grid-template-columns: 1fr !important; }
      .hub-explore-service-grid { grid-template-columns: 1fr !important; }
      .hub-explore-promo-grid { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(style);
  injected = true;
}
