import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, test } from "node:test";
import {
  decryptContent, encryptContent, hasValidEncryptionKey
} from "../security/notification-crypto";

const previous = process.env.SYNC_ENCRYPTION_KEY;
process.env.SYNC_ENCRYPTION_KEY = randomBytes(32).toString("base64");
after(() => {
  if (previous === undefined) delete process.env.SYNC_ENCRYPTION_KEY;
  else process.env.SYNC_ENCRYPTION_KEY = previous;
});

test("encrypts and authenticates a notification preview", () => {
  assert.equal(hasValidEncryptionKey(), true);
  const original = { title: "Prueba", message: "Este es un texto privado" };
  const encrypted = encryptContent(original.title, original.message);
  assert.equal(encrypted.includes(original.message), false);
  assert.deepEqual(decryptContent(encrypted), original);

  const [iv, tag, body] = encrypted.split(".");
  const changedTag = Buffer.from(tag, "base64url");
  changedTag[0] ^= 1;
  assert.throws(() => decryptContent([iv, changedTag.toString("base64url"), body].join(".")));
});

test("rejects a missing or incorrect encryption key", () => {
  process.env.SYNC_ENCRYPTION_KEY = "123";
  assert.equal(hasValidEncryptionKey(), false);
  assert.throws(() => encryptContent("a", "b"));
});
