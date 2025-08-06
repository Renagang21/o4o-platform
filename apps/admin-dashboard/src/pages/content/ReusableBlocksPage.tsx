/**
 * Reusable Blocks Management Page
 * WordPress-style management interface for reusable blocks
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Download, Upload } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import ReusableBlocksBrowser from '../../components/editor/ReusableBlocksBrowser';
import { useReusableBlocks } from '../../hooks/useReusableBlocks';

const ReusableBlocksPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const { } = useReusableBlocks(); // TODO: Use loading state for UI feedback

  // Handle creating new reusable block
  const handleCreateNew = () => {
    // Navigate to block editor with empty content
    navigate('/posts/new?type=reusable-block');
  };

  // Handle editing existing block
  const handleEditBlock = (blockId: string) => {
    navigate(`/reusable-blocks/${blockId}/edit`);
  };

  // Handle import/export functions
  const handleImportBlocks = () => {
    // TODO: Implement import functionality
    console.log('Import blocks functionality');
  };

  const handleExportBlocks = () => {
    // TODO: Implement export functionality
    console.log('Export blocks functionality');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reusable Blocks</h1>
          <p className="text-gray-600">
            Create, manage, and organize your reusable block library
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleImportBlocks}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExportBlocks}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Block
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Blocks</p>
              <p className="text-2xl font-bold">24</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-blue-500 rounded-sm" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">My Blocks</p>
              <p className="text-2xl font-bold">18</p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-green-500 rounded-sm" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Global Blocks</p>
              <p className="text-2xl font-bold">6</p>
            </div>
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-purple-500 rounded-sm" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Most Used</p>
              <p className="text-2xl font-bold">142</p>
              <p className="text-xs text-gray-500">total usage</p>
            </div>
            <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-orange-500 rounded-sm" />
            </div>
          </div>
        </Card>
      </div>

      {/* Management Interface */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-gray-200 px-6 pt-6">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all">All Blocks</TabsTrigger>
                <TabsTrigger value="mine">My Blocks</TabsTrigger>
                <TabsTrigger value="global">Global Blocks</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
              
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          <div className="p-6">
            <TabsContent value="all" className="mt-0">
              <ReusableBlocksBrowser
                onEditBlock={handleEditBlock}
                onCreateNew={handleCreateNew}
                compact={false}
              />
            </TabsContent>

            <TabsContent value="mine" className="mt-0">
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="h-12 w-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <Plus className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Your Personal Blocks</h3>
                  <p className="text-gray-600 mb-4">
                    Blocks you've created and can edit
                  </p>
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Block
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="global" className="mt-0">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 bg-blue-500 rounded-full flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Global Blocks</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        These blocks are shared across your organization and can be used by all team members.
                        Only administrators can create and modify global blocks.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center py-8">
                  <div className="h-12 w-12 bg-purple-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <div className="h-6 w-6 bg-purple-500 rounded-sm" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Organization Blocks</h3>
                  <p className="text-gray-600">
                    Blocks shared across your organization
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="archived" className="mt-0">
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 bg-yellow-500 rounded-full flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Archived Blocks</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        These blocks have been archived and are no longer available for insertion.
                        You can restore them or permanently delete them.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center py-8">
                  <div className="h-12 w-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <div className="h-6 w-6 bg-gray-400 rounded-sm" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Archived Blocks</h3>
                  <p className="text-gray-600">
                    Archived blocks will appear here
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {/* Help Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">Getting Started with Reusable Blocks</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex gap-3">
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-semibold">1</span>
            </div>
            <div>
              <h4 className="font-medium mb-1">Create Blocks</h4>
              <p className="text-sm text-gray-600">
                Design your content once, then reuse it anywhere on your site
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 font-semibold">2</span>
            </div>
            <div>
              <h4 className="font-medium mb-1">Organize & Tag</h4>
              <p className="text-sm text-gray-600">
                Use categories and tags to keep your blocks organized and searchable
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 font-semibold">3</span>
            </div>
            <div>
              <h4 className="font-medium mb-1">Share & Collaborate</h4>
              <p className="text-sm text-gray-600">
                Make blocks global to share with your team or keep them private
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ReusableBlocksPage;