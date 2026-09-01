const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    globals: false,
    // Test files share one SQLite db and each wipes shared tables in
    // beforeAll/afterAll; run files sequentially to avoid cross-file races.
    fileParallelism: false,
  },
});
