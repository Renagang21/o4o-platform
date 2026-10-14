import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Lock,
  Pencil,
  Save,
} from "lucide-react";
import { updateStoreSlug, type ChannelType } from "../../../api/storeHub";
import { getActiveServicePublicOrigin } from "../../../lib/serviceContext";

export function ChannelPublicUrlCard({
  channelType,
  orgCode,
  showToast,
  // WO-O4O-STORE-SLUG-EDITABLE-V1
  canChangeSlug,
  onSlugChanged,
}: {
  channelType: ChannelType;
  orgCode: string | null;
  showToast: (type: "success" | "error", message: string) => void;
  canChangeSlug: boolean;
  onSlugChanged: (newSlug: string) => void;
}) {
  const origin = getActiveServicePublicOrigin();
  // WO-O4O-STORE-SLUG-EDITABLE-V1: edit mode state
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    if (!orgCode || !canChangeSlug) return;
    setDraft(orgCode);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft("");
  };

  const submitEdit = async () => {
    const next = draft.trim();
    if (!next) {
      showToast("error", "주소를 입력해주세요.");
      return;
    }
    if (orgCode && next === orgCode) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      const result = await updateStoreSlug(next);
      onSlugChanged(result.slug);
      showToast(
        "success",
        "주소가 변경되었습니다. 기존 주소는 자동으로 새 주소로 이동합니다.",
      );
      setEditing(false);
      setDraft("");
    } catch (err: any) {
      const code = err?.code as string | undefined;
      const messages: Record<string, string> = {
        SLUG_RESERVED: "사용할 수 없는 주소입니다.",
        SLUG_DUPLICATE: "이미 사용 중인 주소입니다.",
        SLUG_INVALID:
          "잘못된 주소 형식입니다. (3~120자, 소문자·숫자·한글·하이픈만 허용)",
        SLUG_ALREADY_CHANGED:
          "이 매장은 이미 주소가 변경되었습니다. 추가 변경은 운영팀에 문의하세요.",
      };
      const msg =
        messages[code ?? ""] ?? (err?.message || "주소 변경에 실패했습니다.");
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  // Determine URL and guidance per channel type
  const getChannelUrl = (): {
    url: string | null;
    label: string;
    guidance: string | null;
    guidanceLink: string | null;
  } => {
    if (channelType === "B2C") {
      // WO-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1:
      //   자체몰 홈(/store/:slug) route 는 은퇴했다. 다만 slug 자체는 QR(/qr/:slug) ·
      //   태블릿(/tablet/:slug) · 매장 블로그(/store/:slug/blog) 공용 식별자이므로
      //   주소 표시·변경 UI 는 유지하고, 열기/복사 대상만 살아 있는 매장 블로그로 옮긴다.
      if (!orgCode)
        return {
          url: null,
          label: "매장 공개",
          guidance: null,
          guidanceLink: null,
        };
      return {
        url: `${origin}/store/${encodeURIComponent(orgCode)}/blog`,
        label: "매장 공개",
        guidance: null,
        guidanceLink: null,
      };
    }
    if (channelType === "TABLET") {
      if (!orgCode)
        return {
          url: null,
          label: "태블릿",
          guidance: null,
          guidanceLink: null,
        };
      return {
        url: `${origin}/tablet/${encodeURIComponent(orgCode)}`,
        label: "태블릿 상품 안내",
        guidance: null,
        guidanceLink: null,
      };
    }
    // KIOSK (보류) — WO-O4O-STORE-CHANNEL-MANAGEMENT-CLEANUP-V1
    return {
      url: null,
      label: "키오스크",
      guidance:
        "키오스크는 업체 협의 후 제공 예정입니다. 현재는 채널 등록·상태 확인만 가능합니다.",
      guidanceLink: null,
    };
  };

  const { url, label, guidance, guidanceLink } = getChannelUrl();

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      showToast("success", "공개 주소가 클립보드에 복사되었습니다.");
    } catch {
      showToast("error", "복사에 실패했습니다. 주소를 직접 복사해 주세요.");
    }
  };

  // No slug case for B2C/TABLET
  if ((channelType === "B2C" || channelType === "TABLET") && !orgCode) {
    return (
      <div className="flex flex-wrap items-center gap-3 p-4 mb-6 rounded-lg border border-amber-200 bg-amber-50">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <p className="text-sm font-medium text-amber-800">
            공개 주소가 아직 설정되지 않았습니다
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            약국 정보에서 약국 코드를 등록하면 공개 URL이 생성됩니다.
          </p>
        </div>
        <Link
          to="/store/info"
          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-100"
        >
          설정으로 이동
        </Link>
      </div>
    );
  }

  // KIOSK guidance (보류 안내)
  if (guidance) {
    return (
      <div className="flex flex-wrap items-center gap-3 p-4 mb-6 rounded-lg border border-slate-200 bg-slate-50">
        <Link2 className="w-5 h-5 text-slate-400 flex-shrink-0" />
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <p className="text-sm text-slate-600">{guidance}</p>
        </div>
        {guidanceLink && (
          <Link
            to={guidanceLink}
            className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50"
          >
            이동 <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    );
  }

  // B2C / TABLET with valid URL — WO-O4O-STORE-SLUG-EDITABLE-V1: editable mode
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 mb-6 rounded-lg border border-slate-200 bg-white">
      <Link2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
      <div className="min-w-0 flex-1 basis-full sm:basis-auto">
        <div className="text-xs text-slate-500 mb-1 flex flex-wrap items-center gap-2">
          <span>{label} 공개 주소</span>
          {!canChangeSlug && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500"
              title="이 매장은 이미 주소가 변경된 적이 있어 추가 변경이 제한됩니다."
            >
              <Lock className="w-2.5 h-2.5" /> 변경 제한
            </span>
          )}
        </div>
        {editing ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[14px] font-mono text-slate-500 truncate">
              {origin}/store/
            </span>
            <input
              type="text"
              aria-label="매장 공개 주소"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={saving}
              autoFocus
              spellCheck={false}
              className="flex-1 min-w-0 px-2 py-1 text-[14px] font-mono font-medium text-slate-900 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="새 주소 (영문 소문자/숫자/한글/하이픈)"
            />
          </div>
        ) : (
          <div className="text-[15px] font-mono font-medium text-slate-900 truncate">
            {url}
          </div>
        )}
        <div className="text-xs text-slate-400 mt-1">
          {editing
            ? "저장 후 기존 주소는 자동으로 새 주소로 이동합니다 (1회 변경 가능)"
            : "이 주소(약국 코드)는 QR·태블릿·매장 블로그가 함께 사용합니다"}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
        {editing ? (
          <>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={submitEdit}
              disabled={saving || draft.trim().length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              저장
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={startEdit}
              disabled={!canChangeSlug}
              title={
                canChangeSlug
                  ? "주소(slug) 변경 — 기존 주소는 자동으로 새 주소로 redirect 됩니다."
                  : "이 매장은 이미 주소가 변경되어 추가 변경이 제한됩니다."
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${
                canChangeSlug
                  ? "text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
                  : "text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed"
              }`}
            >
              <Pencil className="w-3.5 h-3.5" /> 주소 변경
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200"
              title="주소 복사"
            >
              <Copy className="w-3.5 h-3.5" /> 복사
            </button>
            <a
              href={url!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
              title="새 탭에서 열기"
            >
              <ExternalLink className="w-3.5 h-3.5" /> 열기
            </a>
          </>
        )}
      </div>
    </div>
  );
}
