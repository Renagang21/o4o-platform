import { useEffect, useRef } from 'react';
import { useCustomizer } from '../context/CustomizerContext';
import { toast } from 'react-hot-toast';

/**
 * WordPress-style Keyboard Shortcuts Hook
 * Implements keyboard shortcuts for better UX
 */

interface ShortcutHandlers {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSearch?: () => void;
  onReset?: () => void;
  onPreview?: () => void;
  onPublish?: () => void;
  onClose?: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers = {}) => {
  const { state, saveSettings, resetSettings } = useCustomizer();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isProcessing = useRef(false);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't interfere with input fields unless it's a global shortcut
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.contentEditable === 'true';
      
      // Global shortcuts (work even in input fields)
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            // Ctrl/Cmd + S: Save
            e.preventDefault();
            if (!isProcessing.current) {
              isProcessing.current = true;
              try {
                if (handlers.onSave) {
                  handlers.onSave();
                } else {
                  await saveSettings();
                  toast.success('Settings saved! (Ctrl+S)', {
                    duration: 2000,
                    position: 'bottom-center',
                  });
                }
              } catch (error) {
                toast.error('Failed to save settings');
              } finally {
                isProcessing.current = false;
              }
            }
            break;

          case 'z':
            if (e.shiftKey) {
              // Ctrl/Cmd + Shift + Z: Redo
              e.preventDefault();
              if (handlers.onRedo) {
                handlers.onRedo();
                toast.success('Redo (Ctrl+Shift+Z)', {
                  duration: 1500,
                  position: 'bottom-center',
                });
              }
            } else {
              // Ctrl/Cmd + Z: Undo
              e.preventDefault();
              if (handlers.onUndo) {
                handlers.onUndo();
                toast.success('Undo (Ctrl+Z)', {
                  duration: 1500,
                  position: 'bottom-center',
                });
              }
            }
            break;

          case 'f':
            // Ctrl/Cmd + F: Focus search
            if (!isInInput) {
              e.preventDefault();
              if (handlers.onSearch) {
                handlers.onSearch();
              } else {
                // Focus the search input if it exists
                const searchInput = document.querySelector(
                  '.wp-customizer-search-input'
                ) as HTMLInputElement;
                if (searchInput) {
                  searchInput.focus();
                  searchInput.select();
                }
              }
            }
            break;

          case 'r':
            // Ctrl/Cmd + R: Reset settings (with confirmation)
            if (e.shiftKey) {
              e.preventDefault();
              if (handlers.onReset) {
                handlers.onReset();
              } else {
                const confirmed = window.confirm(
                  'Reset all settings to default? This cannot be undone.'
                );
                if (confirmed) {
                  resetSettings();
                  toast.success('Settings reset to defaults', {
                    duration: 3000,
                    position: 'bottom-center',
                  });
                }
              }
            }
            break;

          case 'p':
            // Ctrl/Cmd + P: Toggle preview mode
            e.preventDefault();
            if (handlers.onPreview) {
              handlers.onPreview();
              toast.success('Preview mode toggled (Ctrl+P)', {
                duration: 1500,
                position: 'bottom-center',
              });
            }
            break;

          case 'enter':
            // Ctrl/Cmd + Enter: Publish/Save and exit
            if (e.shiftKey) {
              e.preventDefault();
              if (handlers.onPublish) {
                handlers.onPublish();
              } else {
                try {
                  await saveSettings();
                  toast.success('Settings published!', {
                    duration: 2000,
                    position: 'bottom-center',
                  });
                  // Close after save
                  setTimeout(() => {
                    handlers.onClose?.();
                  }, 1000);
                } catch (error) {
                  toast.error('Failed to publish settings');
                }
              }
            }
            break;
        }
      }

      // Non-modifier shortcuts (only when not in input)
      if (!isInInput) {
        switch (e.key) {
          case '?':
            // ?: Show keyboard shortcuts help
            if (e.shiftKey) {
              e.preventDefault();
              showShortcutsHelp();
            }
            break;

          case '/':
            // /: Quick search (Vim-style)
            e.preventDefault();
            const searchInput = document.querySelector(
              '.wp-customizer-search-input'
            ) as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
              searchInput.select();
            }
            break;

          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
            // Number keys: Quick navigation to sections
            if (e.altKey) {
              e.preventDefault();
              const sectionIndex = parseInt(e.key) - 1;
              const panels = document.querySelectorAll('.wp-customizer-panel');
              if (panels[sectionIndex]) {
                (panels[sectionIndex] as HTMLElement).click();
              }
            }
            break;
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers, state, saveSettings, resetSettings]);

  return {
    searchInputRef,
  };
};

// Helper function to show shortcuts help
function showShortcutsHelp() {
  const shortcuts = [
    { keys: 'Ctrl+S', description: 'Save settings' },
    { keys: 'Ctrl+Z', description: 'Undo last change' },
    { keys: 'Ctrl+Shift+Z', description: 'Redo' },
    { keys: 'Ctrl+F', description: 'Focus search' },
    { keys: 'Ctrl+Shift+R', description: 'Reset to defaults' },
    { keys: 'Ctrl+P', description: 'Toggle preview' },
    { keys: 'Ctrl+Shift+Enter', description: 'Save and close' },
    { keys: 'ESC', description: 'Close customizer' },
    { keys: '/', description: 'Quick search' },
    { keys: '?', description: 'Show this help' },
    { keys: 'Alt+1-9', description: 'Quick navigate to sections' },
  ];

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
    animation: fadeIn 0.2s ease;
  `;

  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 500px;
    max-height: 70vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  `;

  modal.innerHTML = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1e1e1e;">
      ⌨️ Keyboard Shortcuts
    </h2>
    <table style="width: 100%; border-collapse: collapse;">
      ${shortcuts
        .map(
          (s) => `
        <tr style="border-bottom: 1px solid #f0f0f1;">
          <td style="padding: 8px 16px 8px 0; font-weight: 600; font-family: monospace; font-size: 13px; color: #007cba;">
            ${s.keys}
          </td>
          <td style="padding: 8px 0; font-size: 13px; color: #50575e;">
            ${s.description}
          </td>
        </tr>
      `
        )
        .join('')}
    </table>
    <p style="margin: 16px 0 0 0; font-size: 12px; color: #8c8f94; text-align: center;">
      Press ESC or click outside to close
    </p>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close on click or ESC
  const close = () => {
    overlay.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 200);
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);

  // Add fade animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}