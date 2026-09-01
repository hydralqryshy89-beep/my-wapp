-- CreateTable
CREATE TABLE "saas_data_models" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_data_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_data_fields" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "unique" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" JSONB,
    "options" JSONB,
    "validation" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_data_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_data_relations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fromModelId" TEXT NOT NULL,
    "fromFieldId" TEXT NOT NULL,
    "toModelId" TEXT NOT NULL,
    "toFieldId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_data_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saas_data_models_projectId_idx" ON "saas_data_models"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "saas_data_models_projectId_slug_key" ON "saas_data_models"("projectId", "slug");

-- CreateIndex
CREATE INDEX "saas_data_fields_modelId_idx" ON "saas_data_fields"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "saas_data_fields_modelId_key_key" ON "saas_data_fields"("modelId", "key");

-- CreateIndex
CREATE INDEX "saas_data_relations_projectId_idx" ON "saas_data_relations"("projectId");

-- CreateIndex
CREATE INDEX "saas_data_relations_fromModelId_idx" ON "saas_data_relations"("fromModelId");

-- CreateIndex
CREATE INDEX "saas_data_relations_toModelId_idx" ON "saas_data_relations"("toModelId");

-- AddForeignKey
ALTER TABLE "saas_data_models" ADD CONSTRAINT "saas_data_models_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "saas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_data_fields" ADD CONSTRAINT "saas_data_fields_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "saas_data_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_data_relations" ADD CONSTRAINT "saas_data_relations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "saas_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_data_relations" ADD CONSTRAINT "saas_data_relations_fromModelId_fkey" FOREIGN KEY ("fromModelId") REFERENCES "saas_data_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_data_relations" ADD CONSTRAINT "saas_data_relations_toModelId_fkey" FOREIGN KEY ("toModelId") REFERENCES "saas_data_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_data_relations" ADD CONSTRAINT "saas_data_relations_fromFieldId_fkey" FOREIGN KEY ("fromFieldId") REFERENCES "saas_data_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_data_relations" ADD CONSTRAINT "saas_data_relations_toFieldId_fkey" FOREIGN KEY ("toFieldId") REFERENCES "saas_data_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
