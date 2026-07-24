export type FileCategory = "test" | "docs" | "ci" | "build" | "style" | "source";

const TEST_PATTERN = /(^|\/)(tests?|__tests__|spec)(\/|$)|\.(test|spec)\.[jt]sx?$/i;
const DOCS_PATTERN = /\.(md|mdx|rst|adoc|txt)$/i;
const DOCS_DIR_PATTERN = /^docs?\//i;
const CI_PATTERN =
  /^\.github\/workflows\/|^\.circleci\/|(^|\/)(\.gitlab-ci\.ya?ml|azure-pipelines\.ya?ml|Jenkinsfile)$/i;
const BUILD_FILE_PATTERN =
  /^(package(-lock)?\.json|tsconfig.*\.json|webpack\.config\.[cm]?[jt]s|vite\.config\.[cm]?[jt]s|rollup\.config\.[cm]?[jt]s|Dockerfile|docker-compose.*\.ya?ml|Makefile|\.npmrc|\.nvmrc)$/i;
const STYLE_PATTERN = /\.(css|scss|sass|less)$/i;
const LINT_CONFIG_PATTERN = /^\.(eslintrc|prettierrc)/i;

/** Classifies a single changed file path into a broad category used to infer commit type. */
export function classifyFile(path: string): FileCategory {
  const basename = path.split("/").pop() ?? path;

  if (TEST_PATTERN.test(path)) return "test";
  if (DOCS_PATTERN.test(path) || DOCS_DIR_PATTERN.test(path) || /^readme/i.test(basename)) {
    return "docs";
  }
  if (CI_PATTERN.test(path)) return "ci";
  if (BUILD_FILE_PATTERN.test(basename)) return "build";
  if (STYLE_PATTERN.test(path) || LINT_CONFIG_PATTERN.test(basename)) return "style";

  return "source";
}

const SCOPE_ROOT_PREFIX = /^(src|lib|app|apps|packages|test|tests)\//;

/**
 * Infers a shared scope from a set of changed paths, e.g. ["src/auth/login.ts",
 * "src/auth/session.ts"] -> "auth". Returns undefined when the files don't
 * share a single natural directory (root-level files or multiple modules).
 */
export function extractScope(paths: string[]): string | undefined {
  const segments = new Set<string>();

  for (const path of paths) {
    const stripped = path.replace(SCOPE_ROOT_PREFIX, "");
    const parts = stripped.split("/");
    if (parts.length > 1 && parts[0]) {
      segments.add(parts[0]);
    }
  }

  return segments.size === 1 ? [...segments][0] : undefined;
}
