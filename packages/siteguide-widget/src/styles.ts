/**
 * SiteGuide Widget Styles
 * 인라인 CSS로 외부 사이트에 영향 최소화
 */

export function createStyles(primaryColor: string, theme: 'light' | 'dark'): string {
  const isDark = theme === 'dark';

  const colors = {
    bg: isDark ? '#1f2937' : '#ffffff',
    bgSecondary: isDark ? '#374151' : '#f3f4f6',
    text: isDark ? '#f9fafb' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#4b5563' : '#e5e7eb',
    primary: primaryColor,
    primaryHover: adjustColor(primaryColor, -20),
    userBubble: primaryColor,
    assistantBubble: isDark ? '#374151' : '#f3f4f6',
  };

  return `
    .siteguide-widget {
      --sg-bg: ${colors.bg};
      --sg-bg-secondary: ${colors.bgSecondary};
      --sg-text: ${colors.text};
      --sg-text-secondary: ${colors.textSecondary};
      --sg-border: ${colors.border};
      --sg-primary: ${colors.primary};
      --sg-primary-hover: ${colors.primaryHover};
      --sg-user-bubble: ${colors.userBubble};
      --sg-assistant-bubble: ${colors.assistantBubble};

      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      box-sizing: border-box;
    }

    .siteguide-widget *, .siteguide-widget *::before, .siteguide-widget *::after {
      box-sizing: border-box;
    }

    .sg-button {
      position: fixed;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--sg-primary);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 999998;
    }

    .sg-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .sg-button svg {
      width: 24px;
      height: 24px;
      fill: white;
    }

    .sg-button.bottom-right { bottom: 20px; right: 20px; }
    .sg-button.bottom-left { bottom: 20px; left: 20px; }
    .sg-button.top-right { top: 20px; right: 20px; }
    .sg-button.top-left { top: 20px; left: 20px; }

    .sg-panel {
      position: fixed;
      width: 380px;
      height: 520px;
      max-height: calc(100vh - 100px);
      background: var(--sg-bg);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      transition: opacity 0.2s, transform 0.2s;
      pointer-events: none;
    }

    .sg-panel.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .sg-panel.bottom-right { bottom: 90px; right: 20px; }
    .sg-panel.bottom-left { bottom: 90px; left: 20px; }
    .sg-panel.top-right { top: 90px; right: 20px; }
    .sg-panel.top-left { top: 90px; left: 20px; }

    .sg-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--sg-border);
      background: var(--sg-bg);
    }

    .sg-header-title {
      font-weight: 600;
      color: var(--sg-text);
      margin: 0;
      font-size: 16px;
    }

    .sg-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: var(--sg-text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.15s;
    }

    .sg-close-btn:hover {
      background: var(--sg-bg-secondary);
    }

    .sg-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .sg-message {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 12px;
      word-wrap: break-word;
    }

    .sg-message.user {
      align-self: flex-end;
      background: var(--sg-user-bubble);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .sg-message.assistant {
      align-self: flex-start;
      background: var(--sg-assistant-bubble);
      color: var(--sg-text);
      border-bottom-left-radius: 4px;
    }

    .sg-welcome {
      text-align: center;
      color: var(--sg-text-secondary);
      padding: 20px;
      font-size: 13px;
    }

    .sg-input-area {
      padding: 12px 16px;
      border-top: 1px solid var(--sg-border);
      display: flex;
      gap: 8px;
      background: var(--sg-bg);
    }

    .sg-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid var(--sg-border);
      border-radius: 8px;
      font-size: 14px;
      background: var(--sg-bg);
      color: var(--sg-text);
      outline: none;
      transition: border-color 0.15s;
    }

    .sg-input:focus {
      border-color: var(--sg-primary);
    }

    .sg-input::placeholder {
      color: var(--sg-text-secondary);
    }

    .sg-send-btn {
      padding: 10px 16px;
      background: var(--sg-primary);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.15s;
    }

    .sg-send-btn:hover {
      background: var(--sg-primary-hover);
    }

    .sg-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .sg-typing {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
      background: var(--sg-assistant-bubble);
      border-radius: 12px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
    }

    .sg-typing-dot {
      width: 8px;
      height: 8px;
      background: var(--sg-text-secondary);
      border-radius: 50%;
      animation: sg-typing 1.4s infinite ease-in-out both;
    }

    .sg-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .sg-typing-dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes sg-typing {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }

    .sg-powered {
      text-align: center;
      padding: 8px;
      font-size: 11px;
      color: var(--sg-text-secondary);
      border-top: 1px solid var(--sg-border);
    }

    .sg-powered a {
      color: var(--sg-primary);
      text-decoration: none;
    }

    @media (max-width: 440px) {
      .sg-panel {
        width: calc(100vw - 24px);
        height: calc(100vh - 100px);
        left: 12px !important;
        right: 12px !important;
        bottom: 80px !important;
        top: auto !important;
      }
    }
  `;
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
