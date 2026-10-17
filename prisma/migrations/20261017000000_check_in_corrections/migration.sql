-- AlterTable
ALTER TABLE "check_ins" ADD COLUMN     "corrected_by_id" UUID;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_corrected_by_id_fkey" FOREIGN KEY ("corrected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
