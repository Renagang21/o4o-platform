import type { QrCreationDraft } from "./useQrCreation";
import { useId } from "react";
import { LayoutTemplate, ArrowRight } from "lucide-react";
import { GuideBlock } from "@o4o/shared-space-ui";
import { colors } from "../../../styles/theme";
import type { AssetSelectorResult as LibrarySelectorResult } from "../../../components/store/StoreAssetSelectorModal";
import type { ProductionTemplate } from "../productionTemplates";
import { styles } from "./qrStyles";

const LANDING_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "product", label: "제품" },
  { value: "page", label: "콘텐츠" },
  { value: "link", label: "외부 링크" },
];

const ASSET_TYPE_LABELS: Record<string, string> = {
  file: "파일",
  content: "콘텐츠",
  "external-link": "외부 링크",
  // WO-O4O-KPA-STORE-QR-TARGET-SCOPE-AUDIT-V1 (B안): 블로그 대상 배지
  blog: "블로그",
  // WO-O4O-KPA-QR-MULTILINGUAL-PRODUCT-LINK-SOURCE-V1: 다국어 제품 콘텐츠 배지
  mlc: "다국어 제품",
};

interface StoreQrCreateFormsProps {
  creating: boolean;
  videoTarget: { id: string; title: string } | null;
  selectedLibrary: LibrarySelectorResult | null;
  selectedTemplate: ProductionTemplate | null;
  formError: string | null;
  saving: boolean;
  qrBaseUrl: string;
  loadingProducts: boolean;
  productOptions: { id: string; name: string }[];
  draft: QrCreationDraft;
  onChange: <K extends keyof QrCreationDraft>(
    field: K,
    value: QrCreationDraft[K],
  ) => void;
  onCancel: () => void;
  onChangeSource: () => void;
  onSave: () => void;
}

export function StoreQrCreateForms({
  creating,
  videoTarget,
  selectedLibrary,
  selectedTemplate,
  formError,
  saving,
  qrBaseUrl,
  loadingProducts,
  productOptions,
  draft,
  onChange,
  onCancel,
  onChangeSource,
  onSave,
}: Readonly<StoreQrCreateFormsProps>) {
  const {
    title: formTitle,
    description: formDescription,
    slug: formSlug,
    landingType: formLandingType,
    landingTargetId: formLandingTargetId,
    ctaEnabled,
    ctaLabel,
  } = draft;
  const fieldId = useId();
  const targetLabels: Record<string, string> = {
    product: "연결 상품 (선택)",
    link: "연결 URL",
  };
  const landingTargetLabel =
    targetLabels[formLandingType] ?? "연결 대상 (선택)";
  return (
    <>
      {/* WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: 동영상 전용 QR 생성 폼 (library 자료 흐름과 분리) */}
      {creating && videoTarget && (
        <div style={styles.createForm}>
          <div style={{ marginBottom: "16px" }}>
            <h3 style={styles.formTitle}>동영상 QR 만들기</h3>
            <p
              style={{
                fontSize: "12px",
                color: colors.neutral400,
                margin: "6px 0 0",
              }}
            >
              QR 스캔 시 동영상 전용 화면이 열립니다 (일반 메뉴 없이 동영상만
              표시).
            </p>
          </div>

          {/* 연결 대상 동영상 (읽기 전용) */}
          <div style={styles.selectedLibraryCard}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "4px",
                }}
              >
                <span style={styles.assetTypeBadge}>동영상</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: 600,
                  color: colors.neutral800,
                }}
              >
                {videoTarget.title}
              </p>
            </div>
          </div>

          <div style={styles.formRow}>
            <label htmlFor={`${fieldId}-title`} style={styles.formLabel}>
              QR 제목
            </label>
            <input
              id={`${fieldId}-title`}
              type="text"
              value={formTitle}
              onChange={(e) => onChange("title", e.target.value)}
              style={styles.input}
              placeholder="QR 스캔 후 표시될 제목"
              maxLength={60}
            />
          </div>

          <div style={styles.formRow}>
            <label htmlFor={`${fieldId}-description`} style={styles.formLabel}>
              짧은 안내문 (선택)
            </label>
            <input
              id={`${fieldId}-description`}
              type="text"
              value={formDescription}
              onChange={(e) => onChange("description", e.target.value)}
              style={styles.input}
              placeholder="QR 스캔 후 표시될 짧은 설명 (선택)"
              maxLength={150}
            />
          </div>

          <details style={styles.formRow}>
            <summary style={{ minHeight: 44, cursor: "pointer", fontWeight: 600 }}>QR 주소 변경 · 선택</summary>
            <label htmlFor={`${fieldId}-slug`} style={styles.formLabel}>
              QR 주소 (URL 경로)
            </label>
            <div style={styles.slugPreview}>
              <span style={styles.slugBase}>{qrBaseUrl}</span>
              <input
                id={`${fieldId}-slug`}
                type="text"
                value={formSlug}
                onChange={(e) =>
                  onChange("slug", e.target.value.replace(/[^a-z0-9-]/g, ""))
                }
                style={styles.slugInput}
                placeholder="my-video-qr"
              />
            </div>
          </details>

          {formError && <p style={styles.formError}>{formError}</p>}

          <div style={styles.formActions}>
            <button onClick={onCancel} style={styles.cancelBtn}>
              취소
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "저장 중..." : "QR 저장"}
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {creating && selectedLibrary && (
        <div style={styles.createForm}>
          <div style={{ marginBottom: "16px" }}>
            <h3 style={styles.formTitle}>새 QR 만들기</h3>
            {/* WO-O4O-QR-TEMPLATE-WORKFLOW-V1: template badge */}
            {selectedTemplate && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "6px",
                  flexWrap: "wrap",
                }}
              >
                <span style={styles.templateBadge}>
                  <LayoutTemplate size={11} />
                  {selectedTemplate.name}
                  {selectedTemplate.style ? ` · ${selectedTemplate.style}` : ""}
                </span>
                <span style={{ fontSize: "12px", color: colors.neutral400 }}>
                  {selectedTemplate.description}
                </span>
              </div>
            )}
          </div>

          {/* 선택된 자료 정보 */}
          <div style={styles.selectedLibraryCard}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "4px",
                }}
              >
                <span style={styles.assetTypeBadge}>
                  {ASSET_TYPE_LABELS[selectedLibrary.assetType] ||
                    selectedLibrary.assetType}
                </span>
                {selectedLibrary.category && (
                  <span style={styles.categoryBadge}>
                    {selectedLibrary.category}
                  </span>
                )}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: 600,
                  color: colors.neutral800,
                }}
              >
                {selectedLibrary.title}
              </p>
            </div>
            <button onClick={onChangeSource} style={styles.changeLibraryBtn}>
              자료 변경
              <ArrowRight size={14} />
            </button>
          </div>

          {/* WO-O4O-KPA-QR-AI-STEP-REMOVE-V1: QR 문구 AI 생성(초안 생성) 진입점 제거.
              QR 제목/안내문은 직접 입력하거나, 선택한 콘텐츠 본문을 기반으로 생성한다.
              (편집기 Toolbar의 AI 정리·AiContentModal 컴포넌트·/api/ai/content 는 유지.) */}

          {/* WO-O4O-QR-TEMPLATE-WORKFLOW-V1: QR 제목 */}
          <div style={styles.formRow}>
            <label htmlFor={`${fieldId}-title`} style={styles.formLabel}>
              QR 제목
            </label>
            <input
              id={`${fieldId}-title`}
              type="text"
              value={formTitle}
              onChange={(e) => onChange("title", e.target.value)}
              style={styles.input}
              placeholder="QR 스캔 후 표시될 제목"
              maxLength={60}
            />
          </div>

          {/* WO-O4O-QR-TEMPLATE-WORKFLOW-V1: 짧은 안내문 */}
          <div style={styles.formRow}>
            <label htmlFor={`${fieldId}-description`} style={styles.formLabel}>
              짧은 안내문 (선택)
            </label>
            <input
              id={`${fieldId}-description`}
              type="text"
              value={formDescription}
              onChange={(e) => onChange("description", e.target.value)}
              style={styles.input}
              placeholder="QR 스캔 후 표시될 짧은 설명 (50자 이내 권장)"
              maxLength={150}
            />
            {formDescription && (
              <p
                style={{
                  fontSize: "11px",
                  color: colors.neutral400,
                  margin: "4px 0 0",
                }}
              >
                {formDescription.length}/150자
              </p>
            )}
          </div>

          <details style={styles.formRow}>
            <summary style={{ minHeight: 44, cursor: "pointer", fontWeight: 600 }}>QR 주소 변경 · 선택</summary>
            <label htmlFor={`${fieldId}-slug`} style={styles.formLabel}>
              QR 주소 (URL 경로)
            </label>
            <div style={styles.slugPreview}>
              <span style={styles.slugBase}>{qrBaseUrl}</span>
              <input
                id={`${fieldId}-slug`}
                type="text"
                value={formSlug}
                onChange={(e) =>
                  onChange("slug", e.target.value.replace(/[^a-z0-9-]/g, ""))
                }
                style={styles.slugInput}
                placeholder="my-qr-code"
              />
            </div>
          </details>

          {/* WO-O4O-CONTENT-SAVE-MEANS-READY-GLOBAL-STANDARD-V1 §7.4:
              운영자 콘텐츠(참조형)는 연결 유형/대상이 'page'+content.id 로 고정 — 잠금 안내로 대체. */}
          {selectedLibrary.source === "content-hub" ? (
            <div style={{ marginBottom: "12px" }}>
              <GuideBlock
                variant="info"
                title="운영자 콘텐츠 연결 QR"
                description="QR을 스캔하면 선택한 콘텐츠가 표시됩니다. 선택 시 매장 사본이 생성되어 QR은 매장 사본을 가리킵니다(원본 수정은 자동 반영되지 않으며, 매장에서 사본을 직접 편집할 수 있습니다)."
                compact
              />
              {/* WO-O4O-KPA-QR-PAGE-CONSULTATION-CTA-V1: 콘텐츠 하단 상담 요청 버튼 옵션 (page 타입 전용) */}
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px",
                  border: `1px solid ${colors.neutral200}`,
                  borderRadius: "8px",
                }}
              >
                <label
                  htmlFor={`${fieldId}-cta`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    id={`${fieldId}-cta`}
                    type="checkbox"
                    aria-label="콘텐츠 하단에 상담 요청 버튼 표시"
                    checked={ctaEnabled}
                    onChange={(e) => onChange("ctaEnabled", e.target.checked)}
                    style={{ marginTop: "3px" }}
                  />{" "}
                  콘텐츠 하단에 상담 요청 버튼 표시
                </label>
                <p
                  style={{
                    fontSize: "12px",
                    color: colors.neutral500,
                    marginTop: "2px",
                    lineHeight: 1.5,
                  }}
                >
                  QR을 본 고객이 콘텐츠 하단에서 바로 상담을 요청할 수 있습니다.
                  요청은 매장 알림으로 전달됩니다.
                </p>
                {ctaEnabled && (
                  <input
                    type="text"
                    aria-label="상담 요청 버튼 문구"
                    value={ctaLabel}
                    onChange={(e) => onChange("ctaLabel", e.target.value)}
                    style={{ ...styles.input, marginTop: "10px" }}
                    placeholder="버튼 문구 (기본: 상담 요청하기)"
                    maxLength={100}
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              <div style={styles.formRow}>
                <label
                  htmlFor={`${fieldId}-landing-type`}
                  style={styles.formLabel}
                >
                  연결 유형
                </label>
                <select
                  id={`${fieldId}-landing-type`}
                  value={formLandingType}
                  onChange={(e) => onChange("landingType", e.target.value)}
                  style={styles.select}
                >
                  {LANDING_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* WO-O4O-STORE-WORKSPACE-QR-PREFILL-V2: link 타입 추가 경고 */}
              {formLandingType === "link" && (
                <div style={{ marginBottom: "12px" }}>
                  <GuideBlock
                    variant="warning"
                    title="URL 연결형 QR"
                    description="URL 연결형 QR입니다. QR 자체에 콘텐츠가 저장되지 않으며, 입력한 URL로 바로 이동합니다. 대상 URL이 사라지면 QR도 작동하지 않습니다."
                    compact
                  />
                </div>
              )}

              <div style={styles.formRow}>
                <label
                  htmlFor={`${fieldId}-landing-target`}
                  style={styles.formLabel}
                >
                  {landingTargetLabel}
                </label>
                {formLandingType === "product" ? (
                  <select
                    id={`${fieldId}-landing-target`}
                    value={formLandingTargetId}
                    onChange={(e) =>
                      onChange("landingTargetId", e.target.value)
                    }
                    style={styles.select}
                    disabled={loadingProducts}
                  >
                    <option value="">
                      {loadingProducts
                        ? "상품 목록 로딩 중..."
                        : "상품 선택 (선택사항)"}
                    </option>
                    {productOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`${fieldId}-landing-target`}
                    type="text"
                    value={formLandingTargetId}
                    onChange={(e) =>
                      onChange("landingTargetId", e.target.value)
                    }
                    style={styles.input}
                    placeholder={
                      formLandingType === "link"
                        ? "https://example.com"
                        : "비워두면 자료 페이지로 이동합니다"
                    }
                  />
                )}
              </div>
            </>
          )}

          {formError && <p style={styles.formError}>{formError}</p>}

          <div style={styles.formActions}>
            <button onClick={onCancel} style={styles.cancelBtn}>
              취소
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "저장 중..." : "QR 저장"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
