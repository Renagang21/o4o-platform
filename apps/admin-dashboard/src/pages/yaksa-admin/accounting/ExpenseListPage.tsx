/**
 * ExpenseListPage
 *
 * 지출 입력/목록 화면
 *
 * === UX 원칙 ===
 * - "회계 프로그램"처럼 보이지 말 것
 * - "사무국 장부"처럼 보일 것
 * - 숫자보다 설명(메모)이 먼저 보이게
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Lock,
  Receipt,
  X,
} from 'lucide-react';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getCloseStatus,
  type ExpenseRecord,
  type CreateExpenseDto,
  type UpdateExpenseDto,
  type ExpenseCategory,
  type PaymentMethod,
  CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/lib/api/yaksaAccounting';

const CATEGORIES: ExpenseCategory[] = [
  'ENTERTAINMENT',
  'GENERAL_ADMIN',
  'SUPPLIES',
  'OFFICER_EXPENSE',
  'MISC',
];

const PAYMENT_METHODS: PaymentMethod[] = ['CARD', 'TRANSFER', 'CASH'];

export function ExpenseListPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 필터
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [isClosed, setIsClosed] = useState(false);

  // 모달
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState<CreateExpenseDto>({
    expenseDate: '',
    amount: 0,
    category: 'MISC',
    description: '',
    paymentMethod: 'CARD',
    relatedPerson: '',
  });

  const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [expenseData, closeData] = await Promise.all([
        getExpenses({ yearMonth, limit: 100 }),
        getCloseStatus(yearMonth),
      ]);
      setExpenses(expenseData.items);
      setTotal(expenseData.total);
      setIsClosed(closeData.isClosed);
    } catch (err) {
      setError('데이터를 불러올 수 없습니다.');
      console.error('Failed to load expenses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [yearMonth]);

  const openCreateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      expenseDate: today,
      amount: 0,
      category: 'MISC',
      description: '',
      paymentMethod: 'CARD',
      relatedPerson: '',
    });
    setEditingExpense(null);
    setShowModal(true);
  };

  const openEditModal = (expense: ExpenseRecord) => {
    setFormData({
      expenseDate: expense.expenseDate,
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      paymentMethod: expense.paymentMethod,
      relatedPerson: expense.relatedPerson || '',
    });
    setEditingExpense(expense);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      alert('금액은 0보다 커야 합니다.');
      return;
    }
    if (!formData.description.trim()) {
      alert('설명을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, formData as UpdateExpenseDto);
      } else {
        await createExpense(formData);
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장 실패';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteExpense(id);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : '삭제 실패';
      alert(message);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/yaksa/accounting"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          회계 홈으로 돌아가기
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">지출 기록</h1>
            <p className="text-gray-500 mt-1">
              사무실 운영비 지출을 기록합니다.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {isClosed && (
              <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                <Lock className="h-3 w-3 mr-1" />
                마감됨
              </span>
            )}
            <button
              onClick={loadData}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {months.map((m) => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
        </div>
        {!isClosed && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            지출 추가
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">{yearMonth} 총 지출</span>
          <span className="text-xl font-bold text-gray-900">
            ₩{totalAmount.toLocaleString()}
          </span>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {total}건
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">데이터를 불러오는 중...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{yearMonth}의 지출 기록이 없습니다.</p>
          {!isClosed && (
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              첫 지출 추가하기
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  날짜
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  내용
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  카테고리
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  결제
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  금액
                </th>
                {!isClosed && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    작업
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {expense.expenseDate}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {expense.description}
                    </div>
                    {expense.relatedPerson && (
                      <div className="text-xs text-gray-500">
                        {expense.relatedPerson}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                      {expense.categoryLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {expense.paymentMethodLabel}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    ₩{expense.amount.toLocaleString()}
                  </td>
                  {!isClosed && (
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(expense)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingExpense ? '지출 수정' : '지출 추가'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  날짜 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  내용 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="예: 임원 회의 식대"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  금액 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  placeholder="0"
                  min="1"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    카테고리 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    결제 방법 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {PAYMENT_METHOD_LABELS[pm]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  관련인 (선택)
                </label>
                <input
                  type="text"
                  value={formData.relatedPerson || ''}
                  onChange={(e) => setFormData({ ...formData, relatedPerson: e.target.value })}
                  placeholder="예: 홍길동 외 3인"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseListPage;
