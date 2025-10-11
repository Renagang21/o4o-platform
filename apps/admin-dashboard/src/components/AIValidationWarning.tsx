/**
 * AI Validation Warning Component
 * Sprint 2 - P2: Display validation errors and schema version warnings
 *
 * Features:
 * - Show field-level validation errors
 * - Display warning banner for schema version changes
 * - Limited validation mode indicator
 */

import React, { useState, useEffect } from 'react';
import { ValidationError, ValidationResult } from '../utils/ai-validation';

interface AIValidationWarningProps {
  validationResult: ValidationResult | null;
  onDismiss?: () => void;
}

/**
 * Validation Error Display Component
 */
export const AIValidationWarning: React.FC<AIValidationWarningProps> = ({
  validationResult,
  onDismiss
}) => {
  if (!validationResult || validationResult.valid) {
    return null;
  }

  const { errors, validationMode } = validationResult;

  return (
    <div className="ai-validation-warning" style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.icon}>⚠️</span>
          <h4 style={styles.title}>
            AI Output Validation Failed
            {validationMode === 'limited' && (
              <span style={styles.badge}>Limited Mode</span>
            )}
          </h4>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} style={styles.closeButton}>
            ×
          </button>
        )}
      </div>

      <div style={styles.description}>
        {validationMode === 'limited' ? (
          <p>
            Basic validation failed. Schema is not available, performing limited checks only.
            Some validation errors may not be detected.
          </p>
        ) : (
          <p>
            The AI-generated content does not match the expected structure.
            Please review the errors below before saving or publishing.
          </p>
        )}
      </div>

      <ul style={styles.errorList}>
        {errors.map((error, index) => (
          <li key={index} style={styles.errorItem}>
            <strong style={styles.errorField}>{error.field}:</strong>{' '}
            <span style={styles.errorMessage}>{error.message}</span>
            {error.value !== undefined && (
              <div style={styles.errorValue}>
                Current value: <code>{JSON.stringify(error.value)}</code>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Schema Version Change Warning Banner
 */
interface SchemaVersionWarningProps {
  oldVersion: string;
  newVersion: string;
  onDismiss: () => void;
}

export const SchemaVersionWarning: React.FC<SchemaVersionWarningProps> = ({
  oldVersion,
  newVersion,
  onDismiss
}) => {
  return (
    <div className="schema-version-warning" style={styles.versionBanner}>
      <div style={styles.versionContent}>
        <span style={styles.icon}>ℹ️</span>
        <div>
          <strong>Schema Updated</strong>
          <p style={styles.versionMessage}>
            AI validation schema has been updated from <code>{oldVersion}</code> to{' '}
            <code>{newVersion}</code>. New validation rules may apply.
          </p>
        </div>
      </div>
      <button onClick={onDismiss} style={styles.closeButton}>
        Dismiss
      </button>
    </div>
  );
};

/**
 * Hook to listen for schema version changes
 */
export const useSchemaVersionWarning = () => {
  const [versionChange, setVersionChange] = useState<{
    oldVersion: string;
    newVersion: string;
  } | null>(null);

  useEffect(() => {
    const handleVersionChange = (event: CustomEvent) => {
      const { oldVersion, newVersion } = event.detail;
      setVersionChange({ oldVersion, newVersion });
    };

    window.addEventListener('ai-schema-version-changed', handleVersionChange as EventListener);

    return () => {
      window.removeEventListener('ai-schema-version-changed', handleVersionChange as EventListener);
    };
  }, []);

  const dismissWarning = () => {
    setVersionChange(null);
  };

  return { versionChange, dismissWarning };
};

// Basic inline styles (can be replaced with Tailwind or CSS modules)
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    fontSize: '20px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#92400e',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: '#f59e0b',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#92400e',
    padding: '0 4px',
    lineHeight: '1',
  },
  description: {
    marginBottom: '12px',
    color: '#78350f',
    fontSize: '14px',
  },
  errorList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  errorItem: {
    backgroundColor: 'white',
    padding: '8px 12px',
    marginBottom: '8px',
    borderRadius: '4px',
    fontSize: '13px',
    border: '1px solid #fcd34d',
  },
  errorField: {
    color: '#b45309',
    fontFamily: 'monospace',
  },
  errorMessage: {
    color: '#78350f',
  },
  errorValue: {
    marginTop: '4px',
    fontSize: '12px',
    color: '#92400e',
    fontFamily: 'monospace',
  },
  versionBanner: {
    backgroundColor: '#dbeafe',
    border: '1px solid #3b82f6',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    flex: 1,
  },
  versionMessage: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#1e40af',
  },
};
