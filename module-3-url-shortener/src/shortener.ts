import { customAlphabet } from "nanoid";

const DEFAULT_CODE_LENGTH = 6;

const generateCode = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  DEFAULT_CODE_LENGTH
);

const codeToUrl = new Map<string, string>();
const urlToCode = new Map<string, string>();

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function shorten(
  url: string,
  codeLength: number = DEFAULT_CODE_LENGTH
): string {
  if (!isValidUrl(url)) {
    throw new Error(`Invalid URL: ${url}`);
  }

  const existingCode = urlToCode.get(url);
  if (existingCode) {
    return existingCode;
  }

  let code = generateCode(codeLength);
  while (codeToUrl.has(code)) {
    code = generateCode(codeLength);
  }

  codeToUrl.set(code, url);
  urlToCode.set(url, code);
  return code;
}

export function resolve(code: string): string | null {
  return codeToUrl.get(code) ?? null;
}
