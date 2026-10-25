import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
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
      {preview ? <App
        cooperatives={preview ? previewCooperatives : cooperatives}
        preview={preview}
      /> : <ConnectedApp />}
    </BrowserRouter>
  </React.StrictMode>,
);
