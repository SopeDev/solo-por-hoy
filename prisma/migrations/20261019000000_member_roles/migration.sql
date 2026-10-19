-- CreateEnum
CREATE TYPE "member_role" AS ENUM ('PARTICIPANT', 'SUPPORTER');

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "participating_since" DATE,
ADD COLUMN     "role" "member_role" NOT NULL DEFAULT 'PARTICIPANT';
