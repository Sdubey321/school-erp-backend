-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "roomNo" TEXT;

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "department" TEXT;

-- AddForeignKey
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
