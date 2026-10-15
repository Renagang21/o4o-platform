import { useState } from "react";
import { HomePresentationEditor } from "@o4o/shared-space-ui";
import { api } from "../../lib/apiClient";

export default function HomePresentationPage({
  surface,
}: {
  surface: "neture" | "supplier" | "funding" | "community";
}) {
  const [target, setTarget] = useState<"neture" | "carepharm">("neture");
  return (
    <div className="mx-auto max-w-6xl bg-white">
      {surface === "neture" && (
        <nav
          aria-label="관리할 홈 선택"
          className="flex flex-wrap gap-3 px-5 pt-6"
        >
          {(["neture", "carepharm"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={target === key}
              className="min-h-11 rounded-lg border px-4 py-2"
              onClick={() => {
                if (
                  target !== key &&
                  window.confirm(
                    "다른 홈으로 이동합니다. 저장하지 않은 입력이 있다면 먼저 저장해 주세요. 계속할까요?",
                  )
                )
                  setTarget(key);
              }}
            >
              {key === "neture" ? "O4O 대표 홈" : "CarePharm"}
            </button>
          ))}
        </nav>
      )}
      <HomePresentationEditor
        key={surface === "neture" ? target : surface}
        surface={surface === "neture" ? target : surface}
        client={api}
      />
    </div>
  );
}
