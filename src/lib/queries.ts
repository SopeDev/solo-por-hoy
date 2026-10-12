import "server-only";

import { db } from "@/db/client";
import { displayName } from "./check-ins";
import { addDays, checkInDay, dateOfDay, dayOfDate, type DayKey } from "./days";
import { getAppTimeZone } from "./env";

/** For now a person belongs to at most one group. */
export function getMembership(userId: string) {
  return db.membership.findFirst({ where: { userId }, include: { group: true }, orderBy: { joinedAt: "asc" } });
}

export async function saveCheckIn(userId: string, day: DayKey, relapsed: boolean) {
  const date = dateOfDay(day);
  await db.checkIn.upsert({
    where: { userId_day: { userId, day: date } },
    create: { userId, day: date, relapsed },
    update: { relapsed },
  });
}

/** Everyone in the group with their answers over the `days` days ending today, and the viewer's full history. */
export async function loadGroupHome(userId: string, groupId: string, today: DayKey, days: number) {
  const members = await db.membership.findMany({
    where: { groupId },
    orderBy: { joinedAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const memberIds = members.map((member) => member.userId);

  const [recent, mine] = await Promise.all([
    db.checkIn.findMany({
      where: { userId: { in: memberIds }, day: { gte: dateOfDay(addDays(today, -(days - 1))), lte: dateOfDay(today) } },
      select: { userId: true, day: true, relapsed: true },
    }),
    db.checkIn.findMany({ where: { userId }, select: { day: true, relapsed: true } }),
  ]);

  const answersByUser = new Map<string, Map<DayKey, boolean>>(memberIds.map((id) => [id, new Map()]));
  for (const checkIn of recent) answersByUser.get(checkIn.userId)!.set(dayOfDate(checkIn.day), checkIn.relapsed);

  return {
    members: members.map((member) => ({
      id: member.userId,
      name: displayName(member.user),
      isMe: member.userId === userId,
      joinedDay: checkInDay(member.joinedAt, getAppTimeZone()),
      answers: answersByUser.get(member.userId)!,
    })),
    myAnswers: new Map(mine.map((checkIn) => [dayOfDate(checkIn.day), checkIn.relapsed])),
  };
}
