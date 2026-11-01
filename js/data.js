/* ==========================================================================
   DATA: starts all the database listeners after sign-in.

   Five listeners keep js/state.js up to date:
     courses, taskTypes (your custom ones), tasks, events, settings
   Each one first delivers the copy stored on this device (instant, works
   offline), then updates when the cloud changes.

   Screens never talk to the database to READ; they read from state.js.
   ========================================================================== */

import { state, setState, setReady, resetState } from "./state.js";
import { watchCollection } from "./db/helpers.js";
import { watchCourses } from "./db/courses.js";
import { watchTaskTypes } from "./db/taskTypes.js";
import { watchSettings } from "./db/settings.js";
import { watchEvents } from "./db/events.js";
import { applyTheme, currentTheme, isValidTheme } from "./theme.js";

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/** Returns a function that stops everything and clears the in-memory data. */
export function startData(fb, uid) {
  setState({ fb, uid });

  const stops = [
    watchCourses(fb, uid, (courses) => {
      setReady("courses");
      setState({ courses: courses.sort(byName) });
    }),
    watchTaskTypes(fb, uid, (types) => {
      setReady("types");
      setState({ customTypes: types.sort(byName) });
    }),
    watchCollection(fb, uid, "tasks", (tasks) => {
      setReady("tasks");
      setState({ tasks });
    }),
    watchEvents(fb, uid, (events) => {
      setReady("events");
      setState({ events });
    }),
    watchSettings(fb, uid, (settings) => {
      setReady("settings");
      // Follow the cloud theme only if one was saved; otherwise keep the local choice.
      if (isValidTheme(settings.theme) && settings.theme !== currentTheme()) applyTheme(settings.theme);
      setState({ settings });
    }),
  ];

  return function stopData() {
    stops.forEach((stop) => stop());
    resetState();
  };
}

export { state };
