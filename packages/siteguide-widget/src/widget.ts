/**
 * SiteGuide Widget Core
 *
 * @service SiteGuide
 * @domain siteguide.co.kr
 * @audience 외부 사업자 (모든 홈페이지 운영자)
 * @independence Neture 종속 아님 - 독립 서비스
 */

import type { SiteGuideConfig, Message } from './types.js';
import { createStyles } from './styles.js';
import { icons } from './icons.js';
import { SiteGuideAPI } from './api.js';
import { collectPageContext, getSessionId } from './context.js';

const DEFAULT_CONFIG: Partial<SiteGuideConfig> = {
  apiUrl: 'https://api.siteguide.co.kr',
  position: 'bottom-right',
  theme: 'light',
  primaryColor: '#3b82f6',
  placeholder: '무엇이든 물어보세요...',
  welcomeMessage: '안녕하세요! 이 사이트에 대해 궁금한 점이 있으시면 편하게 질문해 주세요.',
  autoOpen: false,
};

export class SiteGuideWidget {
  private config: SiteGuideConfig;
  private api: SiteGuideAPI;
  private container: HTMLDivElement | null = null;
  private panel: HTMLDivElement | null = null;
  private messagesContainer: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private isOpen = false;
  private messages: Message[] = [];
  private isLoading = false;
  private sessionId: string;

  constructor(config: SiteGuideConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!this.config.apiKey) {
      console.error('[SiteGuide] API key is required');
      return;
    }

    this.api = new SiteGuideAPI(this.config.apiUrl!, this.config.apiKey);
    this.sessionId = getSessionId();
    this.init();
  }

  private init(): void {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'siteguide-widget';
    this.container.id = 'siteguide-widget';

    // Inject styles
    const style = document.createElement('style');
    const theme = this.config.theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : this.config.theme!;
    style.textContent = createStyles(this.config.primaryColor!, theme);
    this.container.appendChild(style);

    // Create floating button
    const button = this.createButton();
    this.container.appendChild(button);

    // Create chat panel
    this.panel = this.createPanel();
    this.container.appendChild(this.panel);

    // Append to body
    document.body.appendChild(this.container);

    // Auto open if configured
    if (this.config.autoOpen && !this.hasOpenedBefore()) {
      setTimeout(() => this.open(), 1000);
    }
  }

  private createButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = `sg-button ${this.config.position}`;
    button.innerHTML = icons.chat;
    button.setAttribute('aria-label', 'Open chat');
    button.addEventListener('click', () => this.toggle());
    return button;
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = `sg-panel ${this.config.position}`;

    // Header
    const header = document.createElement('div');
    header.className = 'sg-header';
    header.innerHTML = `
      <h3 class="sg-header-title">SiteGuide</h3>
      <button class="sg-close-btn" aria-label="Close">${icons.close}</button>
    `;
    header.querySelector('.sg-close-btn')?.addEventListener('click', () => this.close());
    panel.appendChild(header);

    // Messages area
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'sg-messages';
    this.messagesContainer.innerHTML = `
      <div class="sg-welcome">${this.config.welcomeMessage}</div>
    `;
    panel.appendChild(this.messagesContainer);

    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'sg-input-area';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'sg-input';
    this.input.placeholder = this.config.placeholder!;
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    inputArea.appendChild(this.input);

    const sendBtn = document.createElement('button');
    sendBtn.className = 'sg-send-btn';
    sendBtn.textContent = '전송';
    sendBtn.addEventListener('click', () => this.sendMessage());
    inputArea.appendChild(sendBtn);

    panel.appendChild(inputArea);

    // Powered by
    const powered = document.createElement('div');
    powered.className = 'sg-powered';
    powered.innerHTML = 'Powered by <a href="https://siteguide.co.kr" target="_blank" rel="noopener">SiteGuide</a>';
    panel.appendChild(powered);

    return panel;
  }

  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (!this.panel) return;
    this.isOpen = true;
    this.panel.classList.add('open');
    this.input?.focus();
    this.markAsOpened();
  }

  close(): void {
    if (!this.panel) return;
    this.isOpen = false;
    this.panel.classList.remove('open');
  }

  private async sendMessage(): Promise<void> {
    if (!this.input || this.isLoading) return;

    const question = this.input.value.trim();
    if (!question) return;

    // Clear input
    this.input.value = '';

    // Add user message
    this.addMessage({
      id: this.generateMessageId(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    });

    // Show typing indicator
    this.showTyping();
    this.isLoading = true;

    try {
      // Collect page context
      const pageContext = collectPageContext(this.config.pageContext);

      // Send query
      const response = await this.api.query({
        question,
        pageContext,
        sessionId: this.sessionId,
      });

      // Remove typing indicator
      this.hideTyping();

      if (response.success && response.answer) {
        this.addMessage({
          id: this.generateMessageId(),
          role: 'assistant',
          content: response.answer,
          timestamp: new Date(),
        });
      } else {
        this.addMessage({
          id: this.generateMessageId(),
          role: 'assistant',
          content: response.error || '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.hideTyping();
      this.addMessage({
        id: this.generateMessageId(),
        role: 'assistant',
        content: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.',
        timestamp: new Date(),
      });
    } finally {
      this.isLoading = false;
    }
  }

  private addMessage(message: Message): void {
    if (!this.messagesContainer) return;

    this.messages.push(message);

    // Remove welcome message if exists
    const welcome = this.messagesContainer.querySelector('.sg-welcome');
    if (welcome) {
      welcome.remove();
    }

    const messageEl = document.createElement('div');
    messageEl.className = `sg-message ${message.role}`;
    messageEl.textContent = message.content;
    this.messagesContainer.appendChild(messageEl);

    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  private showTyping(): void {
    if (!this.messagesContainer) return;

    const typing = document.createElement('div');
    typing.className = 'sg-typing';
    typing.id = 'sg-typing-indicator';
    typing.innerHTML = `
      <span class="sg-typing-dot"></span>
      <span class="sg-typing-dot"></span>
      <span class="sg-typing-dot"></span>
    `;
    this.messagesContainer.appendChild(typing);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  private hideTyping(): void {
    const typing = document.getElementById('sg-typing-indicator');
    if (typing) {
      typing.remove();
    }
  }

  private generateMessageId(): string {
    return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5);
  }

  private hasOpenedBefore(): boolean {
    return sessionStorage.getItem('siteguide_opened') === 'true';
  }

  private markAsOpened(): void {
    sessionStorage.setItem('siteguide_opened', 'true');
  }

  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
