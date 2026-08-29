import { cn } from "@/lib/utils";
import { markAttendance } from "@/app/actions/attendance";

export function AttendanceCell({
  registrationId,
  dayNumber,
  courseId,
  status,
}: {
  registrationId: string;
  dayNumber: number;
  courseId: string;
  status: "PRESENT" | "ABSENT" | null;
}) {
  const bound = markAttendance.bind(null, registrationId, dayNumber, courseId);

  return (
    <div className="flex overflow-hidden rounded-lg border border-border">
      <form action={bound}>
        <input type="hidden" name="status" value="PRESENT" />
        <button
          type="submit"
          className={cn(
            "px-2.5 py-1.5 text-xs font-semibold transition-colors",
            status === "PRESENT" ? "bg-success text-white" : "bg-surface text-muted hover:bg-muted-surface"
          )}
        >
          حاضر
        </button>
      </form>
      <form action={bound}>
        <input type="hidden" name="status" value="ABSENT" />
        <button
          type="submit"
          className={cn(
            "border-s border-border px-2.5 py-1.5 text-xs font-semibold transition-colors",
            status === "ABSENT" ? "bg-danger text-white" : "bg-surface text-muted hover:bg-muted-surface"
          )}
        >
          غائب
        </button>
      </form>
    </div>
  );
}
