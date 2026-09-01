-- CreateTable
CREATE TABLE "saas_data_records" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_data_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saas_data_records_modelId_idx" ON "saas_data_records"("modelId");

-- CreateIndex
CREATE INDEX "saas_data_records_createdAt_idx" ON "saas_data_records"("createdAt");

-- CreateIndex
CREATE INDEX "saas_data_records_updatedAt_idx" ON "saas_data_records"("updatedAt");

-- AddForeignKey
ALTER TABLE "saas_data_records" ADD CONSTRAINT "saas_data_records_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "saas_data_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_data_records" ADD CONSTRAINT "saas_data_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "saas_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_data_records" ADD CONSTRAINT "saas_data_records_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "saas_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
