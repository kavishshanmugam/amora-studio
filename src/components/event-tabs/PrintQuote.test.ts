import { describe, expect, it } from "vitest";
import { calculateQuoteBalance, logoImageHtml } from "./PrintQuote";

describe("printed quote balance", () => {
  it("clamps the balance to zero when the deposit exceeds the recalculated total", () => {
    expect(calculateQuoteBalance(5_000, 7_500)).toBe(0);
  });
});

describe("print quote logo", () => {
  it("omits a crafted logo value instead of injecting it into innerHTML", () => {
    const payload = 'x\" onerror=\"window.pwned=true';

    expect(logoImageHtml(payload)).toBe("");
    expect(logoImageHtml("data:image/png;base64,aGVsbG8=")).toContain(
      'src="data:image/png;base64,aGVsbG8="',
    );
  });

  it.each([
    "data:image/png;base64,aGVsbG8=",
    "data:image/jpeg;base64,/9j/4AAQ",
    "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
  ])("allows a supported base64 image URL", (logo) => {
    expect(logoImageHtml(logo)).toContain(`src="${logo}"`);
  });

  it.each([
    "https://example.com/logo.png",
    "data:image/gif;base64,R0lGODlh",
    "data:image/svg+xml,<svg onload=alert(1)>",
  ])("omits unsupported logo URL %s", (logo) => {
    expect(logoImageHtml(logo)).toBe("");
  });
});
