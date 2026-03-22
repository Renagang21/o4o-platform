/**
 * VendorsTable — Vendor list table with inline quick edit
 *
 * WO-O4O-VENDORS-ADMIN-PAGES-SPLIT-V1
 * Extracted from VendorsAdmin.tsx (lines 686-1041)
 */

import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Store,
  DollarSign,
  Package,
  Star,
  UserCheck,
  Clock,
  Ban,
  AlertCircle
} from 'lucide-react';
import type { Vendor, VendorStatus, VendorSortField, VendorSortOrder } from './vendors-admin-types';

interface VendorsTableProps {
  vendors: Vendor[];
  selectedVendors: Set<string>;
  hoveredRow: string | null;
  quickEditId: string | null;
  quickEditData: { businessName: string; status: VendorStatus; tier: Vendor['tier']; commission: number };
  visibleColumns: Record<string, boolean>;
  sortField: VendorSortField;
  sortOrder: VendorSortOrder;
  hoverTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectVendor: (id: string) => void;
  onHover: (id: string | null) => void;
  onSort: (field: VendorSortField) => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onQuickEdit: (id: string) => void;
  onSaveQuickEdit: () => void;
  onCancelQuickEdit: () => void;
  onQuickEditDataChange: (data: { businessName: string; status: VendorStatus; tier: Vendor['tier']; commission: number }) => void;
  onApprove: (id: string) => void;
  onSuspend: (id: string) => void;
  onTrash: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  getTierBadge: (tier: Vendor['tier']) => React.ReactNode;
}

export function VendorsTable({
  vendors,
  selectedVendors,
  hoveredRow,
  quickEditId,
  quickEditData,
  visibleColumns,
  sortField,
  sortOrder,
  hoverTimeoutRef,
  onSelectAll,
  onSelectVendor,
  onHover,
  onSort,
  onEdit,
  onView,
  onQuickEdit,
  onSaveQuickEdit,
  onCancelQuickEdit,
  onQuickEditDataChange,
  onApprove,
  onSuspend,
  onTrash,
  onRestore,
  onPermanentDelete,
  getTierBadge,
}: VendorsTableProps) {
  return (
    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-white border-b border-gray-200">
          <tr>
            <th className="w-10 px-3 py-3 text-left">
              <input
                type="checkbox"
                onChange={onSelectAll}
                checked={selectedVendors.size === vendors.length && vendors.length > 0}
              />
            </th>
            {visibleColumns.avatar && (
              <th className="w-12 px-3 py-3"></th>
            )}
            <th className="px-3 py-3 text-left">
              <button
                onClick={() => onSort('businessName')}
                className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
              >
                판매자 정보
                {sortField === 'businessName' ? (
                  sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3 opacity-50" />
                )}
              </button>
            </th>
            {visibleColumns.tier && (
              <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">등급</th>
            )}
            {visibleColumns.products && (
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => onSort('products')}
                  className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                >
                  상품
                  {sortField === 'products' ? (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  )}
                </button>
              </th>
            )}
            {visibleColumns.revenue && (
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => onSort('revenue')}
                  className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                >
                  매출액
                  {sortField === 'revenue' ? (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  )}
                </button>
              </th>
            )}
            {visibleColumns.rating && (
              <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">평점</th>
            )}
            {visibleColumns.commission && (
              <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">수수료</th>
            )}
            {visibleColumns.lastActivity && (
              <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">마지막 활동</th>
            )}
            {visibleColumns.status && (
              <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">상태</th>
            )}
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => (
            <React.Fragment key={vendor.id}>
              {quickEditId === vendor.id ? (
                // Quick Edit Row
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td colSpan={100} className="p-4">
                    <div className="bg-white border border-gray-300 rounded p-4">
                      <h3 className="font-medium text-sm mb-3">빠른 편집</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">상호명</label>
                          <input
                            type="text"
                            value={quickEditData.businessName}
                            onChange={(e) => onQuickEditDataChange({...quickEditData, businessName: e.target.value})}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                          <select
                            value={quickEditData.status}
                            onChange={(e) => onQuickEditDataChange({...quickEditData, status: e.target.value as VendorStatus})}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="active">활성</option>
                            <option value="pending">승인 대기</option>
                            <option value="suspended">정지</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">등급</label>
                          <select
                            value={quickEditData.tier}
                            onChange={(e) => onQuickEditDataChange({...quickEditData, tier: e.target.value as Vendor['tier']})}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="bronze">브론즈</option>
                            <option value="silver">실버</option>
                            <option value="gold">골드</option>
                            <option value="platinum">플래티넘</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">수수료율 (%)</label>
                          <input
                            type="number"
                            value={quickEditData.commission}
                            onChange={(e) => onQuickEditDataChange({...quickEditData, commission: parseFloat(e.target.value)})}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={onSaveQuickEdit}
                          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          업데이트
                        </button>
                        <button
                          onClick={onCancelQuickEdit}
                          className="px-4 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                // Normal Row
                <tr
                  className="border-b border-gray-100 hover:bg-gray-50"
                  onMouseEnter={() => {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                    }
                    hoverTimeoutRef.current = setTimeout(() => {
                      onHover(vendor.id);
                    }, 300);
                  }}
                  onMouseLeave={() => {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    onHover(null);
                  }}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedVendors.has(vendor.id)}
                      onChange={() => onSelectVendor(vendor.id)}
                    />
                  </td>
                  {visibleColumns.avatar && (
                    <td className="px-3 py-3">
                      {vendor.avatar ? (
                        <img
                          src={vendor.avatar}
                          alt={vendor.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <Store className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <div>
                      <button
                        onClick={() => onEdit(vendor.id)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm text-left"
                      >
                        {vendor.businessName}
                      </button>
                      <div className="text-xs text-gray-500">
                        {vendor.name} · {vendor.email}
                      </div>
                      {hoveredRow === vendor.id && (
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          {vendor.status === 'trash' ? (
                            <>
                              <button
                                onClick={() => onRestore(vendor.id)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                복원
                              </button>
                              <span className="text-gray-400">|</span>
                              <button
                                onClick={() => onPermanentDelete(vendor.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                영구 삭제
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => onEdit(vendor.id)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                편집
                              </button>
                              <span className="text-gray-400">|</span>
                              <button
                                onClick={() => onQuickEdit(vendor.id)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                빠른 편집
                              </button>
                              {vendor.status === 'pending' && (
                                <>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => onApprove(vendor.id)}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    승인
                                  </button>
                                </>
                              )}
                              {vendor.status === 'active' && (
                                <>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => onSuspend(vendor.id)}
                                    className="text-orange-600 hover:text-orange-800"
                                  >
                                    정지
                                  </button>
                                </>
                              )}
                              <span className="text-gray-400">|</span>
                              <button
                                onClick={() => onTrash(vendor.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                휴지통
                              </button>
                              <span className="text-gray-400">|</span>
                              <button
                                onClick={() => onView(vendor.id)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                보기
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  {visibleColumns.tier && (
                    <td className="px-3 py-3 text-sm">
                      {getTierBadge(vendor.tier)}
                    </td>
                  )}
                  {visibleColumns.products && (
                    <td className="px-3 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3 text-gray-400" />
                        {vendor.products}
                      </div>
                    </td>
                  )}
                  {visibleColumns.revenue && (
                    <td className="px-3 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-gray-400" />
                        {vendor.revenue.toLocaleString()}원
                      </div>
                    </td>
                  )}
                  {visibleColumns.rating && (
                    <td className="px-3 py-3 text-sm">
                      {vendor.rating > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          <span>{vendor.rating.toFixed(1)}</span>
                          <span className="text-gray-400">({vendor.reviewCount})</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.commission && (
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {vendor.commission}%
                    </td>
                  )}
                  {visibleColumns.lastActivity && (
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {new Date(vendor.lastActivity).toLocaleDateString()}
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-3 py-3 text-sm">
                      {vendor.status === 'active' && (
                        <span className="flex items-center gap-1 text-green-600">
                          <UserCheck className="w-3 h-3" />
                          활성
                        </span>
                      )}
                      {vendor.status === 'pending' && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Clock className="w-3 h-3" />
                          승인 대기
                        </span>
                      )}
                      {vendor.status === 'suspended' && (
                        <span className="flex items-center gap-1 text-red-600">
                          <Ban className="w-3 h-3" />
                          정지
                        </span>
                      )}
                      {vendor.status === 'trash' && (
                        <span className="text-gray-500">휴지통</span>
                      )}
                    </td>
                  )}
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {vendors.length === 0 && (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">판매자가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
