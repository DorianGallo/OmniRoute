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

test("gpt-oss-120b-medium is ambiguous across antigravity and gemini-cli without a provider prefix", async () => {
  // Both Antigravity and Gemini CLI advertise this model id. With no active
  // credentials, bare-model resolution must refuse to auto-pick and ask for a
  // provider/model prefix instead of guessing.
  const info = await getModelInfoCore("gpt-oss-120b-medium", null);

  assert.equal(info.provider, null, `unexpected resolve: ${JSON.stringify(info)}`);
  assert.equal((info as Record<string, unknown>).errorType, "ambiguous_model");
  const candidates = (info as Record<string, unknown>).candidateProviders as string[];
  assert.ok(Array.isArray(candidates));
  assert.ok(candidates.includes("antigravity"), `candidates=${JSON.stringify(candidates)}`);
  assert.ok(candidates.includes("gemini-cli"), `candidates=${JSON.stringify(candidates)}`);
  assert.ok(candidates.length >= 2);
});

test("unprefixed model with no active providers falls back to ambiguous_model when multiple distinct providers exist", async () => {
  const info = await getModelInfoCore("gpt-oss-120b", null);

  assert.equal(info.provider, null);
  assert.equal((info as Record<string, unknown>).errorType, "ambiguous_model");
  assert.ok(Array.isArray((info as Record<string, unknown>).candidateProviders));
  assert.ok(((info as Record<string, unknown>).candidateProviders as unknown[]).length > 1);
});
