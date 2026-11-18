import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, matchesPassword } from "../security/password";

test("Passwords use salted scrypt hashes and a timing-safe comparison", async () => {
  const hashA = await hashPassword("clave-segura-123");
  const hashB = await hashPassword("clave-segura-123");
  assert.notEqual(hashA, hashB);
  assert.equal(await matchesPassword("clave-segura-123", hashA), true);
  assert.equal(await matchesPassword("otra-clave-123", hashA), false);
  assert.equal(await matchesPassword("clave-segura-123", "invalid"), false);
});
