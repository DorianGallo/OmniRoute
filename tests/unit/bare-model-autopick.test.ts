import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-bare-autopick-"));
process.env.DATA_DIR = TEST_DATA_DIR;

import { getModelInfoCore } from "../../open-sse/services/model.ts";

test("gpt-oss-120b-medium auto-picks antigravity provider via canonical deduplication", async () => {
  const info = await getModelInfoCore("gpt-oss-120b-medium", null);

  assert.equal(info.provider, "antigravity");
  assert.equal(info.model, "gpt-oss-120b-medium");
  assert.equal((info as Record<string, unknown>).errorType, undefined);
});

test("unprefixed model with no active providers falls back to ambiguous_model when multiple distinct providers exist", async () => {
  const info = await getModelInfoCore("gpt-oss-120b", null);

  assert.equal(info.provider, null);
  assert.equal((info as Record<string, unknown>).errorType, "ambiguous_model");
  assert.ok(Array.isArray((info as Record<string, unknown>).candidateProviders));
  assert.ok((info as Record<string, unknown>).candidateProviders.length > 1);
});
