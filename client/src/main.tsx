import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { queryClient } from "./lib/queryClient";
import { env } from "./lib/env";
import { WalletProvider } from "./providers/WalletProvider";
import { SessionProvider } from "./providers/SessionProvider";
import "./index.css";

async function bootstrap() {
  if (env.useMock) {
    const { startMockWorker } = await import("./lib/mock/browser");
    await startMockWorker();
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <SessionProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </SessionProvider>
        </WalletProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

void bootstrap();
