import { FC, FormEvent, useEffect, useState } from 'react';
import { 
  FileText,
  Send,
  CheckCircle,
  AlertCircle,
  Upload,
  Calendar,
  Hash,
  Type,
  Mail,
  Phone,
  Globe,
  MapPin,
  Star,
  Calculator,
  User,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import type { Form, FormField, FormFieldType, FormSubmission } from '@o4o/types';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';

export const SpectraViewBlock: FC<{
  viewId?: string;
  viewName?: string;
  showTitle?: boolean;
  customClasses?: string;
  itemsPerPage?: number;
  enableSearch?: boolean;
  enableFilters?: boolean;
  enableExport?: boolean;
}> = ({
  viewId,
  viewName,
  showTitle = true,
  customClasses = '',
  itemsPerPage = 25,
  enableSearch = true,
  enableFilters = true,
  enableExport = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch view definition and data
  const { data: viewData, isLoading } = useQuery({
    queryKey: ['view', viewId || viewName, { search: searchTerm, filters, page, sortField, sortDirection }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (viewId) params.append('viewId', viewId);
      if (viewName) params.append('viewName', viewName);
      if (searchTerm) params.append('search', searchTerm);
      if (sortField) {
        params.append('sort', sortField);
        params.append('direction', sortDirection);
      }
      params.append('page', String(page));
      params.append('limit', String(itemsPerPage));
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(`filter[${key}]`, value);
      });

      const response = await axios.get(`/api/views/render?${params}`);
      return response.data;
    },
    enabled: !!(viewId || viewName)
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!viewData) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>View not found</p>
      </div>
    );
  }

  const { view, data, total, totalPages } = viewData;

  return (
    <div className={`${customClasses}`}>
      {showTitle && view.title && (
        <h2 className="text-2xl font-bold mb-6">{view.title}</h2>
      )}

      {/* Controls */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        {enableSearch && view.interaction?.enableSearch && (
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Filters */}
        {enableFilters && view.interaction?.enableFilters && view.interaction.filterFields && (
          <div className="flex gap-4">
            {view.interaction.filterFields.map((field: any) => (
              <select
                key={field}
                value={filters[field] || ''}
                onChange={(e: any) => setFilters((prev: any) => ({ ...prev, [field]: e.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All {field}</option>
                {/* Options would be populated based on field type */}
              </select>
            ))}
          </div>
        )}
      </div>

      {/* Data display based on visualization type */}
      {view.visualization.type === 'table' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {view.template.fields.map((field: any) => (
                  <th
                    key={field}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortField === field) {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField(field);
                        setSortDirection('asc');
                      }
                    }}
                  >
                    {field}
                    {sortField === field && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  {view.template.fields.map((field: any) => (
                    <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item[field]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view.visualization.type === 'grid' ? (
        <div className={view.template.wrapperClass || 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
          {data.map((item: any, index: number) => (
            <div key={index} className={view.template.itemClass || 'bg-white rounded-lg shadow p-6'}>
              {view.template.fields.map((field: any) => (
                <div key={field} className="mb-2">
                  <span className="font-medium">{field}:</span>
                  <span className="ml-2">{item[field]}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : view.visualization.type === 'list' ? (
        <div className={view.template.wrapperClass || 'space-y-4'}>
          {data.map((item: any, index: number) => (
            <div key={index} className={view.template.itemClass || 'bg-white rounded-lg shadow p-4'}>
              {view.template.fields.map((field: any) => (
                <div key={field} className="mb-1">
                  {item[field]}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, total)} of {total} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};