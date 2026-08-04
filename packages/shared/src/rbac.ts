export const ROLES = [
  "Owner",
  "Manager",
  "Employee",
  "Accountant",
  "ReadOnly",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {
  Owner: ["*"],
  Manager: [
    "customers:read",
    "customers:write",
    "reminders:read",
    "reminders:write",
    "quotes:read",
    "quotes:write",
    "whatsapp:read",
    "whatsapp:write",
    "google:read",
    "google:write",
    "ai:use",
    "dashboard:read",
    "tenant:read",
    "tenant:write",
  ],
  Employee: [
    "customers:read",
    "customers:write",
    "reminders:read",
    "reminders:write",
    "quotes:read",
    "quotes:write",
    "whatsapp:read",
    "whatsapp:write",
    "google:read",
    "ai:use",
    "dashboard:read",
  ],
  Accountant: [
    "customers:read",
    "quotes:read",
    "dashboard:read",
  ],
  ReadOnly: [
    "customers:read",
    "reminders:read",
    "quotes:read",
    "whatsapp:read",
    "google:read",
    "dashboard:read",
  ],
};

export function hasPermission(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}
