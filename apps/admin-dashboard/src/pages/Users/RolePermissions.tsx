import { Shield, Users, Check, X, Info } from 'lucide-react';
import { roleDisplayNames, roleCapabilities, menuPermissions, UserRole } from '@/config/rolePermissions';
import { wordpressMenuItems } from '@/config/wordpressMenuFinal';

const RolePermissions = () => {
  const roles: UserRole[] = ['admin', 'manager', 'business', 'seller', 'supplier', 'affiliate', 'retailer', 'customer'];

  // Get all unique menu items
  const getAllMenuItems = (items: any[], parent?: string): { id: string; label: string; parent?: string }[] => {
    const result: { id: string; label: string; parent?: string }[] = [];
    
    items.forEach((item: any) => {
      if (!item.separator) {
        result.push({ id: item.id, label: item.label, parent });
        if (item.children) {
          result.push(...getAllMenuItems(item.children, item.label));
        }
      }
    });
    
    return result;
  };

  const allMenuItems = getAllMenuItems(wordpressMenuItems);

  const hasAccess = (menuId: string, role: UserRole): boolean => {
    const permission = menuPermissions.find((p: any) => p.menuId === menuId);
    return permission ? permission.roles.includes(role) : false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <Shield className="w-8 h-8 text-modern-primary" />
            역할별 권한 관리
          </h1>
          <p className="text-modern-text-secondary mt-1">
            각 역할이 접근할 수 있는 메뉴와 기능을 확인하세요.
          </p>
        </div>
      </div>

      {/* Role Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role: any) => (
          <div key={role} className="wp-card">
            <div className="wp-card-body">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-6 h-6 text-modern-primary" />
                <h3 className="font-semibold text-modern-text-primary">
                  {roleDisplayNames[role]}
                </h3>
              </div>
              <ul className="space-y-1">
                {roleCapabilities[role].map((capability, index) => (
                  <li key={index} className="text-sm text-modern-text-secondary flex items-start gap-2">
                    <Check className="w-4 h-4 text-modern-success flex-shrink-0 mt-0.5" />
                    <span>{capability}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Permission Matrix */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h2 className="text-lg font-semibold">메뉴 접근 권한 매트릭스</h2>
        </div>
        <div className="wp-card-body">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-modern-bg-tertiary border-b border-modern-border-primary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider sticky left-0 bg-modern-bg-tertiary">
                    메뉴 항목
                  </th>
                  {roles.map((role: any) => (
                    <th key={role} className="px-4 py-3 text-center text-xs font-medium text-modern-text-secondary uppercase tracking-wider min-w-[100px]">
                      {roleDisplayNames[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-modern-border-primary">
                {allMenuItems.map((menuItem: any) => (
                  <tr key={menuItem.id} className="hover:bg-modern-bg-hover">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-modern-text-primary sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        {menuItem.parent && <span className="text-modern-text-tertiary">└</span>}
                        <span className={menuItem.parent ? 'pl-4' : ''}>
                          {menuItem.label}
                        </span>
                      </div>
                    </td>
                    {roles.map((role: any) => (
                      <td key={role} className="px-4 py-3 whitespace-nowrap text-center">
                        {hasAccess(menuItem.id, role) ? (
                          <Check className="w-5 h-5 text-modern-success mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-modern-text-tertiary mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Permission Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Special Permissions */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h2 className="text-lg font-semibold">특별 권한</h2>
          </div>
          <div className="wp-card-body">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-modern-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-modern-text-primary">관리자 (Admin)</h4>
                  <p className="text-sm text-modern-text-secondary">
                    모든 메뉴와 기능에 무제한 접근 가능. 시스템 설정, 사용자 역할 관리, 
                    보안 설정 등 핵심 기능 제어 가능.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-modern-warning flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-modern-text-primary">매니저 (Manager)</h4>
                  <p className="text-sm text-modern-text-secondary">
                    일상적인 운영 관리 권한. 콘텐츠, 주문, 제휴사 관리 가능하나 
                    시스템 설정 변경 불가.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-modern-success flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-modern-text-primary">판매자/공급자</h4>
                  <p className="text-sm text-modern-text-secondary">
                    자신의 상품과 주문만 관리 가능. 매출 보고서와 재고 관리 접근 가능.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Permission Rules */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h2 className="text-lg font-semibold">권한 규칙</h2>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>계층적 권한:</strong> 상위 역할은 하위 역할의 모든 권한을 포함합니다.
                </p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-900">
                  <strong>데이터 격리:</strong> 판매자와 공급자는 자신의 데이터만 볼 수 있습니다.
                </p>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-900">
                  <strong>승인 권한:</strong> 신규 판매자 승인은 관리자와 매니저만 가능합니다.
                </p>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-900">
                  <strong>보안 설정:</strong> 시스템 설정과 사용자 역할 변경은 관리자 전용입니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="wp-card bg-modern-bg-tertiary">
        <div className="wp-card-body">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-modern-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-modern-text-primary mb-2">권한 변경 안내</h3>
              <p className="text-sm text-modern-text-secondary">
                사용자의 역할과 권한을 변경하려면 사용자 관리 페이지에서 해당 사용자를 선택하고 
                역할을 변경하세요. 권한 변경은 즉시 적용되며, 사용자는 다시 로그인해야 할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolePermissions;