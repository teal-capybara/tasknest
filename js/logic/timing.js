/* ==========================================================================
   COMPLETION TIMING: was a finished task early, on time, or late?

   Worked out from two stored timestamps: completedAt and the CURRENT deadline
   (dueAt). Nothing extra is stored, so it always matches the data.

     early    finished at least "earlyHours" (default 24h) before the deadline
     on time  finished before the deadline, but inside that last stretch
     late     finished after the deadline

   LIMITS (important when reading reports later):
   - If the deadline was moved after the task was finished, the result uses the
     new deadline.
   - "Early" says when it was FINISHED, not when work STARTED.
   ========================================================================== */

export function completionTiming(task, earlyHours) {
  if (task.status !== "done" || task.completedAt == null) return null;
  if (task.dueAt == null) return { key: "nodeadline", label: "Done (no deadline)", detail: "" };

  const diff = task.dueAt - task.completedAt; // positive = finished before the deadline
  if (diff < 0) return { key: "late", label: "Completed late", detail: `${describeSpan(-diff)} after the deadline` };
  if (diff >= earlyHours * 3600 * 1000) return { key: "early", label: "Completed early", detail: `${describeSpan(diff)} before the deadline` };
  return { key: "ontime", label: "Completed on time", detail: `${describeSpan(diff)} before the deadline` };
}

/** "3 days", "5 hours", "12 minutes" (rounded to the largest sensible unit). */
export function describeSpan(ms) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `${days} days`;
}
