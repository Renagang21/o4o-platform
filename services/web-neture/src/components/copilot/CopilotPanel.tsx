import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CopilotChat } from './CopilotChat';
import { CopilotInsight } from './CopilotInsight';
import { CopilotSummary } from './CopilotSummary';
import type { CopilotEntryProps } from './CopilotEntry';

type Tab = 'chat' | 'insight' | 'summary';

const TABS: { key: Tab; label: string }[] = [
  { key: 'chat', label: 'Chat' },
  { key: 'insight', label: 'Insight' },
  { key: 'summary', label: 'Summary' },
];

interface Props {
  onClose: () => void;
  context?: CopilotEntryProps;
}

export function CopilotPanel({ onClose, context }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Panel */}
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>AI Copilot</h2>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              style={activeTab === tab.key ? { ...styles.tab, ...styles.tabActive } : styles.tab}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {activeTab === 'chat' && <CopilotChat context={context} />}
          {activeTab === 'insight' && <CopilotInsight />}
          {activeTab === 'summary' && <CopilotSummary context={context} />}
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 9998,
  },
  panel: {
    position: 'fixed', top: 0, right: 0, width: '420px', height: '100vh',
    background: '#fff', zIndex: 9999, display: 'flex', flexDirection: 'column',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid #E5E7EB',
  },
  title: { margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280',
    display: 'flex', alignItems: 'center', padding: '4px',
  },
  tabs: {
    display: 'flex', borderBottom: '1px solid #E5E7EB',
  },
  tab: {
    flex: 1, padding: '10px 0', textAlign: 'center', fontSize: '14px',
    fontWeight: 500, color: '#6B7280', background: 'none', border: 'none',
    borderBottom: '2px solid transparent', cursor: 'pointer',
  },
  tabActive: {
    color: '#2563EB', borderBottomColor: '#2563EB',
  },
  content: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
};
