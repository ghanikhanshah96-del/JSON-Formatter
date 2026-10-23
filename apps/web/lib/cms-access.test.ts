import assert from "node:assert/strict";
import test from "node:test";
import { canDeleteMedia, evaluateCmsAccess } from "./cms-access.ts";

test("CMS access requires password completion before MFA or roles", () => {
  assert.equal(evaluateCmsAccess(null), "login");
  assert.equal(evaluateCmsAccess({ role: "editor", aal: "aal1", passwordSet: false }), "password");
  assert.equal(evaluateCmsAccess({ role: "editor", aal: "aal2", passwordSet: false }), "password");
  assert.equal(evaluateCmsAccess({ role: "editor", aal: "aal1", passwordSet: true }), "mfa");
  assert.equal(evaluateCmsAccess({ role: "editor", aal: "aal2", passwordSet: true }), "allowed");
  assert.equal(evaluateCmsAccess({ role: "editor", aal: "aal2", passwordSet: true }, { owner: true }), "owner");
  assert.equal(evaluateCmsAccess({ role: "owner", aal: "aal2", passwordSet: true }, { owner: true }), "allowed");
});

test("media removal follows owner and uploader permissions", () => {
  assert.equal(canDeleteMedia("owner", "owner-id", "someone-else"), true);
  assert.equal(canDeleteMedia("editor", "editor-id", "editor-id"), true);
  assert.equal(canDeleteMedia("editor", "editor-id", "someone-else"), false);
});
