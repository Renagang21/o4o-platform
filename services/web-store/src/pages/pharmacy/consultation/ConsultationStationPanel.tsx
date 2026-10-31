import type { useConsultationStation } from "./useConsultationStation";
import type { CustomerReply } from "../../../api/consultationWorkspace";
type Station = ReturnType<typeof useConsultationStation>;
const button = "min-h-12 rounded-lg border px-4 py-3 disabled:opacity-50";
export function ConsultationStationPanel({
  station,
  onStarted,
  initialLanguage,
}: {
  station: Station;
  onStarted: () => void;
  initialLanguage?: string;
}) {
  const { room, busy, error, conflict, pairing } = station;
  const seen =
    room?.deviceSeenAt && Date.now() - Date.parse(room.deviceSeenAt) < 15_000;
  return (
    <section
      aria-label="고객 화면 연결"
      className="space-y-3 rounded-xl border bg-white p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">매대 고객 화면</h2>
        <a
          href="/consultation/customer"
          target="_blank"
          rel="noreferrer"
          className={button}
        >
          고객 화면 새 탭 ↗
        </a>
      </div>
      <p className="text-sm text-slate-600">
        고객 태블릿에서 {window.location.origin}/consultation/customer 를 열고
        연결 코드를 입력하세요. 이 기기에서 새 탭을 열어도 다른 태블릿에
        자동으로 열리지는 않습니다.
      </p>
      {!room?.active ? (
        <p className="text-sm text-slate-600">
          위의 ‘매대 상담 시작’을 누른 뒤 고객 화면을 연결하세요.
        </p>
      ) : (
        <>
          <p role="status">
            {room.name} ·{" "}
            {room.connected
              ? seen
                ? "고객 화면 응답 중"
                : "등록된 고객 화면 · 현재 응답 확인 중"
              : "고객 화면 연결 필요"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className={button}
              disabled={busy}
              onClick={() => void station.pair()}
            >
              고객 화면 연결 코드
            </button>
            {room.connected && (
              <button
                className={button}
                disabled={busy}
                onClick={() => void station.action({ action: "disconnect" })}
              >
                고객 기기 연결 해제
              </button>
            )}
          </div>
          {pairing && (
            <div className="rounded-lg bg-teal-50 p-4">
              <p>고객 태블릿에 입력할 코드</p>
              <strong className="block break-all text-3xl tracking-widest">
                {pairing.code}
              </strong>
              <p className="text-sm">
                10분 내 1회 사용 · 새 코드를 만들면 이전 코드는 만료됩니다.
              </p>
            </div>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {conflict && (
        <div className="rounded border bg-amber-50 p-3">
          <p>진행 중인 상담을 끝내고 이 화면에서 시작할까요?</p>
          <button
            className={button}
            disabled={busy}
            onClick={() =>
              void station.open(true, initialLanguage).then((ok) => {
                if (ok) onStarted();
              })
            }
          >
            이전 상담 종료 후 시작
          </button>
        </div>
      )}
    </section>
  );
}

export function ConsultationIncomingReply({
  station,
  onReply,
}: {
  station: Station;
  onReply: (reply: CustomerReply) => void;
}) {
  const { room, busy } = station;
  if (!room?.active || !room.reply) return null;
  return (
    <div className="rounded border border-blue-200 p-3">
      <h3 className="font-semibold">고객 답변</h3>
      <p className="whitespace-pre-wrap break-words">{room.reply.text}</p>
      <button
        className={button}
        disabled={busy}
        onClick={() => {
          onReply(room.reply!);
          void station.action({
            action: "ack",
            replyId: room.reply!.id,
          });
        }}
      >
        답변을 직원 화면에서 사용
      </button>
    </div>
  );
}
