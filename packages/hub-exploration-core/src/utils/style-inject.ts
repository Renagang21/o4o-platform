/**
 * CSS injection for responsive breakpoints + hover effects.
 * Inline styles cannot use @media queries or :hover, so we inject a <style> tag once.
 *
 * WO-O4O-HUB-LIST-UI-UNIFICATION-V1: HubList hover, CoreService grid responsive
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

    /* HubList row hover */
    .hub-list-row:hover { background-color: #F8FAFC !important; }

    /* CoreService card hover */
    .hub-core-card:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
      border-color: #94A3B8 !important;
    }

    @media (max-width: 768px) {
      .hub-explore-ad-premium { grid-template-columns: 1fr !important; }
      .hub-explore-ad-normal { grid-template-columns: 1fr !important; }
      .hub-explore-productdev-grid { grid-template-columns: 1fr !important; }
      .hub-explore-promo-grid { grid-template-columns: 1fr !important; }
      .hub-explore-core-grid { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(style);
  injected = true;
}
