import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { ToastProvider } from "./components/shared/Toast";
import { initDatabase } from "./data";
import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: false,
    },
  },
});

interface ApplicationStartup {
  initialize(): Promise<void>;
  render(): void;
  showFatalError(error: unknown): void;
}

/** Prevent database-backed UI from rendering until initialization is complete. */
export async function startApplication(startup: ApplicationStartup): Promise<void> {
  try {
    await startup.initialize();
    startup.render();
  } catch (error) {
    console.error("[app] Database init failed:", error);
    startup.showFatalError(error);
  }
}

function renderApplication(): void {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

export function fatalDatabaseErrorContent(error: unknown): {
  heading: string;
  message: string;
  detail: string;
} {
  return {
    heading: "Amora Studio couldn't start",
    message: "The database could not be initialized. Restart the app and try again.",
    detail: error instanceof Error ? error.message : String(error),
  };
}

function showFatalDatabaseError(error: unknown): void {
  const root = document.getElementById("root");
  if (!root) return;
  const content = fatalDatabaseErrorContent(error);
  root.replaceChildren();
  const container = document.createElement("main");
  container.setAttribute("role", "alert");
  container.style.cssText = "max-width:42rem;margin:4rem auto;padding:2rem;font-family:system-ui;color:#2b2020";
  const heading = document.createElement("h1");
  heading.textContent = content.heading;
  const message = document.createElement("p");
  message.textContent = content.message;
  const details = document.createElement("pre");
  details.textContent = content.detail;
  details.style.whiteSpace = "pre-wrap";
  container.append(heading, message, details);
  root.append(container);
}

if (typeof document !== "undefined") {
  void startApplication({
    initialize: async () => {
      if ("__TAURI_INTERNALS__" in window) {
        await initDatabase();
        console.log("[app] Database initialized");
      }
    },
    render: renderApplication,
    showFatalError: showFatalDatabaseError,
  });
}
