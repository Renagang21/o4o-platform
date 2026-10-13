import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { styles } from "./qrStyles";

const QR_EXPORT_GUIDE: {
  situation: string;
  recommend: string;
  reason: string;
}[] = [
  {
    situation: "전문 출력소·디자인 업체에 전달",
    recommend: "SVG (벡터)",
    reason: "크기를 키우거나 줄여도 선명하게 출력됩니다",
  },
  {
    situation: "대형 POP·포스터·진열대 출력",
    recommend: "SVG 우선 · PNG 고해상도",
    reason: "큰 사이즈 출력에 유리합니다",
  },
  {
    situation: "PPT·문서·POP 편집에 삽입",
    recommend: "PNG 고해상도",
    reason: "일반 문서 편집 도구에서 사용하기 쉽습니다",
  },
  {
    situation: "약국에서 A4로 바로 출력",
    recommend: "A4 1장 PDF",
    reason: "별도 편집 없이 바로 출력하기 좋습니다",
  },
  {
    situation: "작은 안내카드 여러 장",
    recommend: "A4 4분할 PDF",
    reason: "잘라서 여러 곳에 부착하기 좋습니다",
  },
  {
    situation: "임시 확인·간단 공유",
    recommend: "PNG (이미지)",
    reason: "가장 간단하지만 확대 출력에는 적합하지 않습니다",
  },
];

export function StoreQrPrintToolbar({
  selectedCount,
  printableCount,
  printing,
  onToggleAll,
  onPrint,
}: {
  selectedCount: number;
  printableCount: number;
  printing: boolean;
  onToggleAll: () => void;
  onPrint: () => void;
}) {
  return (
    <div style={styles.printToolbar}>
      <label style={styles.selectAllLabel}>
        <input
          type="checkbox"
          checked={selectedCount === printableCount && printableCount > 0}
          onChange={onToggleAll}
          style={styles.checkbox}
        />
        {/* WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §1: 분모 = 출력 가능한 QR(보관 제외). */}
        전체 선택 ({selectedCount}/{printableCount})
      </label>
      {selectedCount > 0 && (
        <button
          onClick={onPrint}
          disabled={printing}
          style={{ ...styles.printBtn, opacity: printing ? 0.7 : 1 }}
        >
          <Printer size={14} />
          {printing ? "PDF 생성 중..." : `선택 QR 출력 (${selectedCount})`}
        </button>
      )}
    </div>
  );
}

export function StoreQrOutputGuide({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div style={styles.guideOverlay} onClick={() => onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="QR 출력 파일 안내"
        style={styles.guideModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.guideHeader}>
          <h2 style={styles.guideTitle}>QR 출력 파일은 이렇게 선택하세요</h2>
          <button
            onClick={() => onClose()}
            style={styles.iconBtn}
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>
        <div style={styles.guideBody}>
          {QR_EXPORT_GUIDE.map((g) => (
            <div key={g.situation} style={styles.guideCard}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.guideSituation}>{g.situation}</p>
                <p style={styles.guideReason}>{g.reason}</p>
              </div>
              <span style={styles.guideRecommend}>{g.recommend}</span>
            </div>
          ))}
        </div>
        <div style={styles.guideFooterNote}>
          크기 조절이나 전문 출력소 전달이 필요하면 <strong>SVG (벡터)</strong>
          를 선택하세요.
          <br />
          약국에서 바로 종이에 출력할 때는 <strong>A4 PDF</strong>가 가장
          간단합니다.
        </div>
      </div>
    </div>
  );
}
