/**
 * EditImportRowDrawer — Import Row 수정 Drawer
 *
 * WO-NETURE-IMPORT-ROW-EDITOR-V1
 *
 * Supplier CSV Import의 inline edit를 대체하는 Drawer 컴포넌트.
 * rawJson 기반 필드를 그룹별로 표시하고, 변경분만 PATCH API로 전송.
 */

import { useState, useEffect } from 'react';
import { csvImportApi, type CsvBatchRow, type CsvRowEditFields, QUALITY_WARNING_LABELS, SUGGESTION_FIELD_LABELS, getRowSuggestions } from '../../lib/api/csvImport';

interface EditImportRowDrawerProps {
  row: CsvBatchRow;
  batchId: string;
  onSave: () => void;
  onClose: () => void;
}

const DISTRIBUTION_TYPES = ['PUBLIC', 'SERVICE', 'PRIVATE'] as const;

const FIELD_GROUPS = [
  {
    label: '기본 정보',
    fields: [
      { key: 'marketing_name', label: '마케팅명', type: 'text' as const },
      { key: 'brand', label: '브랜드', type: 'text' as const },
      { key: 'manufacturer_name', label: '제조사', type: 'text' as const },
      { key: 'category_name', label: '카테고리', type: 'text' as const },
    ],
  },
  {
    label: '가격 / 재고',
    fields: [
      { key: 'supply_price', label: '공급가', type: 'number' as const },
      { key: 'consumer_price', label: '소비자가', type: 'number' as const },
      { key: 'stock_qty', label: '재고 수량', type: 'number' as const },
    ],
  },
  {
    label: '콘텐츠',
    fields: [
      { key: 'short_description', label: '짧은 설명', type: 'textarea' as const },
      { key: 'detail_description', label: '상세 설명', type: 'textarea' as const },
      { key: 'image_url', label: '이미지 URL', type: 'text' as const },
    ],
  },
];

// WO-NETURE-IMPORT-DATA-QUALITY-GUARD-V1: warning → field key mapping
const QUALITY_FIELD_MAP: Record<string, string[]> = {
  MISSING_IMAGE: ['image_url'],
  MISSING_CATEGORY: ['category_name'],
  MISSING_DESCRIPTION: ['short_description', 'detail_description'],
  MISSING_CONSUMER_PRICE: ['consumer_price'],
};

function friendlyEditError(msg: string): string {
  if (!msg) return '수정 실패';
  if (msg.includes('BATCH_NOT_READY')) return '배치가 READY 상태가 아닙니다.';
  if (msg.includes('ROW_NOT_EDITABLE')) return '이 행은 수정할 수 없습니다 (VALID 상태만 수정 가능).';
  if (msg.includes('INVALID_SUPPLY_PRICE')) return '공급가는 0 이상의 숫자여야 합니다.';
  if (msg.includes('INVALID_DISTRIBUTION_TYPE')) return '유통 타입은 PUBLIC, SERVICE, PRIVATE 중 하나여야 합니다.';
  if (msg.includes('NO_FIELDS')) return '수정할 필드가 없습니다.';
  return msg;
}

export default function EditImportRowDrawer({ row, batchId, onSave, onClose }: EditImportRowDrawerProps) {
  const raw = row.rawJson as Record<string, string>;
  const suggestions = getRowSuggestions(row); // WO-NETURE-IMPORT-AUTO-SUGGESTION-V1

  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const group of FIELD_GROUPS) {
      for (const f of group.fields) {
        initial[f.key] = String(raw[f.key] ?? '');
      }
    }
    initial.distribution_type = String(raw.distribution_type ?? 'PUBLIC').toUpperCase();
    setFields(initial);
    setError(null);
  }, [row.id]);

  const handleChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const changed: CsvRowEditFields = {};
      let hasChange = false;

      for (const group of FIELD_GROUPS) {
        for (const f of group.fields) {
          if (fields[f.key] !== String(raw[f.key] ?? '')) {
            (changed as any)[f.key] = fields[f.key];
            hasChange = true;
          }
        }
      }
      const currentDist = String(raw.distribution_type ?? 'PUBLIC').toUpperCase();
      if (fields.distribution_type !== currentDist) {
        changed.distribution_type = fields.distribution_type;
        hasChange = true;
      }

      if (!hasChange) {
        onClose();
        return;
      }

      const result = await csvImportApi.updateRow(batchId, row.id, changed);
      if (!result.success) {
        setError(friendlyEditError(result.error || '수정 실패'));
        return;
      }
      onSave();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Import Row 수정 — #{row.rowNumber}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identity Section */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500">바코드:</span>
              <span className="font-mono font-medium text-gray-900">
                {row.parsedBarcode || '(없음)'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500">검증:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                row.validationStatus === 'VALID' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {row.validationStatus}
              </span>
              {row.actionType && (
                <>
                  <span className="text-gray-400">|</span>
                  <span className="text-xs text-gray-500">{row.actionType}</span>
                </>
              )}
            </div>
          </div>

          {/* WO-NETURE-IMPORT-DATA-QUALITY-GUARD-V1: Quality warnings */}
          {(() => {
            const warnings = (row.rawJson._qualityWarnings as string[]) || [];
            const score = row.rawJson._qualityScore as number | undefined;
            if (warnings.length === 0) return null;
            return (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-amber-700 text-sm font-medium">
                    품질 점수: {score ?? '-'}점
                  </span>
                </div>
                <ul className="text-xs text-amber-600 space-y-0.5">
                  {warnings.map((w: string) => (
                    <li key={w}>&bull; {QUALITY_WARNING_LABELS[w] || w}</li>
                  ))}
                </ul>
                <p className="text-xs text-amber-500">
                  아래에서 누락된 정보를 입력하면 품질 점수가 개선됩니다.
                </p>
              </div>
            );
          })()}

          {/* WO-NETURE-IMPORT-AUTO-SUGGESTION-V1: Suggestion banner */}
          {Object.keys(suggestions).length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-blue-700 text-sm font-medium">
                  자동 추천 ({Object.keys(suggestions).length}개 필드)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...fields };
                    for (const [key, val] of Object.entries(suggestions)) {
                      if (!updated[key]) updated[key] = val;
                    }
                    setFields(updated);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200"
                >
                  모두 적용
                </button>
              </div>
              <ul className="text-xs text-blue-600 space-y-0.5">
                {Object.entries(suggestions).map(([key, val]) => (
                  <li key={key}>
                    &bull; {SUGGESTION_FIELD_LABELS[key] || key}: {String(val).length > 30 ? String(val).slice(0, 30) + '...' : val}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Field Groups */}
          {FIELD_GROUPS.map((group) => (
            <div key={group.label}>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-1">
                {group.label}
              </h4>
              <div className="space-y-3">
                {group.fields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {f.label}
                      {f.key === 'supply_price' && <span className="text-red-500 ml-0.5">*</span>}
                      {/* WO-NETURE-IMPORT-DATA-QUALITY-GUARD-V1 */}
                      {!fields[f.key] &&
                        ((row.rawJson._qualityWarnings as string[]) || []).some(
                          (w: string) => (QUALITY_FIELD_MAP[w] || []).includes(f.key),
                        ) && <span className="text-amber-500 ml-1 text-[10px]">(권장)</span>}
                    </label>
                    {/* WO-NETURE-IMPORT-AUTO-SUGGESTION-V1: per-field suggestion chip */}
                    {suggestions[f.key] && !fields[f.key] && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] text-blue-500 truncate max-w-[200px]">
                          추천: {suggestions[f.key]}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleChange(f.key, suggestions[f.key])}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 whitespace-nowrap"
                        >
                          적용
                        </button>
                      </div>
                    )}
                    {f.type === 'textarea' ? (
                      <textarea
                        value={fields[f.key] || ''}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                        rows={f.key === 'detail_description' ? 4 : 3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <input
                        type={f.type === 'number' ? 'number' : 'text'}
                        value={fields[f.key] || ''}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Distribution Type — Radio */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-1">
              유통
            </h4>
            <div className="flex gap-4">
              {DISTRIBUTION_TYPES.map((dt) => (
                <label key={dt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="distribution_type"
                    value={dt}
                    checked={fields.distribution_type === dt}
                    onChange={() => handleChange('distribution_type', dt)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className={fields.distribution_type === dt ? 'font-medium text-gray-900' : 'text-gray-600'}>
                    {dt}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
