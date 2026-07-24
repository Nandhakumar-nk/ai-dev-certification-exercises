/** Converts a file path into a human-readable phrase, e.g. "authService.ts" -> "auth service". */
export function humanizeFileName(path: string): string {
  const basename = path.split("/").pop() ?? path;
  const withoutExtension = basename.replace(/\.[^./]+$/, "");
  const spaced = withoutExtension
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_.]+/g, " ")
    .toLowerCase()
    .trim();

  return spaced.length > 0 ? spaced : basename.toLowerCase();
}

/** Truncates text to `maxLength`, cutting on the nearest word boundary rather than mid-word. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd();
}
