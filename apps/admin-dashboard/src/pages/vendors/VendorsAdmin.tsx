/**
 * VendorsAdmin — Container for vendor management page
 *
 * WO-O4O-VENDORS-ADMIN-PAGES-SPLIT-V1
 * Refactored: 1,078 lines → container (~160 lines)
 *
 * Sub-components:
 *   - useVendorsAdmin (hook: state + handlers + filter/sort)
 *   - VendorsScreenOptions (column visibility + pagination)
 *   - VendorsTable (table + inline quick edit)
 */

import { ChevronDown, Settings } from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { useVendorsAdmin } from './vendors-admin/useVendorsAdmin';
import { VendorsScreenOptions } from './vendors-admin/VendorsScreenOptions';
import { VendorsTable } from './vendors-admin/VendorsTable';

const VendorsAdmin = () => {
  const {
    activeTab, setActiveTab,
    loading,
    selectedVendors,
    hoveredRow, setHoveredRow,
    hoverTimeoutRef,
    showBulkActions, setShowBulkActions,
    showScreenOptions, setShowScreenOptions,
    selectedBulkAction, setSelectedBulkAction,
    searchQuery, setSearchQuery,
    sortField, sortOrder,
    quickEditId,
    quickEditData, setQuickEditData,
    visibleColumns,
    itemsPerPage,
    handleColumnToggle, handleItemsPerPageChange,
    handleSelectAll, handleSelectVendor,
    handleAddNew, handleEdit, handleView,
    handleQuickEdit, handleSaveQuickEdit, handleCancelQuickEdit,
    handleApprove, handleSuspend, handleTrash, handleRestore, handlePermanentDelete,
    handleApplyBulkAction,
    handleSort,
    getFilteredVendors, getStatusCounts, getTierBadge,
  } = useVendorsAdmin();

  const counts = getStatusCounts();
  const filteredVendors = getFilteredVendors();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f0f1' }}>
        <div className="text-gray-600">판매자 목록을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f0f1' }}>
      {/* Header with Breadcrumb and Screen Options */}
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <div className="flex items-center justify-between">
          <AdminBreadcrumb
            items={[
              { label: '관리자', path: '/admin' },
              { label: '판매자/공급자', path: '/vendors' },
              { label: '모든 판매자' }
            ]}
          />

          {/* Screen Options Button */}
          <div className="relative">
            <button
              onClick={() => setShowScreenOptions(!showScreenOptions)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              <Settings className="w-4 h-4" />
              화면 옵션
              <ChevronDown className="w-3 h-3" />
            </button>

            <VendorsScreenOptions
              show={showScreenOptions}
              visibleColumns={visibleColumns}
              itemsPerPage={itemsPerPage}
              onColumnToggle={handleColumnToggle}
              onItemsPerPageChange={handleItemsPerPageChange}
              onClose={() => setShowScreenOptions(false)}
            />
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Title and Add New */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-normal text-gray-900">판매자</h1>
          <button
            onClick={handleAddNew}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            새 판매자 추가
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`text-sm ${activeTab === 'all' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            모든 판매자 ({counts.all})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('active')}
            className={`text-sm ${activeTab === 'active' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            활성 ({counts.active})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('pending')}
            className={`text-sm ${activeTab === 'pending' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            승인 대기 ({counts.pending})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('suspended')}
            className={`text-sm ${activeTab === 'suspended' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            정지 ({counts.suspended})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('trash')}
            className={`text-sm ${activeTab === 'trash' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            휴지통 ({counts.trash})
          </button>
        </div>

        {/* Search Box and Bulk Actions */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                {selectedBulkAction === 'approve' ? '승인' :
                 selectedBulkAction === 'suspend' ? '정지' :
                 selectedBulkAction === 'trash' ? '휴지통으로 이동' : '일괄 작업'}
                <ChevronDown className="w-3 h-3" />
              </button>

              {showBulkActions && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg z-20">
                  <button
                    onClick={() => {
                      setSelectedBulkAction('approve');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBulkAction('suspend');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    정지
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBulkAction('trash');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    휴지통으로 이동
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleApplyBulkAction}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
                selectedBulkAction && selectedVendors.size > 0
                  ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedBulkAction || selectedVendors.size === 0}
            >
              적용
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="판매자 검색..."
            />
            <button
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
            >
              판매자 검색
            </button>
          </div>
        </div>

        {/* Item count */}
        <div className="text-sm text-gray-600 mb-2">
          {filteredVendors.length}개 항목
        </div>

        {/* Table */}
        <VendorsTable
          vendors={filteredVendors}
          selectedVendors={selectedVendors}
          hoveredRow={hoveredRow}
          quickEditId={quickEditId}
          quickEditData={quickEditData}
          visibleColumns={visibleColumns}
          sortField={sortField}
          sortOrder={sortOrder}
          hoverTimeoutRef={hoverTimeoutRef}
          onSelectAll={handleSelectAll}
          onSelectVendor={handleSelectVendor}
          onHover={setHoveredRow}
          onSort={handleSort}
          onEdit={handleEdit}
          onView={handleView}
          onQuickEdit={handleQuickEdit}
          onSaveQuickEdit={handleSaveQuickEdit}
          onCancelQuickEdit={handleCancelQuickEdit}
          onQuickEditDataChange={setQuickEditData}
          onApprove={handleApprove}
          onSuspend={handleSuspend}
          onTrash={handleTrash}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
          getTierBadge={getTierBadge}
        />

        {/* Bottom Actions */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                일괄 작업
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={handleApplyBulkAction}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
                selectedBulkAction && selectedVendors.size > 0
                  ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedBulkAction || selectedVendors.size === 0}
            >
              적용
            </button>
          </div>

          <div className="text-sm text-gray-600">
            {filteredVendors.length}개 항목
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorsAdmin;
