import React from "react";
import { createRoot } from "react-dom/client";
import PartnerSite from "./PartnerSite";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HandoffEntryPage } from "@o4o/auth-react";
import { PARTNER_API_ORIGIN } from "./api";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/handoff"
          element={
            <HandoffEntryPage
              apiBaseUrl={PARTNER_API_ORIGIN}
              errorMessages={{
                HANDOFF_TOKEN_INVALID:
                  "이동 링크가 만료되었거나 사용되었습니다. 다시 로그인해 주세요.",
              }}
            />
          }
        />
        <Route path="*" element={<PartnerSite />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
