import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission, ROLE_PERMISSIONS } from "@ai-assistant/shared";

test("Owner has all permissions via wildcard", () => {
  assert.equal(hasPermission("Owner", "customers:write"), true);
  assert.equal(hasPermission("Owner", "anything"), true);
});

test("ReadOnly cannot write customers", () => {
  assert.equal(hasPermission("ReadOnly", "customers:read"), true);
  assert.equal(hasPermission("ReadOnly", "customers:write"), false);
});

test("Accountant limited to finance-ish reads", () => {
  assert.equal(hasPermission("Accountant", "quotes:read"), true);
  assert.equal(hasPermission("Accountant", "whatsapp:write"), false);
});

test("All roles defined in ROLE_PERMISSIONS", () => {
  for (const role of Object.keys(ROLE_PERMISSIONS)) {
    assert.ok(Array.isArray(ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]));
  }
});

test("tenant filter helper pattern", () => {
  // Documents the required isolation pattern used across routes
  function scopedWhere(tenantId: string, id: string) {
    return { id, tenantId, deletedAt: null };
  }
  const a = scopedWhere("tenant-a", "cust-1");
  const b = scopedWhere("tenant-b", "cust-1");
  assert.notEqual(a.tenantId, b.tenantId);
  assert.equal(a.id, b.id);
});
