import React from "react";
import ReactDOM from "react-dom/client";
import { HandoffEntryPage } from "@o4o/auth-react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { App } from "./App";
import { ConnectedApp } from "./ConnectedApp";
import { cooperatives, previewCooperatives } from "./catalog";
import "./styles.css";

const preview =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get("preview") === "1";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/handoff"
          element={
            <HandoffEntryPage
              errorMessages={{
                HANDOFF_TOKEN_INVALID:
                  "이동 링크가 만료되었습니다. 출발 화면에서 다시 이동해 주세요.",
              }}
              apiBaseUrl={(
                import.meta.env.VITE_API_BASE_URL || "https://api.neture.co.kr"
              ).replace(/\/$/, "")}
            />
          }
        />
        <Route
          path="*"
          element={
            preview ? (
              <App
                cooperatives={preview ? previewCooperatives : cooperatives}
                preview={preview}
              />
            ) : (
              <ConnectedApp />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
