import { useSearchParams } from "react-router-dom";
import { AdminSemiFranchisePage } from "@o4o/operator-core-ui/modules/pharmacy-management";
import AdminCooperativePanel from "./AdminCooperativePanel";

/** Platform-only navigation; each service retains its own member operations. */
export default function AdminCooperationBusinessesPage() {
  const [params, setParams] = useSearchParams();
  const cooperative =
    params.get("section") === "cooperatives" ||
    params.get("register") === "pharmcoop";
  return (
    <div>
      <nav
        aria-label="협력사업 종류"
        className="flex flex-wrap gap-2 border-b px-6 py-3"
      >
        {[
          { label: "약국 협력사업", selected: !cooperative, query: {} },
          {
            label: "약국·약사 협동조합",
            selected: cooperative,
            query: { section: "cooperatives" },
          },
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            aria-current={tab.selected ? "page" : undefined}
            onClick={() => setParams(tab.query)}
            className={`rounded-md border px-3 py-2 text-sm ${tab.selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600"}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {cooperative ? <AdminCooperativePanel /> : <AdminSemiFranchisePage />}
    </div>
  );
}
