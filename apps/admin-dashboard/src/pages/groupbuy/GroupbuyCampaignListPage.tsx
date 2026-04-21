/**
 * Groupbuy Campaign List Page
 * Phase 3: UI Integration
 *
 * Work Order 제약: 금액/수수료/정산 정보 UI 노출 절대 금지
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1B — BaseTable 직접 사용으로 마이그레이션
 */

import { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Edit2, Trash2, Users, CheckCircle, XCircle } from 'lucide-react';
import { OrganizationSelector } from '@/components/organization/OrganizationSelector';
import { PermissionGuard } from '@/components/organization/PermissionGuard';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import {
  GroupbuyStatusBadge,
  DeadlineCountdown
} from '@/components/groupbuy';
import { useGroupbuyCampaigns, GroupbuyCampaign } from '@/hooks/groupbuy';
import { CampaignFormModal } from './CampaignFormModal';

const GroupbuyCampaignListPage: FC = () => {
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<GroupbuyCampaign | null>(null);

  const {
    campaigns,
    loading,
    deleteCampaign,
    activateCampaign,
    closeCampaign,
    completeCampaign,
    cancelCampaign
  } = useGroupbuyCampaigns({
    organizationId: selectedOrg || undefined,
    status: statusFilter || undefined
  });

  const handleEdit = (campaign: GroupbuyCampaign) => {
    setSelectedCampaign(campaign);
    setFormModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 이 캠페인을 삭제하시겠습니까?')) return;
    try { await deleteCampaign(id); } catch (error) {}
  };

  const handleActivate = async (id: string) => {
    if (!window.confirm('이 캠페인을 활성화하시겠습니까?')) return;
    try { await activateCampaign(id); } catch (error) {}
  };

  const handleClose = async (id: string) => {
    if (!window.confirm('이 캠페인을 마감하시겠습니까?')) return;
    try { await closeCampaign(id); } catch (error) {}
  };

  const handleComplete = async (id: string) => {
    if (!window.confirm('이 캠페인을 완료 처리하시겠습니까?')) return;
    try { await completeCampaign(id); } catch (error) {}
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('정말 이 캠페인을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    try { await cancelCampaign(id); } catch (error) {}
  };

  const handleCreate = () => {
    setSelectedCampaign(null);
    setFormModalOpen(true);
  };

  const columns: O4OColumn<GroupbuyCampaign>[] = [
    {
      key: 'title',
      header: '캠페인명',
      sortable: true,
      sortAccessor: (row) => row.title,
      render: (_, row) => (
        <div className="flex flex-col">
          <Link to={`/admin/groupbuy/${row.id}`} className="font-medium text-blue-600 hover:text-blue-800">
            {row.title}
          </Link>
          {row.description && (
            <span className="text-xs text-gray-500 mt-1 line-clamp-1">{row.description}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      render: (_, row) => <GroupbuyStatusBadge status={row.status} />,
    },
    {
      key: 'quantity',
      header: '수량',
      align: 'center',
      render: (_, row) => (
        <div className="text-sm">
          <span className="font-medium">{row.totalOrderedQuantity}</span>
          <span className="text-gray-400 mx-1">/</span>
          <span className="text-green-600">{row.totalConfirmedQuantity}</span>
        </div>
      ),
    },
    {
      key: 'deadline',
      header: '마감',
      render: (_, row) => <DeadlineCountdown deadline={row.endDate} format="compact" />,
    },
    {
      key: 'participants',
      header: '참여',
      align: 'center',
      render: (_, row) => `${row.participantCount}명`,
    },
    {
      key: '_actions',
      header: '',
      width: 200,
      system: true,
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1">
          <Link to={`/admin/groupbuy/${row.id}`} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="상세보기">
            <Eye className="w-4 h-4" />
          </Link>
          <Link to={`/admin/groupbuy/${row.id}/participants`} className="p-1 text-green-600 hover:bg-green-50 rounded" title="참여자">
            <Users className="w-4 h-4" />
          </Link>
          <PermissionGuard required={['organization.manage']} showMessage={false}>
            <button onClick={() => handleEdit(row)} className="p-1 text-gray-600 hover:bg-gray-50 rounded" title="수정">
              <Edit2 className="w-4 h-4" />
            </button>
            {row.status === 'draft' && (
              <button onClick={() => handleActivate(row.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="활성화">
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            {row.status === 'active' && (
              <button onClick={() => handleClose(row.id)} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="마감">
                <XCircle className="w-4 h-4" />
              </button>
            )}
            {row.status === 'closed' && (
              <button onClick={() => handleComplete(row.id)} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700" title="완료">
                완료
              </button>
            )}
            {(row.status === 'draft' || row.status === 'active') && (
              <button onClick={() => handleCancel(row.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="취소">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <PermissionGuard required={['organization.read']}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">공동구매 캠페인</h1>
              <p className="text-sm text-gray-500 mt-1">조직 기반 공동구매 캠페인을 관리합니다</p>
            </div>
            <PermissionGuard required={['organization.manage']} showMessage={false}>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Plus className="w-4 h-4" />
                캠페인 생성
              </button>
            </PermissionGuard>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex gap-4">
            <div className="w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">조직</label>
              <OrganizationSelector value={selectedOrg} onChange={setSelectedOrg} filterByPermission />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                <option value="draft">초안</option>
                <option value="active">진행 중</option>
                <option value="closed">마감</option>
                <option value="completed">완료</option>
                <option value="cancelled">취소</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="animate-pulse p-4 space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
              </div>
            ) : (
              <BaseTable<GroupbuyCampaign>
                columns={columns}
                data={campaigns}
                rowKey={(row) => row.id}
                emptyMessage="캠페인이 없습니다"
                tableId="groupbuy-campaigns"
                columnVisibility
                persistState
              />
            )}
          </div>
        </div>

        {/* Form Modal */}
        {formModalOpen && (
          <CampaignFormModal
            campaign={selectedCampaign}
            onClose={() => {
              setFormModalOpen(false);
              setSelectedCampaign(null);
            }}
          />
        )}
      </div>
    </PermissionGuard>
  );
};

export default GroupbuyCampaignListPage;
