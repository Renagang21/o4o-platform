/**
 * AdminMasterManagementPage - ProductMaster 관리
 *
 * WO-O4O-ADMIN-UI-COMPLETION-V1
 * Pattern: OperatorsPage.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { adminMasterApi, type AdminMaster } from '../../lib/api';

export default function AdminMasterManagementPage() {
  const [masters, setMasters] = useState<AdminMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [barcodeResult, setBarcodeResult] = useState<AdminMaster | null | undefined>(undefined);
  const [barcodeSearching, setBarcodeSearching] = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState<AdminMaster | null>(null);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Resolve modal
  const [resolveModal, setResolveModal] = useState(false);
  const [resolveBarcode, setResolveBarcode] = useState('');
  const [resolveName, setResolveName] = useState('');
  const [resolveBrand, setResolveBrand] = useState('');
  const [resolveSaving, setResolveSaving] = useState(false);

  const loadMasters = useCallback(async () => {
    setLoading(true);
    const data = await adminMasterApi.getMasters();
    setMasters(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  const handleBarcodeSearch = async () => {
    if (!barcodeSearch.trim()) return;
    setBarcodeSearching(true);
    setBarcodeResult(undefined);
    const result = await adminMasterApi.getMasterByBarcode(barcodeSearch.trim());
    setBarcodeResult(result);
    setBarcodeSearching(false);
  };

  const handleEdit = (master: AdminMaster) => {
    setEditModal(master);
    setEditName(master.marketingName || '');
    setEditBrand(master.brandName || '');
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    setEditSaving(true);
    const ok = await adminMasterApi.updateMaster(editModal.id, {
      marketingName: editName,
      brandName: editBrand,
    });
    setEditSaving(false);
    if (ok) {
      setEditModal(null);
      await loadMasters();
    }
  };

  const handleResolve = async () => {
    if (!resolveBarcode.trim()) return;
    setResolveSaving(true);
    const ok = await adminMasterApi.resolveMaster({
      barcode: resolveBarcode.trim(),
      manualData: {
        marketingName: resolveName || undefined,
        brandName: resolveBrand || undefined,
      },
    });
    setResolveSaving(false);
    if (ok) {
      setResolveModal(false);
      setResolveBarcode('');
      setResolveName('');
      setResolveBrand('');
      await loadMasters();
    }
  };

  const filtered = masters.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      !term ||
      m.barcode.toLowerCase().includes(term) ||
      (m.marketingName || '').toLowerCase().includes(term) ||
      (m.brandName || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ProductMaster 관리</h1>
          <p className="text-slate-500 mt-1">상품 마스터 데이터를 관리합니다</p>
        </div>
        <button
          onClick={() => setResolveModal(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
        >
          신규 등록
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">전체 Master</p>
          <p className="text-2xl font-bold text-slate-800">{masters.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
          <p className="text-sm font-medium text-slate-700 mb-2">바코드 검색</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={barcodeSearch}
              onChange={(e) => setBarcodeSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSearch()}
              placeholder="바코드 입력..."
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleBarcodeSearch}
              disabled={barcodeSearching}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50"
            >
              {barcodeSearching ? '검색중...' : '검색'}
            </button>
          </div>
          {barcodeResult !== undefined && (
            <div className="mt-3 p-3 rounded-lg bg-slate-50">
              {barcodeResult ? (
                <div className="text-sm">
                  <p className="font-medium text-slate-800">{barcodeResult.marketingName || '(이름 없음)'}</p>
                  <p className="text-slate-500">{barcodeResult.brandName} · {barcodeResult.barcode}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">해당 바코드의 Master가 없습니다</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
        <input
          type="text"
          placeholder="바코드, 상품명, 브랜드 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            {masters.length === 0 ? '등록된 Master가 없습니다' : '검색 결과가 없습니다'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">바코드</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상품명</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">브랜드</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">카테고리</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">등록일</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-slate-500">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-slate-700">{m.barcode}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{m.marketingName || '(이름 없음)'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{m.brandName || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{m.category?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(m.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleEdit(m)}
                      className="text-blue-500 hover:text-blue-700 font-medium text-sm"
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Master 수정</h3>
            <p className="text-xs text-slate-400 mb-4">{editModal.barcode}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">상품명</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">브랜드</label>
                <input
                  value={editBrand}
                  onChange={(e) => setEditBrand(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setEditModal(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">취소</button>
              <button onClick={handleEditSave} disabled={editSaving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {editSaving ? '저장중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4">새 ProductMaster 등록</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">바코드 *</label>
                <input
                  value={resolveBarcode}
                  onChange={(e) => setResolveBarcode(e.target.value)}
                  placeholder="바코드를 입력하세요"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">상품명 (수동 입력)</label>
                <input
                  value={resolveName}
                  onChange={(e) => setResolveName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">브랜드명 (수동 입력)</label>
                <input
                  value={resolveBrand}
                  onChange={(e) => setResolveBrand(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-xs text-slate-400">MFDS 자동 조회 후 수동 데이터와 병합됩니다</p>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => { setResolveModal(false); setResolveBarcode(''); setResolveName(''); setResolveBrand(''); }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">취소</button>
              <button onClick={handleResolve} disabled={resolveSaving || !resolveBarcode.trim()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {resolveSaving ? '등록중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
