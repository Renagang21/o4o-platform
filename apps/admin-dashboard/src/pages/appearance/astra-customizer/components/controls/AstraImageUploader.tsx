import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

interface AstraImageUploaderProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  description?: string;
  accept?: string;
  maxSize?: number; // in MB
  preview?: boolean;
}

export const AstraImageUploader: React.FC<AstraImageUploaderProps> = ({
  label,
  value,
  onChange,
  description,
  accept = 'image/*',
  maxSize = 5,
  preview = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelect = async (file: File) => {
    setError(null);

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    try {
      // Upload image using authenticated API client
      const formData = new FormData();
      formData.append('file', file);

      const response = await authClient.api.post('/v1/content/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Extract URL from response
      if (response.data?.data?.media?.[0]?.url) {
        onChange(response.data.data.media[0].url);
      } else if (response.data?.url) {
        onChange(response.data.url);
      } else {
        throw new Error('Invalid response format');
      }

      toast.success('Image uploaded successfully');
    } catch (uploadError: any) {
      console.error('Failed to upload image:', uploadError);

      // For customizer, use data URL as fallback for immediate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onChange(result);
        toast.info('Using local preview - save to persist changes');
      };
      reader.onerror = () => {
        setError('Failed to read file');
        toast.error('Failed to read image file');
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleRemove = () => {
    onChange(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="astra-control astra-image-uploader">
      <div className="astra-control-header">
        <label className="astra-control-label">{label}</label>
        {description && (
          <span className="astra-control-description">{description}</span>
        )}
      </div>
      
      <div
        className={`astra-upload-area ${isDragging ? 'dragging' : ''} ${
          value ? 'has-image' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {value && preview ? (
          <div className="astra-upload-preview">
            <img src={value} alt="Preview" className="astra-upload-image" />
            <button
              onClick={handleRemove}
              className="astra-upload-remove"
              title="Remove image"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="astra-upload-placeholder">
            <ImageIcon size={32} className="astra-upload-icon" />
            <p className="astra-upload-text">
              Drag and drop an image here or click to browse
            </p>
            <button
              onClick={handleButtonClick}
              className="astra-upload-button"
              type="button"
            >
              <Upload size={16} />
              Select Image
            </button>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="astra-upload-input"
          hidden
        />
      </div>
      
      {error && <div className="astra-control-error">{error}</div>}
      
      {value && !preview && (
        <div className="astra-upload-filename">
          <ImageIcon size={14} />
          <span>Image selected</span>
          <button onClick={handleRemove} className="astra-upload-clear">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};