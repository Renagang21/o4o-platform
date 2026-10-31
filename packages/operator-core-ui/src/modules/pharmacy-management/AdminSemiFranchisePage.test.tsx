import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Page from "./AdminSemiFranchisePage";
function Destination() {
  const location = useLocation();
  return (
    <output>
      {location.pathname}
      {location.search}
    </output>
  );
}
afterEach(cleanup);
it.each([
  "",
  "?register=carepharm",
  "?register=drugstore",
  "?register=pharmcoop",
  "?section=cooperatives",
  "?target=business%3Asynthetic",
])("preserves legacy entry intent %s at the consolidated route", (query) => {
  render(
    <MemoryRouter initialEntries={[`/admin/semi-franchises${query}`]}>
      <Routes>
        <Route path="/admin/semi-franchises" element={<Page />} />
        <Route
          path="/admin/pharmacy-service-settings"
          element={<Destination />}
        />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByRole("status").textContent).toBe(
    `/admin/pharmacy-service-settings${query}`,
  );
});
