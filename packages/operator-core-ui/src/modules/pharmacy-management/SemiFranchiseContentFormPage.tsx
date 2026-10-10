/**
 * SemiFranchiseContentFormPage — 약국 협력사업 콘텐츠 작성 · 수정
 *   /operator/semi-franchises/:key/contents/new
 *   /operator/semi-franchises/:key/contents/:id/edit
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1
 *   담당 운영자만 작성한다(담당 관계는 API 가 판정 — 아니면 403).
 *   저장은 초안(draft)으로만 한다. 게시 · 보관은 목록(콘텐츠 탭)에서 처리한다.
 *   보관된 콘텐츠는 수정할 수 없다(API 가 404 로 거부).
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RichTextEditor } from '@o4o/content-editor';
import { neturePharmacyOperatorApi as api, type SemiFranchiseContent } from './api';
import { INPUT, Message, PageHeader, StatusBadge } from './PharmacyCommerceUi';

type Msg = { type: 'success' | 'error'; text: string } | null;

interface FormState {
  title: string;
  summary: string;
  body: string;
  thumbnailUrl: string;
  tags: string;
}

const EMPTY: FormState = { title: '', summary: '', body: '', thumbnailUrl: '', tags: '' };

export default function SemiFranchiseContentFormPage({ businessKey }: { businessKey?: string } = {}) {
  const { key = '', id } = useParams<{ key: string; id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const listPath = `/operator/semi-franchises?key=${encodeURIComponent(key)}&tab=contents`;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [current, setCurrent] = useState<SemiFranchiseContent | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Msg>(null);

  useEffect(() => {
    if (!id || (businessKey && businessKey !== key)) return;
    setLoading(true);
    api
      .getContent(key, id)
      .then((c) => {
        setCurrent(c);
        setForm({
          title: c.title ?? '',
          summary: c.summary ?? '',
          body: c.body ?? '',
          thumbnailUrl: c.thumbnailUrl ?? '',
          tags: (c.tags ?? []).join(', '),
        });
      })
      .catch((err: Error) => setMessage({ type: 'error', text: err.message }))
      .finally(() => setLoading(false));
  }, [key, id]);

  const archived = current?.status === 'archived';
  const set = (field: keyof FormState, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setMessage({ type: 'error', text: '제목을 입력해 주세요.' });
      return;
    }
    const input = {
      title,
      summary: form.summary.trim(),
      body: form.body,
      thumbnailUrl: form.thumbnailUrl.trim(),
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    setSaving(true);
    setMessage(null);
    try {
      if (id) await api.updateContent(key, id, input);
      else await api.createContent(key, input);
      navigate(listPath);
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">불러오는 중...</div>;
  }

  if (businessKey && businessKey !== key) return <p>이 사업의 콘텐츠가 아닙니다.</p>;
  return (
    <div className="max-w-4xl space-y-4 p-6">
      <PageHeader
        title={isEdit ? '약국 협력사업 콘텐츠 수정' : '약국 협력사업 콘텐츠 작성'}
        description={current ? `${current.semiFranchiseName} (${current.semiFranchiseKey})` : `약국 협력사업: ${key}`}
      >
        <Link to={listPath} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          목록으로
        </Link>
      </PageHeader>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <ul className="list-disc space-y-1 pl-5">
          <li>새 콘텐츠는 초안으로 저장됩니다. 게시는 목록(콘텐츠 탭)에서 따로 처리합니다.</li>
          <li>게시 중인 콘텐츠를 수정하면 약국 화면의 원본에는 바로 반영됩니다.</li>
          <li>게시된 콘텐츠는 이 약국 협력사업에 활성 가입한 약국에만 보입니다.</li>
          <li>약국은 게시된 콘텐츠를 자기 매장 사본으로 복사해 씁니다. 이미 만든 매장 사본은 약국 소유의 독립 사본이라 이후 수정이 반영되지 않습니다.</li>
        </ul>
      </div>

      <Message message={message} />

      {current && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          현재 상태 <StatusBadge status={current.status} />
        </div>
      )}

      {archived ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          보관된 콘텐츠는 수정할 수 없습니다. 목록에서 다시 게시한 뒤 수정하세요.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              제목 <span className="text-red-600">*</span>
            </label>
            <input className={INPUT} value={form.title} maxLength={300} onChange={(e) => set('title', e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">요약</label>
            <textarea className={INPUT} rows={2} value={form.summary} onChange={(e) => set('summary', e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">본문</label>
            <div className="overflow-hidden rounded-md border border-gray-300">
              <RichTextEditor
                value={form.body}
                onChange={(c) => set('body', c.html)}
                editable={!saving}
                placeholder="약국에 전달할 내용을 입력하세요..."
                preset="compact"
                minHeight="300px"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">대표 이미지 URL</label>
            <input
              className={INPUT}
              value={form.thumbnailUrl}
              placeholder="https://..."
              onChange={(e) => set('thumbnailUrl', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">태그</label>
            <input
              className={INPUT}
              value={form.tags}
              placeholder="쉼표로 구분 (최대 20개)"
              onChange={(e) => set('tags', e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Link to={listPath} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              취소
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : isEdit ? '수정 저장' : '초안 저장'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
