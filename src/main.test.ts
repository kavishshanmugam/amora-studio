import { describe, expect, it, vi } from "vitest";
import { fatalDatabaseErrorContent, startApplication } from "./main";

describe("application startup", () => {
  it("does not render the application until database initialization succeeds", async () => {
    let finishInitialization: (() => void) | undefined;
    const initialization = new Promise<void>((resolve) => {
      finishInitialization = resolve;
    });
    const render = vi.fn();
    const showFatalError = vi.fn();

    const startup = startApplication({
      initialize: () => initialization,
      render,
      showFatalError,
    });

    expect(render).not.toHaveBeenCalled();
    finishInitialization?.();
    await startup;

    expect(render).toHaveBeenCalledOnce();
    expect(showFatalError).not.toHaveBeenCalled();
  });

  it("shows the fatal fallback instead of rendering when initialization fails", async () => {
    const error = new Error("migration failed");
    const render = vi.fn();
    const showFatalError = vi.fn();

    await startApplication({
      initialize: async () => { throw error; },
      render,
      showFatalError,
    });

    expect(render).not.toHaveBeenCalled();
    expect(showFatalError).toHaveBeenCalledOnce();
    expect(showFatalError).toHaveBeenCalledWith(error);
  });

  it("provides a visible fatal error message with the initialization failure detail", () => {
    expect(fatalDatabaseErrorContent(new Error("migration failed"))).toEqual({
      heading: "Amora Studio couldn't start",
      message: "The database could not be initialized. Restart the app and try again.",
      detail: "migration failed",
    });
  });
});
