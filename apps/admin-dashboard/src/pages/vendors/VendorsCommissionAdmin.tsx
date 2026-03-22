/**
 * VendorsCommissionAdmin — Container for commission management page
 *
 * WO-O4O-VENDORS-ADMIN-PAGES-SPLIT-V1
 * Refactored: 1,162 lines → container (~150 lines)
 *
 * Sub-components:
 *   - useVendorsCommission (hook: state + handlers + filter/sort)
 *   - CommissionSummaryCards (4 stat cards)
 *   - CommissionScreenOptions (column visibility + pagination)
 *   - CommissionTable (table + rate edit + expanded details + styles)
 */

import { Download, Search, Settings } from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import toast from 'react-hot-toast';
import { useVendorsCommission } from './vendors-commission/useVendorsCommission';
import { CommissionSummaryCards } from './vendors-commission/CommissionSummaryCards';
import { CommissionScreenOptions } from './vendors-commission/CommissionScreenOptions';
import { CommissionTable } from './vendors-commission/CommissionTable';

const VendorsCommissionAdmin = () => {
  const {
    activeTab, setActiveTab,
    loading,
    selectedIds,
    searchQuery, setSearchQuery,
    selectedPeriod, setSelectedPeriod,
    sortField, sortOrder,
    selectedAction, setSelectedAction,
    showScreenOptions, setShowScreenOptions,
    itemsPerPage, setItemsPerPage,
    visibleColumns,
    expandedRows,
    editingRates, setEditingRates,
    searchInputRef, selectAllRef,
    handleSort, handleSelectAll, handleSelect,
    handleBulkAction,
    handleQuickEditRate, handlePayCommission,
    toggleRowExpansion, toggleColumn,
    getFilteredCommissions, calculateSummary,
    getStatusBadge, getTabCounts,
    getCurrentPeriod,
  } = useVendorsCommission();

  const filteredCommissions = getFilteredCommissions();
  const summary = calculateSummary();
  const counts = getTabCounts();

  if (loading) {
    return (
      <div className="o4o-admin-container">
        <div className="loading-spinner">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="o4o-admin-container">
      <AdminBreadcrumb
        items={[
          { label: '판매자/공급자', path: '/admin/vendors' },
          { label: '수수료 관리' }
        ]}
      />

      <div className="o4o-page-header">
        <h1 className="o4o-heading-inline">수수료 관리</h1>
        <a href="#" className="page-title-action" onClick={(e) => {
          e.preventDefault();
          toast.success('수수료 내역을 다운로드하고 있습니다.');
        }}>
          <Download className="w-4 h-4 inline mr-1" />
          내역 다운로드
        </a>
        <button
          className="o4o-screen-options-toggle"
          onClick={() => setShowScreenOptions(!showScreenOptions)}
        >
          <Settings className="w-4 h-4" />
          화면 옵션
        </button>
      </div>

      {/* Screen Options */}
      <CommissionScreenOptions
        show={showScreenOptions}
        visibleColumns={visibleColumns}
        itemsPerPage={itemsPerPage}
        onToggleColumn={toggleColumn}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value);
          localStorage.setItem('commission-per-page', value.toString());
        }}
        onClose={() => setShowScreenOptions(false)}
      />

      {/* Summary Cards */}
      <CommissionSummaryCards summary={summary} />

      {/* Status Tabs */}
      <ul className="o4o-tabs">
        <li className={activeTab === 'all' ? 'active' : ''}>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('all'); }}>
            전체 <span className="count">({counts.all})</span>
          </a>
        </li>
        <li className={activeTab === 'paid' ? 'active' : ''}>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('paid'); }}>
            지급완료 <span className="count">({counts.paid})</span>
          </a>
        </li>
        <li className={activeTab === 'pending' ? 'active' : ''}>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('pending'); }}>
            대기중 <span className="count">({counts.pending})</span>
          </a>
        </li>
        <li className={activeTab === 'processing' ? 'active' : ''}>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('processing'); }}>
            처리중 <span className="count">({counts.processing})</span>
          </a>
        </li>
        <li className={activeTab === 'scheduled' ? 'active' : ''}>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('scheduled'); }}>
            예정 <span className="count">({counts.scheduled})</span>
          </a>
        </li>
      </ul>

      {/* Controls */}
      <div className="o4o-list-controls">
        <div className="o4o-bulk-actions">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="o4o-select"
          >
            <option value="">일괄 작업</option>
            <option value="pay">일괄 지급</option>
            <option value="export">내보내기</option>
            <option value="recalculate">재계산</option>
          </select>
          <button
            className="o4o-button"
            onClick={handleBulkAction}
          >
            적용
          </button>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="o4o-select"
            style={{ marginLeft: '10px' }}
          >
            <option value={getCurrentPeriod()}>{getCurrentPeriod()} (이번달)</option>
            <option value="2024-11">2024-11</option>
            <option value="2024-10">2024-10</option>
            <option value="2024-09">2024-09</option>
            <option value="2024-08">2024-08</option>
          </select>
        </div>

        <div className="o4o-search-box">
          <input
            ref={searchInputRef}
            type="search"
            placeholder="판매자 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
          />
          <button className="o4o-button">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <CommissionTable
        commissions={filteredCommissions}
        selectedIds={selectedIds}
        expandedRows={expandedRows}
        editingRates={editingRates}
        visibleColumns={visibleColumns}
        sortField={sortField}
        sortOrder={sortOrder}
        selectAllRef={selectAllRef}
        onSelectAll={handleSelectAll}
        onSelect={handleSelect}
        onSort={handleSort}
        onEditingRatesChange={setEditingRates}
        onQuickEditRate={handleQuickEditRate}
        onPayCommission={handlePayCommission}
        onToggleRowExpansion={toggleRowExpansion}
        getStatusBadge={getStatusBadge}
      />

      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <span className="displaying-num">{filteredCommissions.length}개 항목</span>
        </div>
      </div>
    </div>
  );
};

export default VendorsCommissionAdmin;
