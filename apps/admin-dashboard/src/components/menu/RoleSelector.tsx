import { FC } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { ROLES } from '@/lib/rbac-catalog';

interface RoleSelectorProps {
  selectedRoles: string[];
  onChange: (roles: string[]) => void;
}

const ROLE_OPTIONS = Object.values(ROLES).map((r) => ({
  name: r.key,
  displayName: r.label,
  badgeClass: r.badgeClass,
}));

export const RoleSelector: FC<RoleSelectorProps> = ({ selectedRoles, onChange }) => {
  const roles = ROLE_OPTIONS;

  const toggleRole = (roleName: string) => {
    const newRoles = selectedRoles.includes(roleName)
      ? selectedRoles.filter(r => r !== roleName)
      : [...selectedRoles, roleName];
    onChange(newRoles);
  };

  const toggleAll = () => {
    if (selectedRoles.length === roles.length) {
      onChange([]);
    } else {
      onChange(roles.map(r => r.name));
    }
  };

  const allSelected = selectedRoles.length === roles.length;
  const noneSelected = selectedRoles.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          표시 대상 역할
          <Info className="w-4 h-4 text-gray-400" />
        </Label>
        <button
          type="button"
          onClick={toggleAll}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {allSelected ? '모두 해제' : '모두 선택'}
        </button>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>💡 안내:</strong> {noneSelected || allSelected ? (
            <>선택하지 않으면 <strong>모든 사용자</strong>에게 표시됩니다.</>
          ) : (
            <>선택된 역할을 가진 사용자에게만 표시됩니다.</>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
        {roles.map((role) => {
          const isSelected = selectedRoles.includes(role.name);

          return (
            <div
              key={role.name}
              className={`
                flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer
                ${isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
              onClick={() => toggleRole(role.name)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleRole(role.name)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-xs ${role.badgeClass}`}>
                    {role.displayName}
                  </Badge>
                  <span className="text-xs text-gray-500">({role.name})</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedRoles.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-700 mb-2">
            선택된 역할: <strong>{selectedRoles.length}개</strong>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedRoles.map(roleName => {
              const role = roles.find(r => r.name === roleName);
              return role ? (
                <Badge
                  key={roleName}
                  className={`text-xs ${role.badgeClass}`}
                >
                  {role.displayName}
                </Badge>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};
