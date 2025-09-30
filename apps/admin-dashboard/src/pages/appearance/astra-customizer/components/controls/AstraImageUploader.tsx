import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import MediaSelector from '@/components/editor/blocks/shared/MediaSelector';
import type { MediaItem } from '@/components/editor/blocks/shared/MediaSelector';

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
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleMediaSelect = (media: MediaItem[] | MediaItem) => {
    const selectedMedia = Array.isArray(media) ? media[0] : media;
    if (selectedMedia) {
      // Add timestamp for cache busting
      const urlWithTimestamp = `${selectedMedia.url}${selectedMedia.url.includes('?') ? '&' : '?'}t=${Date.now()}`;
      onChange(urlWithTimestamp);
      
      // Force preview refresh
      const iframe = document.getElementById('customizer-preview-iframe') as HTMLIFrameElement;
      if (iframe) {
        // Send message to iframe to update logo
        iframe.contentWindow?.postMessage(
          { 
            type: 'update-logo', 
            url: urlWithTimestamp 
          },
          '*'
        );
        
        // Also trigger a refresh after a short delay
        setTimeout(() => {
          iframe.src = iframe.src;
        }, 500);
      }
    }
    setShowMediaSelector(false);
  };
  
  const handleRemove = () => {
    onChange(null);
    setError(null);
  };
  
  const handleButtonClick = () => {
    setShowMediaSelector(true);
  };
  
  return (
    <>
      <div className="astra-control astra-image-uploader">
        <div className="astra-control-header">
          <label className="astra-control-label">{label}</label>
          {description && (
            <span className="astra-control-description">{description}</span>
          )}
        </div>
        
        <div className={`astra-upload-area ${value ? 'has-image' : ''}`}>
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
                Click to select an image from Media Library
              </p>
              <button
                onClick={handleButtonClick}
                className="astra-upload-button"
                type="button"
              >
                <Upload size={16} />
                Open Media Library
              </button>
            </div>
          )}
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

      {/* Media Selector Modal */}
      <MediaSelector
        isOpen={showMediaSelector}
        onClose={() => setShowMediaSelector(false)}
        onSelect={handleMediaSelect}
        multiple={false}
        acceptedTypes={['image']}
        title="Select Image"
      />
    </>
  );
};