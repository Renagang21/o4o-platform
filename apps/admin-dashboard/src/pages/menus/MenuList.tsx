import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import { ScreenOptionsReact } from '@/components/common/ScreenOptionsEnhanced';
import { useScreenOptions, ColumnOption } from '@/hooks/useScreenOptions';
import { formatDate } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { Menu, MenuLocation } from '@o4o/types';
import { useAdminNotices } from '@/hooks/useAdminNotices';

const locationLabels: Record<MenuLocation, string> = {
  primary: 'Primary Menu',
  footer: 'Footer',
  sidebar: 'Sidebar',
  mobile: 'Mobile',
};

const MenuList: FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMenus, setSelectedMenus] = useState<any[]>([]);

  // Default column configuration
  const defaultColumns: ColumnOption[] = [
    { id: 'name', label: 'Menu Name', visible: true, required: true },
    { id: 'location', label: 'Location', visible: true },
    { id: 'items', label: 'Items', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'date', label: 'Date', visible: true }
  ];

  // Use screen options hook
  const {
    options,
    itemsPerPage,
    isColumnVisible,
    updateColumnVisibility,
    setItemsPerPage
  } = useScreenOptions('menus-list', {
    columns: defaultColumns,
    itemsPerPage: 20
  });

  // Fetch menus
  const { data: menuData, isLoading } = useQuery({
    queryKey: ['menus', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      
      // TODO: Implement menus API endpoint in backend
      // const response = await authClient.api.get(`/menus?${params}`);
      // return response.data;
      
      // Mock data for now
      const now = new Date();
      return {
        menus: [
          { 
            id: '1', 
            name: 'Main Menu', 
            location: 'primary' as MenuLocation, 
            items: [{}, {}, {}], 
            isActive: true, 
            createdAt: now, 
            updatedAt: now 
          },
          { 
            id: '2', 
            name: 'Footer Menu', 
            location: 'footer' as MenuLocation, 
            items: [{}, {}], 
            isActive: true, 
            createdAt: now, 
            updatedAt: now 
          },
          { 
            id: '3', 
            name: 'Mobile Navigation', 
            location: 'mobile' as MenuLocation, 
            items: [{}], 
            isActive: false, 
            createdAt: now, 
            updatedAt: now 
          }
        ]
      };
    }
  });

  const menus = menuData?.menus || [];

  // Delete menu mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.delete(`/menus/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      success('Menu deleted.');
    },
    onError: () => {
      error('Failed to delete menu.');
    }
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return authClient.api.patch(`/menus/${id}/active`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      success('Menu status updated.');
    },
    onError: () => {
      error('Failed to update menu status.');
    }
  });

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    if (selectedMenus.length === 0) {
      error('No menus selected.');
      return;
    }
    
    switch (action) {
      case 'delete':
        success(`${selectedMenus.length} menu(s) deleted.`);
        setSelectedMenus([]);
        break;
      case 'activate':
        success(`${selectedMenus.length} menu(s) activated.`);
        setSelectedMenus([]);
        break;
      case 'deactivate':
        success(`${selectedMenus.length} menu(s) deactivated.`);
        setSelectedMenus([]);
        break;
      default:
        break;
    }
  };

  // Define table columns - only show visible ones
  const allColumns: WordPressTableColumn[] = [
    { id: 'name', label: 'Menu Name', sortable: true },
    { id: 'location', label: 'Location' },
    { id: 'items', label: 'Items', align: 'center' },
    { id: 'status', label: 'Status' },
    { id: 'date', label: 'Date', sortable: true }
  ];
  
  const columns = allColumns.filter((col: any) => isColumnVisible(col.id));

  // Transform menus to table rows
  const rows: WordPressTableRow[] = menus.map((menu: any) => ({
    id: menu.id,
    data: {
      name: (
        <div>
          <strong>
            <a href={`/appearance/menus/${menu.id}/edit`} className="row-title">
              {menu.name}
            </a>
          </strong>
          {menu.description && (
            <div className="text-sm text-gray-500">{menu.description}</div>
          )}
        </div>
      ),
      location: (
        <Badge variant="outline">
          {locationLabels[menu.location as keyof typeof locationLabels]}
        </Badge>
      ),
      items: (
        <span className="menu-items-count">
          {menu.items.length} item{menu.items.length !== 1 ? 's' : ''}
        </span>
      ),
      status: (
        <Badge 
          variant={menu.isActive ? 'default' : 'secondary'}
          className={menu.isActive ? 'bg-green-100 text-green-800' : ''}
        >
          {menu.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
      date: (
        <div>
          <abbr title={formatDate(menu.createdAt)}>
            {formatDate(menu.createdAt)}
          </abbr>
        </div>
      )
    },
    actions: [
      {
        label: 'Edit',
        href: `/appearance/menus/${menu.id}/edit`,
        primary: true
      },
      {
        label: menu.isActive ? 'Deactivate' : 'Activate',
        onClick: () => toggleActiveMutation.mutate({ id: menu.id, isActive: !menu.isActive })
      },
      {
        label: 'Duplicate',
        onClick: () => {/* TODO: Implement duplicate menu */}
      },
      {
        label: 'Delete',
        onClick: () => deleteMutation.mutate(menu.id),
        destructive: true
      }
    ]
  }));

  return (
    <div className="wrap">
      <h1 className="wp-heading-inline">Menus</h1>
      
      <Button 
        className="page-title-action ml-2"
        onClick={() => window.location.href = '/appearance/menus/new'}
      >
        Add New
      </Button>
      
      <hr className="wp-header-end" />

      {/* Search and Filters */}
      <div className="tablenav top">
        <div className="alignleft actions bulkactions">
          <Select onValueChange={handleBulkAction}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Bulk Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="activate">Activate</SelectItem>
              <SelectItem value="deactivate">Deactivate</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="secondary" 
            size="sm" 
            className="ml-2"
            onClick={() => handleBulkAction('apply')}
            disabled={selectedMenus.length === 0}
          >
            Apply
          </Button>
        </div>

        <div className="tablenav-pages">
          <div className="displaying-num">{menus.length} items</div>
        </div>
      </div>

      {/* Search Box */}
      <p className="search-box">
        <label className="screen-reader-text" htmlFor="menu-search-input">
          Search Menus:
        </label>
        <Input
          type="search"
          id="menu-search-input"
          value={searchQuery}
          onChange={(e: any) => setSearchQuery(e.target.value)}
          placeholder="Search menus..."
          className="w-auto inline-block mr-2"
        />
        <Button variant="secondary" size="sm">
          Search Menus
        </Button>
      </p>

      {/* WordPress Table */}
      <WordPressTable
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedMenus}
        onSelectRow={(rowId, selected) => {
          if (selected) {
            setSelectedMenus([...selectedMenus, rowId]);
          } else {
            setSelectedMenus(selectedMenus.filter(id => id !== rowId));
          }
        }}
        onSelectAll={(selected) => {
          if (selected) {
            setSelectedMenus(menus.map((menu: any) => menu.id));
          } else {
            setSelectedMenus([]);
          }
        }}
        loading={isLoading}
        emptyMessage="No menus found. Create your first menu to get started."
        className="wp-list-table widefat fixed striped menus"
      />

      {/* Bottom table nav */}
      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <div className="displaying-num">{menus.length} items</div>
        </div>
      </div>

      {/* Screen Options */}
      <ScreenOptionsReact
        columns={options.columns}
        itemsPerPage={itemsPerPage}
        onColumnToggle={updateColumnVisibility}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};

export default MenuList;
