import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { CopilotPanel } from './CopilotPanel';

export function CopilotButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        style={styles.button}
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Copilot"
        title="AI Copilot"
      >
        <Sparkles size={22} />
      </button>
      {isOpen && <CopilotPanel onClose={() => setIsOpen(false)} />}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    position: 'fixed', bottom: '90px', right: '24px', zIndex: 9990,
    width: '48px', height: '48px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    color: '#fff', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
  },
};
