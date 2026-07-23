-- DropForeignKey
ALTER TABLE "homeworks" DROP CONSTRAINT "homeworks_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "homeworks" DROP CONSTRAINT "homeworks_teacherId_fkey";

-- AlterTable
ALTER TABLE "homeworks" ADD COLUMN     "sectionId" TEXT,
ADD COLUMN     "subjectName" TEXT,
ALTER COLUMN "subjectId" DROP NOT NULL,
ALTER COLUMN "teacherId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
