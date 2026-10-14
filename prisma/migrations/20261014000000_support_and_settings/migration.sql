-- CreateEnum
CREATE TYPE "signal_kind" AS ENUM ('SOS', 'CHEER', 'NUDGE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "why" TEXT;

-- AlterTable
ALTER TABLE "check_ins" ADD COLUMN     "note" TEXT;

-- CreateTable
CREATE TABLE "signals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "signal_kind" NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID,
    "day" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signals_from_user_id_day_idx" ON "signals"("from_user_id", "day");

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
