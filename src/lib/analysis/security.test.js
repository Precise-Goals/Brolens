import { describe, expect, it } from "vitest";
import { redactSecrets } from "./failureAnalysis";

describe("security: secret redaction engine", () => {
  it("redacts classic GitHub personal access tokens", () => {
    const raw = "Error during checkout: ghp_1234567890abcdef1234567890abcdef";
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("ghp_1234567890abcdef");
    expect(redacted).toContain("<redacted-secret>");
  });

  it("redacts GitHub fine-grained personal access tokens", () => {
    const raw = "Auth failed for github_pat_11AAAAAAA0000000000000_1234567890abcdef";
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("github_pat_11AAAAAAA");
    expect(redacted).toContain("<redacted-secret>");
  });

  it("redacts OpenAI secret keys", () => {
    const raw = "Using key sk-proj-123456789012345678901234567890";
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("sk-proj-1234567890");
    expect(redacted).toContain("<redacted-secret>");
  });

  it("redacts environment assignments with sensitive names", () => {
    const raw = "DATABASE_PASSWORD=superSecretPassword987! and API_KEY=xyz123";
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("superSecretPassword987!");
    expect(redacted).toContain("DATABASE_PASSWORD=<redacted>");
    expect(redacted).toContain("API_KEY=<redacted>");
  });

  it("redacts full PEM private key blocks", () => {
    const raw = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y1+exampleFakeKeyBlock1234567890
-----END RSA PRIVATE KEY-----`;
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("MIIEowIBAAKCAQEA0Y1");
    expect(redacted).toContain("<redacted-secret>");
  });

  it("preserves non-sensitive log messages exactly", () => {
    const cleanLog = "PASS src/pricing/discounts.test.ts\nTests: 12 passed, 12 total";
    expect(redactSecrets(cleanLog)).toBe(cleanLog);
  });
});
