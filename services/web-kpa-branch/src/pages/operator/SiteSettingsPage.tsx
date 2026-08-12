/**
 * SiteSettingsPage — 분회 홈페이지 설정 (운영자)
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §5
 *
 * 고정 템플릿이므로 편집 대상은 로고 / 이름 / 소개 / 연락처 / 공개 여부뿐이다.
 * 레이아웃·블록 편집(페이지 빌더)은 1차 범위 밖이다.
 *
 * 403(BRANCH_SCOPE_MISMATCH)은 다른 분회 화면에 들어왔다는 뜻이므로 그대로 노출한다.
 */
import { useEffect, useState } from 'react';
import { getOperatorSite, saveOperatorSite, type BranchSite } from '../../lib/api/branch';
import { describeApiError as describe } from '../../lib/errors';

export default function SiteSettingsPage({ slug }: { slug: string }) {
  const [site, setSite] = useState<BranchSite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getOperatorSite(slug)
      .then((s) => alive && setSite(s))
      .catch((e: unknown) => alive && setError(describe(e)));
    return () => {
      alive = false;
    };
  }, [slug]);

  async function save(patch: Partial<BranchSite>) {
    if (!site) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const next = await saveOperatorSite(slug, {
        title: site.title,
        tagline: site.tagline ?? undefined,
        logoUrl: site.logoUrl ?? undefined,
        intro: site.intro ?? undefined,
        contact: site.contact ?? {},
        ...patch,
      } as never);
      setSite(next);
      setMessage('저장했습니다.');
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  if (error && !site) return <p className="text-sm text-red-600">{error}</p>;
  if (!site) return <p className="text-sm text-gray-500">불러오는 중입니다…</p>;

  const contact = site.contact ?? {};

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">홈페이지 설정</h1>
      <p className="mt-1 text-sm text-gray-500">{site.branchName}</p>

      <div className="mt-6 space-y-4 text-sm">
        <Field label="홈페이지 제목" value={site.title} onChange={(v) => setSite({ ...site, title: v })} />
        <Field label="한 줄 소개" value={site.tagline ?? ''} onChange={(v) => setSite({ ...site, tagline: v })} />
        <Field label="로고 이미지 URL" value={site.logoUrl ?? ''} onChange={(v) => setSite({ ...site, logoUrl: v })} />

        <label className="block">
          <span className="mb-1 block text-gray-700">분회 소개</span>
          <textarea
            value={site.intro ?? ''}
            onChange={(e) => setSite({ ...site, intro: e.target.value })}
            rows={8}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>

        <fieldset className="rounded border border-gray-200 p-3">
          <legend className="px-1 text-gray-700">연락처</legend>
          <div className="space-y-3">
            <Field label="주소" value={contact.address ?? ''} onChange={(v) => setSite({ ...site, contact: { ...contact, address: v } })} />
            <Field label="전화" value={contact.phone ?? ''} onChange={(v) => setSite({ ...site, contact: { ...contact, phone: v } })} />
            <Field label="이메일" value={contact.email ?? ''} onChange={(v) => setSite({ ...site, contact: { ...contact, email: v } })} />
            <Field label="운영시간" value={contact.hours ?? ''} onChange={(v) => setSite({ ...site, contact: { ...contact, hours: v } })} />
          </div>
        </fieldset>

        <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save({})}
            className="rounded bg-primary-600 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            저장
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save({ isPublished: !site.isPublished })}
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 disabled:opacity-60"
          >
            {site.isPublished ? '비공개로 전환' : '홈페이지 공개'}
          </button>
          <span className={site.isPublished ? 'text-xs text-green-700' : 'text-xs text-gray-500'}>
            현재 {site.isPublished ? '공개' : '비공개'}
          </span>
        </div>

        {message && <p className="text-green-700">{message}</p>}
        {error && <p className="text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-gray-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 px-3 py-2"
      />
    </label>
  );
}
