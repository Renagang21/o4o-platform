/**
 * AI Progress Panel Component
 * Sprint 3: Real-time AI job progress visualization
 *
 * Features:
 * - Shows job status: queued → processing → validated → completed
 * - Real-time progress updates via SSE
 * - Validation result summary
 * - Schema version warnings
 * - Action buttons: Save / Retry / Discard
 */

import React, { useState, useEffect } from 'react';
import { ValidationResult } from '../utils/ai-validation';

export type AIJobStatus = 'idle' | 'queued' | 'processing' | 'validating' | 'completed' | 'failed';

interface AIProgressPanelProps {
  jobId: string | null;
  status: AIJobStatus;
  progress: number; // 0-100
  validationResult?: ValidationResult | null;
  schemaVersion?: string;
  result?: any;
  error?: string;
  onSave?: (result: any) => void;
  onRetry?: () => void;
  onDiscard?: () => void;
}

/**
 * Main Progress Panel Component
 */
export const AIProgressPanel: React.FC<AIProgressPanelProps> = ({
  jobId,
  status,
  progress,
  validationResult,
  schemaVersion,
  result,
  error,
  onSave,
  onRetry,
  onDiscard,
}) => {
  if (!jobId && status === 'idle') {
    return null; // Don't show panel when no job is active
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>AI Generation Progress</h3>
        {jobId && (
          <span style={styles.jobId}>Job ID: {jobId.substring(0, 8)}...</span>
        )}
      </div>

      {/* Progress Bar and Status */}
      <div style={styles.progressSection}>
        <ProgressBar progress={progress} status={status} />
        <StatusIndicator status={status} />
      </div>

      {/* Error Display */}
      {error && <ErrorDisplay error={error} />}

      {/* Validation Summary */}
      {validationResult && (
        <ValidationSummary
          validationResult={validationResult}
          schemaVersion={schemaVersion}
        />
      )}

      {/* Action Buttons */}
      {status === 'completed' && result && (
        <ActionButtons
          onSave={onSave}
          onRetry={onRetry}
          onDiscard={onDiscard}
          disabled={validationResult && !validationResult.valid}
        />
      )}

      {status === 'failed' && (
        <ActionButtons
          onRetry={onRetry}
          onDiscard={onDiscard}
          showSave={false}
        />
      )}
    </div>
  );
};

/**
 * Progress Bar Component
 */
const ProgressBar: React.FC<{ progress: number; status: AIJobStatus }> = ({
  progress,
  status,
}) => {
  const getProgressColor = () => {
    if (status === 'failed') return '#ef4444';
    if (status === 'completed') return '#10b981';
    return '#3b82f6';
  };

  return (
    <div style={styles.progressBarContainer}>
      <div
        style={{
          ...styles.progressBarFill,
          width: `${progress}%`,
          backgroundColor: getProgressColor(),
        }}
      />
    </div>
  );
};

/**
 * Status Indicator Component
 */
const StatusIndicator: React.FC<{ status: AIJobStatus }> = ({ status }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'queued':
        return { icon: '⏳', label: 'Queued', color: '#6b7280' };
      case 'processing':
        return { icon: '⚙️', label: 'Generating', color: '#3b82f6' };
      case 'validating':
        return { icon: '✓', label: 'Validating', color: '#8b5cf6' };
      case 'completed':
        return { icon: '✅', label: 'Completed', color: '#10b981' };
      case 'failed':
        return { icon: '❌', label: 'Failed', color: '#ef4444' };
      default:
        return { icon: '⚪', label: 'Idle', color: '#9ca3af' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div style={styles.statusIndicator}>
      <span style={{ fontSize: '20px' }}>{statusInfo.icon}</span>
      <span style={{ ...styles.statusLabel, color: statusInfo.color }}>
        {statusInfo.label}
      </span>
    </div>
  );
};

/**
 * Error Display Component
 */
const ErrorDisplay: React.FC<{ error: string }> = ({ error }) => {
  return (
    <div style={styles.errorContainer}>
      <span style={styles.errorIcon}>⚠️</span>
      <div>
        <strong style={styles.errorTitle}>Generation Failed</strong>
        <p style={styles.errorMessage}>{error}</p>
      </div>
    </div>
  );
};

/**
 * Validation Summary Component
 */
const ValidationSummary: React.FC<{
  validationResult: ValidationResult;
  schemaVersion?: string;
}> = ({ validationResult, schemaVersion }) => {
  const { valid, errors, validationMode } = validationResult;

  return (
    <div style={valid ? styles.validationSuccess : styles.validationError}>
      <div style={styles.validationHeader}>
        <span style={styles.validationIcon}>
          {valid ? '✅' : '⚠️'}
        </span>
        <div>
          <strong style={styles.validationTitle}>
            {valid ? 'Validation Passed' : 'Validation Failed'}
          </strong>
          {schemaVersion && (
            <span style={styles.schemaVersion}>
              Schema v{schemaVersion} {validationMode === 'limited' && '(Limited Mode)'}
            </span>
          )}
        </div>
      </div>

      {!valid && errors.length > 0 && (
        <div style={styles.validationErrors}>
          <p style={styles.errorCount}>
            {errors.length} error{errors.length > 1 ? 's' : ''} found:
          </p>
          <ul style={styles.errorList}>
            {errors.slice(0, 3).map((error, index) => (
              <li key={index} style={styles.errorItem}>
                <code style={styles.errorField}>{error.field}</code>: {error.message}
              </li>
            ))}
            {errors.length > 3 && (
              <li style={styles.errorItem}>
                ... and {errors.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Action Buttons Component
 */
const ActionButtons: React.FC<{
  onSave?: (result: any) => void;
  onRetry?: () => void;
  onDiscard?: () => void;
  disabled?: boolean;
  showSave?: boolean;
}> = ({ onSave, onRetry, onDiscard, disabled = false, showSave = true }) => {
  return (
    <div style={styles.actionButtons}>
      {showSave && onSave && (
        <button
          onClick={() => onSave(null)}
          disabled={disabled}
          style={{
            ...styles.button,
            ...styles.saveButton,
            ...(disabled && styles.disabledButton),
          }}
        >
          💾 Save Result
        </button>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          style={{ ...styles.button, ...styles.retryButton }}
        >
          🔄 Retry
        </button>
      )}

      {onDiscard && (
        <button
          onClick={onDiscard}
          style={{ ...styles.button, ...styles.discardButton }}
        >
          🗑️ Discard
        </button>
      )}
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  jobId: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  progressSection: {
    marginBottom: '16px',
  },
  progressBarContainer: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressBarFill: {
    height: '100%',
    transition: 'width 0.3s ease, background-color 0.3s ease',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusLabel: {
    fontSize: '14px',
    fontWeight: 500,
  },
  errorContainer: {
    display: 'flex',
    gap: '12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
  },
  errorIcon: {
    fontSize: '20px',
  },
  errorTitle: {
    display: 'block',
    color: '#991b1b',
    fontSize: '14px',
    marginBottom: '4px',
  },
  errorMessage: {
    margin: 0,
    color: '#7f1d1d',
    fontSize: '13px',
  },
  validationSuccess: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
  },
  validationError: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
  },
  validationHeader: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  validationIcon: {
    fontSize: '20px',
  },
  validationTitle: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  schemaVersion: {
    display: 'block',
    fontSize: '12px',
    color: '#6b7280',
  },
  validationErrors: {
    marginTop: '12px',
  },
  errorCount: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: 500,
    color: '#78350f',
  },
  errorList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  errorItem: {
    fontSize: '12px',
    color: '#78350f',
    marginBottom: '4px',
  },
  errorField: {
    fontFamily: 'monospace',
    fontSize: '11px',
    backgroundColor: '#ffffff',
    padding: '2px 4px',
    borderRadius: '4px',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#10b981',
    color: 'white',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  discardButton: {
    backgroundColor: '#6b7280',
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
};
