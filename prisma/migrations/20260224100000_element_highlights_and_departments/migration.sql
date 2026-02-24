-- AlterTable: Element - remove pageNumbers, add highlight fields and department FK
ALTER TABLE "elements" DROP COLUMN "page_numbers";
ALTER TABLE "elements" ADD COLUMN "highlight_page" INTEGER;
ALTER TABLE "elements" ADD COLUMN "highlight_text" TEXT;
ALTER TABLE "elements" ADD COLUMN "department_id" TEXT;

-- AddForeignKey
ALTER TABLE "elements" ADD CONSTRAINT "elements_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: RevisionMatch - remove detectedPages, add detectedPage and detectedHighlightText
ALTER TABLE "revision_matches" DROP COLUMN "detected_pages";
ALTER TABLE "revision_matches" ADD COLUMN "detected_page" INTEGER;
ALTER TABLE "revision_matches" ADD COLUMN "detected_highlight_text" TEXT;
