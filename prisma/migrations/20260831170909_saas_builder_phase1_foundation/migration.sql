-- CreateTable
CREATE TABLE "saas_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "image" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_organization_members" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_projects" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_project_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_roles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT,
    "key" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "saas_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saas_users_email_key" ON "saas_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "saas_organizations_slug_key" ON "saas_organizations"("slug");

-- CreateIndex
CREATE INDEX "saas_organizations_slug_idx" ON "saas_organizations"("slug");

-- CreateIndex
CREATE INDEX "saas_organization_members_organizationId_idx" ON "saas_organization_members"("organizationId");

-- CreateIndex
CREATE INDEX "saas_organization_members_userId_idx" ON "saas_organization_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "saas_organization_members_organizationId_userId_key" ON "saas_organization_members"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "saas_projects_organizationId_idx" ON "saas_projects"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "saas_projects_organizationId_slug_key" ON "saas_projects"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "saas_project_members_projectId_idx" ON "saas_project_members"("projectId");

-- CreateIndex
CREATE INDEX "saas_project_members_userId_idx" ON "saas_project_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "saas_project_members_projectId_userId_key" ON "saas_project_members"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "saas_roles_key_key" ON "saas_roles"("key");

-- CreateIndex
CREATE INDEX "saas_roles_organizationId_idx" ON "saas_roles"("organizationId");

-- CreateIndex
CREATE INDEX "saas_roles_projectId_idx" ON "saas_roles"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "saas_permissions_key_key" ON "saas_permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "saas_role_permissions_roleId_permissionId_key" ON "saas_role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "saas_audit_logs_organizationId_idx" ON "saas_audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "saas_audit_logs_projectId_idx" ON "saas_audit_logs"("projectId");

-- CreateIndex
CREATE INDEX "saas_audit_logs_userId_idx" ON "saas_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "saas_audit_logs_createdAt_idx" ON "saas_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "saas_organization_members" ADD CONSTRAINT "saas_organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "saas_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_organization_members" ADD CONSTRAINT "saas_organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "saas_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_organization_members" ADD CONSTRAINT "saas_organization_members_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "saas_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_projects" ADD CONSTRAINT "saas_projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "saas_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_project_members" ADD CONSTRAINT "saas_project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "saas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_project_members" ADD CONSTRAINT "saas_project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "saas_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_project_members" ADD CONSTRAINT "saas_project_members_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "saas_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_roles" ADD CONSTRAINT "saas_roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "saas_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_roles" ADD CONSTRAINT "saas_roles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "saas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_role_permissions" ADD CONSTRAINT "saas_role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "saas_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_role_permissions" ADD CONSTRAINT "saas_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "saas_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_audit_logs" ADD CONSTRAINT "saas_audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "saas_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_audit_logs" ADD CONSTRAINT "saas_audit_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "saas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_audit_logs" ADD CONSTRAINT "saas_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "saas_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
