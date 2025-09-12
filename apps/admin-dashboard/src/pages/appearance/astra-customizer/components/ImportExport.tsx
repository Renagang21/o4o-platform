import React, { useState, useRef } from 'react';
import { Download, Upload, Copy, Check, AlertCircle } from 'lucide-react';
import { useCustomizer } from '../context/CustomizerContext';
import { AstraCustomizerSettings } from '../types/customizer-types';
import { getDefaultSettings } from '../utils/default-settings';
import { deepMerge } from '../utils/deep-merge';

export const ImportExport: React.FC = () => {
  const { state, setSettings, resetSettings } = useCustomizer();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importData, setImportData] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Export settings as JSON
  const exportSettings = () => {
    const dataStr = JSON.stringify(state.settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `astra-customizer-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    setSuccess('Settings exported successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };
  
  // Copy settings to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(state.settings, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Import settings from JSON
  const importSettings = () => {
    try {
      const parsedData = JSON.parse(importData);
      
      // Validate the imported data structure
      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('Invalid settings format');
      }
      
      // Merge with default settings to ensure all properties exist
      const defaultSettings = getDefaultSettings();
      const mergedSettings = deepMerge(defaultSettings, parsedData) as AstraCustomizerSettings;
      
      // Update meta information
      mergedSettings._meta = {
        ...mergedSettings._meta,
        lastModified: new Date().toISOString(),
        isDirty: true,
      };
      
      setSettings(mergedSettings);
      setSuccess('Settings imported successfully!');
      setImportData('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Invalid JSON format. Please check your settings data.');
      setTimeout(() => setError(null), 5000);
    }
  };
  
  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
      setSuccess('File loaded. Click Import to apply settings.');
      setTimeout(() => setSuccess(null), 3000);
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setTimeout(() => setError(null), 3000);
    };
    reader.readAsText(file);
  };
  
  return (
    <div className="astra-section import-export-section">
      <div className="astra-section-title">Import / Export Settings</div>
      
      {/* Tabs */}
      <div className="astra-tabs">
        <button
          onClick={() => setActiveTab('export')}
          className={`astra-tab ${activeTab === 'export' ? 'active' : ''}`}
        >
          <Download size={14} />
          Export
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`astra-tab ${activeTab === 'import' ? 'active' : ''}`}
        >
          <Upload size={14} />
          Import
        </button>
      </div>
      
      {/* Notifications */}
      {error && (
        <div className="astra-notification error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      
      {success && (
        <div className="astra-notification success">
          <Check size={16} />
          {success}
        </div>
      )}
      
      {activeTab === 'export' ? (
        <>
          {/* Export Section */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Export Current Settings</h4>
            <p className="astra-control-description">
              Export your customizer settings to a JSON file or copy to clipboard. 
              You can use this to backup your settings or transfer them to another site.
            </p>
            
            <div className="astra-button-group">
              <button onClick={exportSettings} className="astra-button">
                <Download size={16} />
                Download JSON File
              </button>
              
              <button onClick={copyToClipboard} className="astra-button secondary">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
          
          {/* Settings Preview */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Current Settings Preview</h4>
            <div className="astra-code-block">
              <pre>{JSON.stringify(state.settings, null, 2).slice(0, 500)}...</pre>
            </div>
            <p className="astra-help-text">
              This is a preview of your current settings in JSON format.
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Import Section */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Import Settings</h4>
            <p className="astra-control-description">
              Import customizer settings from a JSON file or paste JSON data directly. 
              This will override your current settings.
            </p>
            
            {/* File Upload */}
            <div className="astra-import-options">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="astra-button secondary"
              >
                <Upload size={16} />
                Choose JSON File
              </button>
            </div>
            
            {/* Text Input */}
            <div className="astra-control">
              <label className="astra-control-label">Or Paste JSON Data</label>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="astra-textarea"
                placeholder="Paste your settings JSON here..."
                rows={10}
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
              />
            </div>
            
            <div className="astra-button-group">
              <button
                onClick={importSettings}
                disabled={!importData}
                className="astra-button"
              >
                <Upload size={16} />
                Import Settings
              </button>
              
              <button
                onClick={() => {
                  setImportData('');
                  setError(null);
                  setSuccess(null);
                }}
                className="astra-button secondary"
              >
                Clear
              </button>
            </div>
          </div>
          
          {/* Warning */}
          <div className="astra-section-group">
            <div className="astra-help-text">
              ⚠️ <strong>Warning:</strong> Importing settings will replace all your current customizer settings. 
              Make sure to export your current settings first if you want to keep a backup.
            </div>
            
            <button onClick={resetSettings} className="astra-button secondary">
              Reset to Default Settings
            </button>
          </div>
        </>
      )}
    </div>
  );
};