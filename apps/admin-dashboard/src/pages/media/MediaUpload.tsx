import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

const MediaUpload: React.FC = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    let successCount = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

        await authClient.api.post('/v1/content/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        successCount++;
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded`);
      setTimeout(() => navigate('/media'), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-3">
        <AdminBreadcrumb 
          items={[
            { label: 'Dashboard', path: '/' },
            { label: 'Media', path: '/media' },
            { label: 'Add New' }
          ]}
        />
      </div>

      <div className="px-8 py-6">
        <h1 className="text-2xl font-normal mb-6">Upload New Media</h1>
        
        {/* WordPress-style upload area */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className="bg-white border-4 border-dashed rounded-lg p-24 text-center transition-colors"
          style={{
            borderColor: isDragging ? '#2563eb' : '#d1d5db',
            backgroundColor: isDragging ? '#f0f9ff' : '#fff'
          }}
        >
          <h2 className="text-xl font-normal mb-4">
            Drop files to upload
          </h2>
          <p className="text-lg mb-6 text-gray-600">or</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Select Files'}
          </button>
          <p className="mt-8 text-sm text-gray-500">
            Maximum upload file size: 50 MB
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,application/pdf"
        />
      </div>
    </div>
  );
};

export default MediaUpload;