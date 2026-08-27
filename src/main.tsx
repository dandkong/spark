import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import App from "./App";
import "./index.css";

// F12 打开 DevTools（release 构建下 Tauri 没有默认入口，error 日志在控制台可见）
window.addEventListener("keydown", (event) => {
  if (event.key === "F12" && !event.repeat) {
    invoke("open_devtools").catch(() => {
      // 非 Tauri 环境（纯浏览器开发）忽略
    });
  }
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
