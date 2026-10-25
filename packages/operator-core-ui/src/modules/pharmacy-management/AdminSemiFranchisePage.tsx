import { Navigate, useLocation } from "react-router-dom";
/** Legacy bookmarks retain registration/federation intent in the consolidated settings. */
export default function AdminSemiFranchisePage() {
  const location = useLocation();
  return (
    <Navigate
      replace
      to={{
        pathname: "/admin/pharmacy-service-settings",
        search: location.search,
      }}
    />
  );
}
