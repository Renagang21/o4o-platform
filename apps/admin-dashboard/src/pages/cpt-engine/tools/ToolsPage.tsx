/**
 * Tools Page
 * Provides Export/Import functionality for Field Groups
 */

import React, { useState } from 'react';
import { Download, Upload, FileJson, AlertCircle } from 'lucide-react';
import { ExportTab } from './components/ExportTab';
import { ImportTab } from './components/ImportTab';

type TabType = 'export' | 'import';

export const ToolsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('export');

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tools</h1>
        <p className="text-gray-600">
          Export and import Field Groups to migrate configurations or create backups
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Export/Import Guidelines</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Exported files are in JSON format and can be version controlled</li>
            <li>Import will validate structure before creating Field Groups</li>
            <li>Duplicate Field Group keys will be automatically resolved</li>
          </ul>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tab Headers */}
        <div className="border-b border-gray-200 flex">
          <button
            onClick={() => setActiveTab('export')}
            className={`
              flex items-center gap-2 px-6 py-3 font-medium text-sm
              border-b-2 transition-colors
              ${activeTab === 'export'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`
              flex items-center gap-2 px-6 py-3 font-medium text-sm
              border-b-2 transition-colors
              ${activeTab === 'import'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'export' && <ExportTab />}
          {activeTab === 'import' && <ImportTab />}
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
        <FileJson className="w-4 h-4" />
        <span>All exports are in JSON format compatible with ACF standards</span>
      </div>
    </div>
  );
};

export default ToolsPage;
