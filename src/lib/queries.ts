import "server-only";

import { BroadcastKind } from "@/generated/prisma/enums";
import { db } from "@/db/client";
import { displayName } from "./check-ins";
import { addDays, checkInDay, dateOfDay, dayOfDate, type DayKey } from "./days";
import { getAppTimeZone } from "./env";

export const USER_NAME_FIELDS = { name: true, email: true, nickname: true } as const;

/** For now a person belongs to at most one group. */
export function getMembership(userId: string) {
  return db.membership.findFirst({ where: { userId }, include: { group: true }, orderBy: { joinedAt: "asc" } });
}

/**
 * Yesterday can still be answered, if it wasn't, until the morning report about it goes out; after that the group
 * has already been told and the day is closed for good.
 */
export async function isYesterdayOpen(today: DayKey) {
  const report = await db.broadcast.findUnique({
    where: { kind_day: { kind: BroadcastKind.MORNING_REPORT, day: dateOfDay(addDays(today, -1)) } },
    select: { id: true },
  });
  return !report;
}

export function getCheckIn(userId: string, day: DayKey) {
  return db.checkIn.findUnique({ where: { userId_day: { userId, day: dateOfDay(day) } } });
}

/**
 * Whether the person may answer for `day` now: today until it closes (and change the answer), or yesterday while
 * it's still open and unanswered.
 */
export async function canAnswer(userId: string, day: DayKey, now = new Date()) {
  const today = checkInDay(now, getAppTimeZone());
  if (day === today) return true;
  if (day !== addDays(today, -1)) return false;
  const [open, existing] = await Promise.all([isYesterdayOpen(today), getCheckIn(userId, day)]);
  return open && !existing;
}

/** Notes can be written for today, and for yesterday once answered while it's still open. */
export async function canWriteNote(userId: string, day: DayKey, now = new Date()) {
  const today = checkInDay(now, getAppTimeZone());
  if (day === today) return true;
  return day === addDays(today, -1) && (await isYesterdayOpen(today));
}

export async function saveCheckIn(userId: string, day: DayKey, relapsed: boolean) {
  const date = dateOfDay(day);
  await db.checkIn.upsert({
    where: { userId_day: { userId, day: date } },
    create: { userId, day: date, relapsed },
    update: { relapsed },
  });
}

/** Members of the group, oldest first. */
export async function getGroupMembers(groupId: string) {
  const members = await db.membership.findMany({
    where: { groupId },
    orderBy: { joinedAt: "asc" },
    include: { user: { select: { id: true, ...USER_NAME_FIELDS } } },
  });
  return members.map((member) => ({ id: member.userId, name: displayName(member.user), joinedAt: member.joinedAt }));
}

/**
 * Everyone in the group with their full history (for the week grid and the group streak), recent notes, and what
 * the viewer already sent them today.
 */
export async function loadGroupHome(userId: string, groupId: string, today: DayKey) {
  const members = await db.membership.findMany({
    where: { groupId },
    orderBy: { joinedAt: "asc" },
    include: { user: { select: { id: true, ...USER_NAME_FIELDS } } },
  });
  const memberIds = members.map((member) => member.userId);
  const yesterday = addDays(today, -1);

  const [history, sentToday] = await Promise.all([
    // A check-in is a few bytes and a small group has a few hundred a year, so the whole history is cheap.
    db.checkIn.findMany({ where: { userId: { in: memberIds }, day: { lte: dateOfDay(today) } }, select: { userId: true, day: true, relapsed: true, note: true } }),
    db.signal.findMany({ where: { fromUserId: userId, day: dateOfDay(today), toUserId: { not: null } }, select: { kind: true, toUserId: true } }),
  ]);

  const answersByUser = new Map<string, Map<DayKey, boolean>>(memberIds.map((id) => [id, new Map()]));
  const notesByUser = new Map<string, { today?: string; yesterday?: string }>();
  for (const checkIn of history) {
    const day = dayOfDate(checkIn.day);
    answersByUser.get(checkIn.userId)!.set(day, checkIn.relapsed);
    if (!checkIn.note) continue;
    const notes = notesByUser.get(checkIn.userId) ?? {};
    // Others' notes for today stay private until the day closes, like their answers.
    if (day === yesterday) notes.yesterday = checkIn.note;
    if (day === today && checkIn.userId === userId) notes.today = checkIn.note;
    notesByUser.set(checkIn.userId, notes);
  }

  return {
    members: members.map((member) => ({
      id: member.userId,
      name: displayName(member.user),
      isMe: member.userId === userId,
      joinedDay: checkInDay(member.joinedAt, getAppTimeZone()),
      answers: answersByUser.get(member.userId)!,
      notes: notesByUser.get(member.userId) ?? {},
      cheered: sentToday.some((signal) => signal.kind === "CHEER" && signal.toUserId === member.userId),
      nudged: sentToday.some((signal) => signal.kind === "NUDGE" && signal.toUserId === member.userId),
    })),
    myAnswers: answersByUser.get(userId) ?? new Map<DayKey, boolean>(),
  };
}
