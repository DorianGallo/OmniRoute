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

test("gpt-oss-120b-medium bare resolution is deterministic without credentials", async () => {
  // Catalog membership for this model currently includes Antigravity and may
  // also include Gemini CLI depending on which static/CLI catalogs are loaded.
  // Without active credentials the resolver must either:
  //   1) uniquely pick antigravity when only one candidate remains after
  //      canonical dedup, or
  //   2) refuse to guess and return ambiguous_model with the candidate set.
  // Never silently pick an unrelated provider.
  const info = await getModelInfoCore("gpt-oss-120b-medium", null);
  const errorType = (info as Record<string, unknown>).errorType;

  if (errorType === "ambiguous_model") {
    assert.equal(info.provider, null, `unexpected resolve: ${JSON.stringify(info)}`);
    const candidates = (info as Record<string, unknown>).candidateProviders as string[];
    assert.ok(Array.isArray(candidates), `candidates missing: ${JSON.stringify(info)}`);
    assert.ok(candidates.includes("antigravity"), `candidates=${JSON.stringify(candidates)}`);
    // Gemini CLI may or may not contribute depending on catalog load order.
    assert.ok(
      candidates.length >= 2,
      `expected multi-candidate ambiguity, got ${JSON.stringify(candidates)}`
    );
    return;
  }

  assert.equal(errorType, undefined, `unexpected resolve: ${JSON.stringify(info)}`);
  assert.equal(info.provider, "antigravity", `unexpected resolve: ${JSON.stringify(info)}`);
  assert.equal(info.model, "gpt-oss-120b-medium");
});

test("unprefixed model with no active providers falls back to ambiguous_model when multiple distinct providers exist", async () => {
  const info = await getModelInfoCore("gpt-oss-120b", null);

  assert.equal(info.provider, null);
  assert.equal((info as Record<string, unknown>).errorType, "ambiguous_model");
  assert.ok(Array.isArray((info as Record<string, unknown>).candidateProviders));
  assert.ok(((info as Record<string, unknown>).candidateProviders as unknown[]).length > 1);
});
