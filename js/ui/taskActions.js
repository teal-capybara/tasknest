/* ==========================================================================
   TASK ACTIONS shared by the task card and the task detail page.
   Each one writes to the local copy straight away; the screen redraws from
   that, and the cloud upload happens in the background.
   ========================================================================== */

import { state } from "../state.js";
import { setTaskStatus, setTaskArchived, deleteTask } from "../db/tasks.js";
import { confirmDialog } from "./dialogs.js";
import { toast } from "./screens.js";

/** Inline status change (the dropdown on a card). Moves the task in the list automatically. */
export function changeStatus(task, status) {
  if (task.status !== status) setTaskStatus(state.fb, state.uid, task, status);
}

/** The round checkbox on a card: checked = Done. Unchecking returns it to where it was. */
export function toggleDone(task, checked) {
  if (checked) return changeStatus(task, "done");
  changeStatus(task, task.inProgressAt ? "in_progress" : "not_started");
}

export function toggleArchive(task) {
  const archive = !task.archived;
  setTaskArchived(state.fb, state.uid, task, archive);
  toast(archive ? "Task archived. Find it under Settings, Archived tasks." : "Task restored.");
}

/** Archive and delete are separate on purpose: delete is permanent. */
export async function deleteWithConfirm(task, onDone) {
  const ok = await confirmDialog({
    title: "Delete this task?",
    message: [
      `"${task.title}" will be permanently deleted, including its instructions, notes, status timestamps and deadline history. This cannot be undone.`,
      "If you only want it out of your way, archive it instead: it stays in your records and reports.",
    ],
    confirmLabel: "Delete permanently",
    danger: true,
  });
  if (!ok) return;
  deleteTask(state.fb, state.uid, task.id);
  toast("Task deleted.");
  if (onDone) onDone();
}
