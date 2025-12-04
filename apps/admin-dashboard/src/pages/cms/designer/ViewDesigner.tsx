/**
 * CMS V2 - Visual View Designer Page
 *
 * Visual editor for creating and editing view templates
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import cmsAPI, { View } from '@/lib/cms';
import toast from 'react-hot-toast';
import DesignerShell from './DesignerShell';
import PreviewFrame from '@/components/cms/PreviewFrame';
import { designerToCMSView, cmsViewToDesigner } from './core/jsonAdapter';

export default function ViewDesigner() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (id) {
      loadView();
    } else {
      // New view mode
      setLoading(false);
    }
  }, [id]);

  const loadView = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const loadedView = await cmsAPI.getView(id);
      setView(loadedView);
    } catch (error) {
      console.error('Failed to load view:', error);
      toast.error('Failed to load view');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (designerState: any) => {
    if (!id) {
      toast.error('Cannot save: No view ID');
      return;
    }

    try {
      // Convert designer state to CMS View JSON
      const viewJSON = designerToCMSView(designerState);

      // Update view via API
      await cmsAPI.updateView(id, {
        schema: viewJSON,
      });

      toast.success('View saved successfully');

      // Reload view to get fresh data
      await loadView();
    } catch (error: any) {
      console.error('Failed to save view:', error);
      toast.error(error.response?.data?.message || 'Failed to save view');
      throw error;
    }
  };

  const handlePreview = () => {
    if (!view?.slug) {
      toast.error('Cannot preview: No view slug');
      return;
    }

    setShowPreview(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading view...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DesignerShell
        initialView={view?.schema}
        viewId={id}
        onSave={handleSave}
        onPreview={handlePreview}
      />

      {/* Preview Modal */}
      {showPreview && view?.slug && (
        <PreviewFrame
          slug={view.slug}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
