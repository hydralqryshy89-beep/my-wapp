-- CreateTable
CREATE TABLE "saas_pages" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_page_nodes" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" TEXT NOT NULL,
    "props" JSONB NOT NULL DEFAULT '{}',
    "styles" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_page_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saas_pages_projectId_idx" ON "saas_pages"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "saas_pages_projectId_slug_key" ON "saas_pages"("projectId", "slug");

-- CreateIndex
CREATE INDEX "saas_page_nodes_pageId_idx" ON "saas_page_nodes"("pageId");

-- CreateIndex
CREATE INDEX "saas_page_nodes_parentId_idx" ON "saas_page_nodes"("parentId");

-- AddForeignKey
ALTER TABLE "saas_pages" ADD CONSTRAINT "saas_pages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "saas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_pages" ADD CONSTRAINT "saas_pages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "saas_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_pages" ADD CONSTRAINT "saas_pages_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "saas_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_page_nodes" ADD CONSTRAINT "saas_page_nodes_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "saas_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_page_nodes" ADD CONSTRAINT "saas_page_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "saas_page_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
