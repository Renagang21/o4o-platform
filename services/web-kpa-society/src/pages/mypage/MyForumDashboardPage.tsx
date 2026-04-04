/**
 * MyForumDashboardPage - 내 포럼 관리 대시보드 (KPA Society)
 *
 * WO-O4O-FORUM-MY-FORUM-EXPANSION-V1
 * WO-KPA-A-MYPAGE-UNIFIED-REQUEST-INBOX-V1: 신청 내역 → 통합 신청함으로 이전
 *
 * 포럼 운영 관리 전용. 신청 내역은 MyRequestsPage에서 확인.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MyPageNavigation } from '../../components/common';
import {
  MessageSquare,
  MessageSquarePlus,
  ExternalLink,
  Loader2,
  AlertCircle,
  Layers,
  Pencil,
  X,
  Save,
  Trash2,
  Users,
} from 'lucide-react';
import { forumApi } from '../../api/forum';

// ============================================================================
// Types
// ============================================================================

interface MyForumCategory {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  forumType?: string;
  accessLevel?: string;
  isActive: boolean;
  postCount: number;
  iconEmoji?: string | null;
  iconUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    deleteRequestStatus?: 'pending' | 'approved' | 'rejected';
    deleteRequestReason?: string;
    deleteRequestedAt?: string;
    deleteReviewComment?: string;
  } | null;
}

// ============================================================================
// Component
// ============================================================================

interface EditFormData {
  name: string;
  description: string;
  iconEmoji: string;
  iconUrl: string;
}

export default function MyForumDashboardPage() {
  const [myCategories, setMyCategories] = useState<MyForumCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [editingCategory, setEditingCategory] = useState<MyForumCategory | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({ name: '', description: '', iconEmoji: '', iconUrl: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingCategory, setDeletingCategory] = useState<MyForumCategory | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadMyCategories();
  }, []);

  const loadMyCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await forumApi.getMyCategories();
      const apiRes = response as any;
      setMyCategories((apiRes.data || []) as MyForumCategory[]);
    } catch {
      // silent
    } finally {
      setCategoriesLoading(false);
    }
  };

  const openEdit = (cat: MyForumCategory) => {
    setEditingCategory(cat);
    setEditForm({ name: cat.name, description: cat.description || '', iconEmoji: cat.iconEmoji || '', iconUrl: cat.iconUrl || '' });
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory) return;
    const trimmedName = editForm.name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) { setEditError('포럼 이름은 2~50자여야 합니다'); return; }
    setEditSaving(true);
    setEditError(null);
    try {
      await forumApi.updateMyCategory(editingCategory.id, {
        name: trimmedName,
        description: editForm.description.trim() || undefined,
        iconEmoji: editForm.iconEmoji.trim() || null,
        iconUrl: editForm.iconUrl.trim() || null,
      });
      setEditingCategory(null);
      loadMyCategories();
    } catch (err: any) {
      setEditError(err?.message || '저장에 실패했습니다.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!deletingCategory) return;
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      await forumApi.requestDeleteCategory(deletingCategory.id, { reason: deleteReason.trim() || undefined });
      setDeletingCategory(null);
      setDeleteReason('');
      loadMyCategories();
    } catch (err: any) {
      setDeleteError(err?.message || '삭제 요청에 실패했습니다.');
    } finally {
      setDeleteSaving(false);
    }
  };

  const getDeleteStatus = (cat: MyForumCategory) => cat.metadata?.deleteRequestStatus;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <MyPageNavigation />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          내 포럼
        </h1>
        <p className="text-slate-500 mt-1">내가 운영하는 포럼을 관리합니다</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Link to="/mypage/my-forums/request" className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <MessageSquarePlus className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <div className="font-semibold text-blue-800">포럼 개설 신청</div>
            <div className="text-sm text-blue-600">새로운 포럼을 요청합니다</div>
          </div>
        </Link>
        <Link to="/forum" className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-800">커뮤니티 포럼</div>
            <div className="text-sm text-slate-500">전체 포럼 탐색 및 참여</div>
          </div>
        </Link>
      </div>

      {/* 신청 내역 안내 → 통합 신청함 */}
      <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
        <div className="text-sm text-slate-600">포럼 신청 내역은 <strong>내 신청</strong> 탭에서 확인하세요</div>
        <Link to="/mypage/my-requests?entityType=forum_category" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
          내 신청 바로가기 →
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">내가 운영 중인 포럼</h2>
        {categoriesLoading && (
          <div className="flex items-center justify-center py-8 bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" /><span className="ml-2 text-sm text-slate-500">불러오는 중...</span>
          </div>
        )}
        {!categoriesLoading && myCategories.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 border-dashed p-6 text-center">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="mt-2 text-sm text-slate-500">아직 운영 중인 포럼이 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">포럼 개설 신청이 승인되면 여기에 표시됩니다</p>
          </div>
        )}
        {!categoriesLoading && myCategories.length > 0 && (
          <div className="space-y-3">
            {myCategories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                <Link to={`/forum?category=${cat.slug}`} className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    {cat.iconEmoji ? <span className="text-lg">{cat.iconEmoji}</span> : <MessageSquare className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 truncate">{cat.name}</h3>
                      {!cat.isActive && <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-500">비활성</span>}
                      {cat.forumType === 'closed' && <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700">비공개</span>}
                    </div>
                    {cat.description && <p className="text-xs text-slate-500 truncate">{cat.description}</p>}
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {getDeleteStatus(cat) === 'pending' && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-600">삭제 요청 중</span>}
                  {getDeleteStatus(cat) === 'rejected' && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500" title={cat.metadata?.deleteReviewComment || ''}>삭제 반려</span>}
                  <div className="text-right mr-1"><div className="text-sm font-medium text-slate-700">{cat.postCount}</div><div className="text-xs text-slate-400">게시글</div></div>
                  {cat.forumType === 'closed' && (
                    <Link to={`/mypage/my-forums/${cat.id}/members`} className="p-2 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="회원 관리"><Users className="w-4 h-4" /></Link>
                  )}
                  <button onClick={() => openEdit(cat)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="포럼 정보 수정"><Pencil className="w-4 h-4" /></button>
                  {getDeleteStatus(cat) !== 'pending' && (
                    <button onClick={() => { setDeletingCategory(cat); setDeleteReason(''); setDeleteError(null); }} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="삭제 요청"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => !deleteSaving && setDeletingCategory(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">포럼 삭제 요청</h3>
              <button onClick={() => !deleteSaving && setDeletingCategory(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
              <p className="font-medium">"{deletingCategory.name}" 포럼의 삭제를 요청합니다.</p>
              <p className="mt-1 text-amber-600">운영자가 검토한 후 승인/반려됩니다.</p>
            </div>
            {deleteError && <div className="p-3 bg-red-50 rounded-lg flex items-center gap-2 text-sm text-red-700"><AlertCircle className="w-4 h-4 shrink-0" />{deleteError}</div>}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">삭제 사유 <span className="text-slate-400 font-normal">(선택)</span></label>
              <textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="삭제를 요청하는 이유를 입력해주세요" rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeletingCategory(null)} disabled={deleteSaving} className="flex-1 px-4 py-2.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium disabled:opacity-50">취소</button>
              <button onClick={handleDeleteRequest} disabled={deleteSaving} className="flex-1 px-4 py-2.5 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {deleteSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}{deleteSaving ? '요청 중...' : '삭제 요청'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => !editSaving && setEditingCategory(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">포럼 정보 수정</h3>
              <button onClick={() => !editSaving && setEditingCategory(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            {editError && <div className="p-3 bg-red-50 rounded-lg flex items-center gap-2 text-sm text-red-700"><AlertCircle className="w-4 h-4 shrink-0" />{editError}</div>}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">포럼 이름 <span className="text-red-500">*</span></label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} maxLength={50}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
              <p className="text-xs text-slate-400 mt-1">{editForm.name.length}/50</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">포럼 설명</label>
              <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">아이콘 이모지 <span className="text-slate-400 font-normal">(선택)</span></label>
              <input type="text" value={editForm.iconEmoji} onChange={(e) => setEditForm({ ...editForm, iconEmoji: e.target.value })} placeholder="예: 💊" maxLength={4}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">아이콘 URL <span className="text-slate-400 font-normal">(선택)</span></label>
              <input type="url" value={editForm.iconUrl} onChange={(e) => setEditForm({ ...editForm, iconUrl: e.target.value })} placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingCategory(null)} disabled={editSaving} className="flex-1 px-4 py-2.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium disabled:opacity-50">취소</button>
              <button onClick={handleSaveEdit} disabled={editSaving} className="flex-1 px-4 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{editSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
