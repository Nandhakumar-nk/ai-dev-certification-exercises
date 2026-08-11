import { describe, it, expect } from "vitest";
import { shorten, resolve } from "./shortener";

describe("shorten() - URL validation", () => {
  it("accepts a well-formed https URL", () => {
    expect(() => shorten("https://example.com")).not.toThrow();
  });

  it("accepts a well-formed http URL", () => {
    expect(() => shorten("http://example.com")).not.toThrow();
  });

  it("accepts URLs with paths, query strings, and fragments", () => {
    expect(() =>
      shorten("https://example.com/path?query=1#frag")
    ).not.toThrow();
  });

  it("throws on a clearly invalid string", () => {
    expect(() => shorten("not a url")).toThrow();
  });

  it("throws on a URL missing a protocol", () => {
    expect(() => shorten("example.com")).toThrow();
  });

  it("throws on an empty string", () => {
    expect(() => shorten("")).toThrow();
  });
});

describe("shorten() - short code generation", () => {
  it("returns a code that is exactly 6 characters long", () => {
    const code = shorten("https://example.com/code-length");
    expect(code.length).toBe(6);
  });

  it("returns a code made up of only alphanumeric characters", () => {
    const code = shorten("https://example.com/code-format");
    expect(code).toMatch(/^[A-Za-z0-9]{6}$/);
  });

  it("returns different codes for different URLs", () => {
    const codeA = shorten("https://example.com/page-a");
    const codeB = shorten("https://example.com/page-b");
    expect(codeA).not.toBe(codeB);
  });
});

describe("resolve() - URL retrieval", () => {
  it("returns the original URL for a code produced by shorten()", () => {
    const url = "https://example.com/retrieve-me";
    const code = shorten(url);
    expect(resolve(code)).toBe(url);
  });

  it("returns null for a code that was never generated", () => {
    expect(resolve("zzzzzz")).toBeNull();
  });
});

describe("idempotency", () => {
  it("returns the same code for the same URL shortened twice", () => {
    const url = "https://example.com/idempotent";
    const firstCode = shorten(url);
    const secondCode = shorten(url);
    expect(secondCode).toBe(firstCode);
  });

  it("still resolves correctly after shortening the same URL twice", () => {
    const url = "https://example.com/idempotent-resolve";
    shorten(url);
    const code = shorten(url);
    expect(resolve(code)).toBe(url);
  });
});

describe("edge cases", () => {
  it("throws on an empty string", () => {
    expect(() => shorten("")).toThrow();
  });

  it("handles a very long URL (2048 characters)", () => {
    const prefix = "https://example.com/";
    const longUrl = prefix + "a".repeat(2048 - prefix.length);
    expect(longUrl.length).toBe(2048);

    let code = "";
    expect(() => {
      code = shorten(longUrl);
    }).not.toThrow();
    expect(code.length).toBe(6);
    expect(resolve(code)).toBe(longUrl);
  });

  it("throws on a URL missing a protocol", () => {
    expect(() => shorten("example.com/page")).toThrow();
  });

  it("throws on a bare domain-like string without a protocol", () => {
    expect(() => shorten("www.example.com")).toThrow();
  });
});
