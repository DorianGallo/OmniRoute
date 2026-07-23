import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Isolate storage BEFORE importing model services. ESM static imports are
// hoisted, so a top-level `import { getModelInfoCore }` would initialize the
// DB against the default DATA_DIR and make bare-model resolution flaky in CI.
const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-bare-autopick-"));
process.env.DATA_DIR = TEST_DATA_DIR;

const core = await import("../../src/lib/db/core.ts");
const { getModelInfoCore } = await import("../../open-sse/services/model.ts");

test.beforeEach(() => {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  process.env.DATA_DIR = TEST_DATA_DIR;
});

test.after(() => {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

test("gpt-oss-120b-medium auto-picks antigravity provider via canonical deduplication", async () => {
  const info = await getModelInfoCore("gpt-oss-120b-medium", null);

  assert.equal(info.provider, "antigravity", `unexpected resolve: ${JSON.stringify(info)}`);
  assert.equal(info.model, "gpt-oss-120b-medium");
  assert.equal((info as Record<string, unknown>).errorType, undefined);
});

test("unprefixed model with no active providers falls back to ambiguous_model when multiple distinct providers exist", async () => {
  const info = await getModelInfoCore("gpt-oss-120b", null);

  assert.equal(info.provider, null);
  assert.equal((info as Record<string, unknown>).errorType, "ambiguous_model");
  assert.ok(Array.isArray((info as Record<string, unknown>).candidateProviders));
  assert.ok(((info as Record<string, unknown>).candidateProviders as unknown[]).length > 1);
});
