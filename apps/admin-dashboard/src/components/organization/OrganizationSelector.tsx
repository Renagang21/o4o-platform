import { FC, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { authClient } from '@o4o/auth-client';

interface Organization {
  id: string;
  name: string;
  type: 'headquarters' | 'branch' | 'chapter';
  parentId?: string;
  children?: Organization[];
}

interface OrganizationSelectorProps {
  value?: string;
  onChange: (organizationId: string) => void;
  placeholder?: string;
  className?: string;
  filterByPermission?: boolean;
}

export const OrganizationSelector: FC<OrganizationSelectorProps> = ({
  value,
  onChange,
  placeholder = '조직 선택',
  className = '',
  filterByPermission = false
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, [filterByPermission]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterByPermission) {
        params.filterByPermission = true;
      }

      const response = await authClient.api.get('/api/organizations', { params });
      setOrganizations(response.data || []);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (items: Organization[]): Organization[] => {
    const map = new Map<string, Organization>();
    const roots: Organization[] = [];

    // Create map
    items.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });

    // Build tree
    items.forEach(item => {
      const node = map.get(item.id)!;
      if (item.parentId) {
        const parent = map.get(item.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const flattenTree = (nodes: Organization[], level = 0): Array<{ org: Organization; level: number }> => {
    const result: Array<{ org: Organization; level: number }> = [];
    nodes.forEach(node => {
      result.push({ org: node, level });
      if (node.children && node.children.length > 0) {
        result.push(...flattenTree(node.children, level + 1));
      }
    });
    return result;
  };

  const tree = buildTree(organizations);
  const flatItems = flattenTree(tree);

  const selectedOrg = organizations.find(org => org.id === value);

  const handleSelect = (orgId: string) => {
    onChange(orgId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Select Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <span className={selectedOrg ? 'text-gray-900' : 'text-gray-500'}>
          {loading ? '로딩 중...' : (selectedOrg ? selectedOrg.name : placeholder)}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !loading && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Options */}
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {flatItems.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                조직이 없습니다
              </div>
            ) : (
              <>
                {/* All option */}
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                    !value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                  }`}
                >
                  전체 조직
                </button>

                {flatItems.map(({ org, level }) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSelect(org.id)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center ${
                      value === org.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                    }`}
                    style={{ paddingLeft: `${16 + level * 24}px` }}
                  >
                    {level > 0 && (
                      <span className="text-gray-400 mr-2">{'└'.repeat(level)}</span>
                    )}
                    <span>{org.name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({org.type === 'headquarters' ? '본부' : org.type === 'branch' ? '지부' : '분회'})
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OrganizationSelector;
