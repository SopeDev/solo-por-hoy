import { statusOf } from "@/lib/check-ins";
import { weekdayInitial, type DayKey } from "@/lib/days";
import { cn } from "@/lib/cn";

type Member = { id: string; name: string; isMe: boolean; joinedDay: DayKey; answers: ReadonlyMap<DayKey, boolean>; corrected?: ReadonlySet<DayKey> };

const STATUS_DOT = {
  clean: "bg-clean",
  relapsed: "bg-relapse",
  silent: "border border-silent/60",
};

/**
 * The last days for everyone in the group. Today stays private until it closes: others only see whether someone
 * already answered, the same way the morning report is when answers come out.
 */
export function GroupWeek({ members, days, today }: { members: Member[]; days: DayKey[]; today: DayKey }) {
  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="w-24 text-left font-normal">
              <span className="sr-only">Persona</span>
            </th>
            {days.map((day) => (
              <th className={cn("font-normal", day === today && "text-primary")} key={day} scope="col">
                {day === today ? "Hoy" : weekdayInitial(day)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <th className="truncate text-left font-medium" scope="row">
                {member.isMe ? "Tú" : member.name}
              </th>
              {days.map((day) => {
                const answer = member.answers.get(day);
                let dot: string;
                let label: string;
                if (day < member.joinedDay) {
                  dot = "";
                  label = "Aún no estaba";
                } else if (day === today && !member.isMe) {
                  dot = answer === undefined ? STATUS_DOT.silent : "bg-foreground/70";
                  label = answer === undefined ? "Aún no responde" : "Ya respondió";
                } else {
                  const status = statusOf(answer);
                  dot = STATUS_DOT[status];
                  label = { clean: "Se mantuvo", relapsed: "Recayó", silent: "No respondió" }[status];
                  if (member.corrected?.has(day)) label += " (corregido)";
                }
                return (
                  <td className="text-center" key={day}>
                    <span aria-label={label} className={cn("mx-auto block size-4 rounded-full", dot)} role="img" title={label} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-clean" /> Se mantuvo</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-relapse" /> Recayó</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border border-silent/60" /> Sin respuesta</span>
      </p>
    </div>
  );
}
