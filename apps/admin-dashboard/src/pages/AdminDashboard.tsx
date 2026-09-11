import { FC } from 'react';
import { Link } from 'react-router-dom';
import { useAdminMenu } from '@/hooks/useAdminMenu';
import type { MenuItem } from '@/admin/menu/admin-menu.static';
import { VERSION_DISPLAY } from '@/config/version';

/**
 * 관리자 canonical home — `/admin`
 *
 * WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1:
 *   `CANONICAL_ADMIN_HOME = /admin`. `/home` · `/dashboard` 는 여기로 redirect 된다.
 *
 *   이 화면은 **메뉴 SSOT(admin-menu.static → useAdminMenu)** 를 그대로 진입 허브로
 *   렌더한다. 이전 화면의 하드코딩 통계(24/8/156/42 · 1,234/8,765 …), 가짜 활동 피드,
 *   가짜 플랫폼 뉴스(`href="#"`), 핸들러 없는 빠른 초안 폼, 배포 테스트 배너는 전부
 *   제거했다. 실제 backend 가 없는 숫자를 0 으로 바꿔 "실데이터처럼" 보이게 하지 않는다 —
 *   실데이터가 없으면 숫자를 보여 주지 않는다 (WO §10).
 *
 *   메뉴에 없는 경로는 여기에도 없다. 링크 = 메뉴 route 1:1 (데드링크 0 계약은
 *   src/tests/admin-legacy-route-api-and-navigation-closure.test.ts 가 고정한다).
 */
const AdminDashboard: FC = () => {
  const { menuItems, isLoading } = useAdminMenu();

  // 진입 허브에 표시할 항목: separator · collapse · 자기 자신(dashboard) 제외,
  // path 가 있거나 children 이 있는 것만
  const sections = menuItems.filter(
    (item) =>
      !item.separator &&
      item.id !== 'collapse' &&
      item.id !== 'dashboard' &&
      (item.path || item.children?.length),
  );

  return (
    <div className="o4o-dashboard">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-semibold">관리자 홈</h1>
        <span className="text-xs text-gray-400" data-testid="admin-version">
          {VERSION_DISPLAY}
        </span>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">메뉴를 불러오는 중…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sections.map((section) => (
            <SectionCard key={section.id} item={section} />
          ))}
        </div>
      )}
    </div>
  );
};

const SectionCard: FC<{ item: MenuItem }> = ({ item }) => {
  const children = (item.children ?? []).filter((c) => !c.separator && c.path);
  return (
    <section
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-5"
      data-testid={`admin-home-section-${item.id}`}
    >
      <h2 className="flex items-center gap-2 text-base font-semibold mb-3">
        <span className="text-gray-500">{item.icon}</span>
        {item.path ? (
          <Link to={item.path} className="hover:text-blue-700">
            {item.label}
          </Link>
        ) : (
          item.label
        )}
      </h2>
      {children.length > 0 && (
        <ul className="space-y-1 text-sm">
          {children.map((child) => (
            <li key={child.id}>
              <Link to={child.path!} className="text-blue-600 hover:text-blue-800">
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default AdminDashboard;
