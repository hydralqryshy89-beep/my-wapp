// Central "enum-like" values for the SaaS Builder foundation. Postgres has no
// native enum requirement here — kept as plain strings validated in the
// application layer, same convention the Marketing Plan app already uses
// (see src/lib/constants.ts).

export const PROJECT_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

// Every permission key the platform understands. Scoped ones (project.*,
// settings.*) apply within a project; the rest apply within an organization.
export const PERMISSION_KEYS = [
  "organization.view",
  "organization.update",
  "member.view",
  "member.invite",
  "member.remove",
  "member.role.update",
  "project.view",
  "project.create",
  "project.update",
  "project.delete",
  "project.member.view",
  "project.member.add",
  "project.member.remove",
  "project.member.role.update",
  "settings.view",
  "settings.update",
  "audit.view",
  "data_model.view",
  "data_model.create",
  "data_model.update",
  "data_model.delete",
  "data_field.view",
  "data_field.create",
  "data_field.update",
  "data_field.delete",
  "data_relation.view",
  "data_relation.create",
  "data_relation.update",
  "data_relation.delete",
  "data_record.view",
  "data_record.create",
  "data_record.update",
  "data_record.delete",
  "page.view",
  "page.create",
  "page.update",
  "page.delete",
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

// Stable identifiers for the six system-defined default roles (see
// prisma/seed.ts). Authorization code matches on these, never on the
// human-readable `name`, so renaming a role in the UI can never change what
// it grants.
export const ROLE_KEYS = {
  ORG_OWNER: "org_owner",
  ORG_ADMIN: "org_admin",
  ORG_MEMBER: "org_member",
  PROJECT_ADMIN: "project_admin",
  PROJECT_MEMBER: "project_member",
  PROJECT_VIEWER: "project_viewer",
} as const;
export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

// Organization-level roles that implicitly manage every project in the
// organization, even without an explicit ProjectMember row (see
// requireProjectContext in src/lib/saas/authorization.ts).
export const ORG_WIDE_PROJECT_ACCESS_ROLE_KEYS: readonly string[] = [
  ROLE_KEYS.ORG_OWNER,
  ROLE_KEYS.ORG_ADMIN,
];

export const DEFAULT_ROLES: {
  key: RoleKey;
  name: string;
  description: string;
  permissions: PermissionKey[];
}[] = [
  {
    key: ROLE_KEYS.ORG_OWNER,
    name: "Organization Owner",
    description: "Full control over the organization, its members, and every project in it.",
    permissions: [...PERMISSION_KEYS],
  },
  {
    key: ROLE_KEYS.ORG_ADMIN,
    name: "Organization Admin",
    description: "Manages the organization, its members, and every project in it.",
    permissions: [...PERMISSION_KEYS],
  },
  {
    key: ROLE_KEYS.ORG_MEMBER,
    name: "Organization Member",
    description: "Can view the organization and the projects they are added to.",
    permissions: ["organization.view", "member.view", "project.view"],
  },
  {
    key: ROLE_KEYS.PROJECT_ADMIN,
    name: "Project Admin",
    description: "Manages a project, its members, and its data schema.",
    permissions: [
      "project.view",
      "project.update",
      "project.member.view",
      "project.member.add",
      "project.member.remove",
      "project.member.role.update",
      "settings.view",
      "settings.update",
      "data_model.view",
      "data_model.create",
      "data_model.update",
      "data_model.delete",
      "data_field.view",
      "data_field.create",
      "data_field.update",
      "data_field.delete",
      "data_relation.view",
      "data_relation.create",
      "data_relation.update",
      "data_relation.delete",
      "data_record.view",
      "data_record.create",
      "data_record.update",
      "data_record.delete",
      "page.view",
      "page.create",
      "page.update",
      "page.delete",
    ],
  },
  {
    key: ROLE_KEYS.PROJECT_MEMBER,
    name: "Project Member",
    description: "Can view and use a project.",
    permissions: [
      "project.view",
      "project.member.view",
      "settings.view",
      "data_model.view",
      "data_field.view",
      "data_relation.view",
      "data_record.view",
      "data_record.create",
      "data_record.update",
      "page.view",
      "page.create",
      "page.update",
    ],
  },
  {
    key: ROLE_KEYS.PROJECT_VIEWER,
    name: "Project Viewer",
    description: "Read-only access to a project.",
    permissions: [
      "project.view",
      "project.member.view",
      "settings.view",
      "data_model.view",
      "data_field.view",
      "data_relation.view",
      "data_record.view",
      "page.view",
    ],
  },
];

export const STATUS_BADGE_STYLES: Record<ProjectStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ARCHIVED: "bg-slate-100 text-slate-600 ring-slate-200",
};
