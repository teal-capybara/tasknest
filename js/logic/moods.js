/* ==========================================================================
   MOODS: how you felt on a day (chosen in the day window, next to the diary).

   The "id" is what gets saved. Never change an existing id (change the label
   instead). The mood is private, like the diary: it is saved inside that day's
   diary entry and is only shown in that day's window.
   ========================================================================== */

export const MOODS = [
  { id: "ecstatic",   emoji: "🤩", label: "Ecstatic" },
  { id: "happy",      emoji: "😄", label: "Happy" },
  { id: "confident",  emoji: "😎", label: "Confident" },
  { id: "grateful",   emoji: "🥰", label: "Grateful" },
  { id: "calm",       emoji: "😌", label: "Calm" },
  { id: "okay",       emoji: "🙂", label: "Okay" },
  { id: "tired",      emoji: "🥱", label: "Tired" },
  { id: "anxious",    emoji: "😰", label: "Anxious" },
  { id: "stressed",   emoji: "😣", label: "Stressed" },
  { id: "sad",        emoji: "😢", label: "Sad" },
  { id: "depressed",  emoji: "😞", label: "Depressed" },
  { id: "angry",      emoji: "😠", label: "Angry" },
];

export const moodById = (id) => MOODS.find((m) => m.id === id) || null;
