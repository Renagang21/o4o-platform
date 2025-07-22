import { useState } from 'react';
import { Plus, Search, Monitor, MapPin } from 'lucide-react';

export default function StoreManager() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for stores
  const stores = [
    {
      id: '1',
      name: 'Downtown Store',
      address: '123 Main St, City',
      displays: 3,
      status: 'active',
    },
    {
      id: '2',
      name: 'Mall Location',
      address: '456 Shopping Center',
      displays: 5,
      status: 'active',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Store Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage stores and their digital display configurations
        </p>
      </div>

      {/* Actions bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search stores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button className="ml-4 flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus className="h-5 w-5 mr-2" />
          Add Store
        </button>
      </div>

      {/* Stores grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((store) => (
          <div key={store.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
              <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded">
                {store.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                {store.address}
              </div>
              <div className="flex items-center">
                <Monitor className="h-4 w-4 mr-2" />
                {store.displays} displays
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <button className="flex-1 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100">
                Manage
              </button>
              <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200">
                View Display
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}