/**
 * Simple event bus for cross-component communication
 * Used to trigger Loop block refresh when forms are submitted
 */
class EventBus {
  private events: Record<string, Array<(...args: any[]) => void>> = {};

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        callback(...args);
      });
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (!this.events[event]) return;
    
    if (callback) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    } else {
      delete this.events[event];
    }
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Event types
export const EVENTS = {
  FORM_SUBMITTED: 'form:submitted',
  POST_CREATED: 'post:created',
  POST_UPDATED: 'post:updated',
  POST_DELETED: 'post:deleted',
  REFRESH_LOOPS: 'loops:refresh',
} as const;