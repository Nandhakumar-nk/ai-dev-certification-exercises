import { customAlphabet } from "nanoid";

const generateCode = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  6
);

const codeToUrl = new Map<string, string>();
const urlToCode = new Map<string, string>();

export function shorten(url: string): string {
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  const existingCode = urlToCode.get(url);
  if (existingCode) {
    return existingCode;
  }

  let code = generateCode();
  while (codeToUrl.has(code)) {
    code = generateCode();
  }

  codeToUrl.set(code, url);
  urlToCode.set(url, code);
  return code;
}

export function resolve(code: string): string | null {
  return codeToUrl.get(code) ?? null;
}
