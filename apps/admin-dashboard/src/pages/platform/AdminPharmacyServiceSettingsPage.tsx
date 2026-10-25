import { useState } from "react";
import { AdminPharmacyServiceSettingsPage as Settings } from "@o4o/operator-core-ui/modules/pharmacy-management";
import AdminCooperativePanel from "./AdminCooperativePanel";
import PharmacyConsultationLayoutsPanel from "./PharmacyConsultationLayoutsPanel";
const federation = <AdminCooperativePanel />;
export default function AdminPharmacyServiceSettingsPage() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Settings federationPanel={federation} />
      <details
        onToggle={(event) => setOpen(event.currentTarget.open)}
        className="mx-auto my-6 max-w-6xl rounded-xl border bg-white p-4"
      >
        <summary className="min-h-12 cursor-pointer content-center font-semibold">
          매장별 상담 화면 배치
        </summary>
        {open && <PharmacyConsultationLayoutsPanel />}
      </details>
    </>
  );
}
