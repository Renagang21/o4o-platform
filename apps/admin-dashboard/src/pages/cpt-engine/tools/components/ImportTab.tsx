/**
 * Import Tab Component
 * Allows users to upload and import Field Groups from JSON files
 */

import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileJson, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import acfApi from '@/features/cpt-acf/services/acf.api';
import type { FieldGroup } from '@/features/cpt-acf/types/acf.types';

interface ValidationResult {
  valid: boolean;
  groups: FieldGroup[];
  errors: string[];
  warnings: string[];
}

export const ImportTab: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (groups: FieldGroup[]) => acfApi.groups.importGroups({ groups }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fieldGroups'] });
      // Reset state
      setFile(null);
      setValidation(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      alert('Field Groups imported successfully!');
    },
    onError: (error) => {
      console.error('Import failed:', error);
      alert('Import failed. Please check the file and try again.');
    },
  });

  // Validate JSON file
  const validateFile = (fileContent: string): ValidationResult => {
    const result: ValidationResult = {
      valid: false,
      groups: [],
      errors: [],
      warnings: [],
    };

    try {
      const data = JSON.parse(fileContent);

      // Check if it's an array
      if (!Array.isArray(data)) {
        result.errors.push('File must contain an array of Field Groups');
        return result;
      }

      // Validate each group
      data.forEach((group: any, index: number) => {
        if (!group.key) {
          result.errors.push(`Group at index ${index} is missing required "key" field`);
        }
        if (!group.title) {
          result.errors.push(`Group at index ${index} is missing required "title" field`);
        }
        if (!group.fields || !Array.isArray(group.fields)) {
          result.warnings.push(`Group "${group.title || index}" has no fields`);
        }
      });

      // Check for duplicate keys
      const keys = data.map((g: any) => g.key).filter(Boolean);
      const duplicates = keys.filter((key: string, idx: number) => keys.indexOf(key) !== idx);
      if (duplicates.length > 0) {
        result.warnings.push(`Duplicate keys found: ${duplicates.join(', ')}`);
      }

      result.groups = data;
      result.valid = result.errors.length === 0;

    } catch (err) {
      result.errors.push('Invalid JSON format');
    }

    return result;
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Read and validate file
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validationResult = validateFile(content);
      setValidation(validationResult);
    };
    reader.readAsText(selectedFile);
  };

  // Handle drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    if (!droppedFile.name.endsWith('.json')) {
      alert('Please upload a JSON file');
      return;
    }

    setFile(droppedFile);

    // Read and validate file
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validationResult = validateFile(content);
      setValidation(validationResult);
    };
    reader.readAsText(droppedFile);
  };

  // Handle import
  const handleImport = () => {
    if (!validation?.valid || validation.groups.length === 0) return;
    importMutation.mutate(validation.groups);
  };

  // Reset
  const handleReset = () => {
    setFile(null);
    setValidation(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      {/* File Upload Area */}
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center transition-colors
            ${isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }
          `}
        >
          <FileJson className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 font-medium mb-2">
            Drop your JSON file here, or click to browse
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Supports ACF-compatible Field Group exports
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Choose File
          </label>
        </div>
      ) : (
        <>
          {/* File Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileJson className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium text-gray-900">{file.name}</div>
                  <div className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </div>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Change File
              </button>
            </div>
          </div>

          {/* Validation Results */}
          {validation && (
            <div className="space-y-4">
              {/* Errors */}
              {validation.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-red-900 mb-2">Validation Errors</div>
                      <ul className="text-sm text-red-800 space-y-1">
                        {validation.errors.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-yellow-900 mb-2">Warnings</div>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        {validation.warnings.map((warning, idx) => (
                          <li key={idx}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Success & Preview */}
              {validation.valid && validation.groups.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-green-900 mb-2">
                        Ready to Import ({validation.groups.length} Field Groups)
                      </div>
                      <div className="text-sm text-green-800 space-y-1">
                        {validation.groups.map((group, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span>• {group.title}</span>
                            <span className="text-green-600">
                              {group.fields?.length || 0} fields
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Import Button */}
              {validation.valid && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importMutation.isPending}
                    className="
                      flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md
                      hover:bg-blue-700 transition-colors font-medium text-sm
                      disabled:bg-gray-300 disabled:cursor-not-allowed
                    "
                  >
                    {importMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Import Field Groups
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
