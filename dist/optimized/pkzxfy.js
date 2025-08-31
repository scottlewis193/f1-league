import { g } from "../chunks/event.js";
import "@sveltejs/kit";
import { q } from "../chunks/query.js";
import "puppeteer";
import "../chunks/event-state.js";
import "../chunks/form.js";
import "../chunks/false.js";
import "../chunks/paths.js";
const getF1Schedule = q(async () => {
  const event = g();
  const pb = event.locals.pb;
  let races = await pb.collection("races").getFullList();
  return races;
});
const getNextRace = q(async () => {
  const event = g();
  const pb = event.locals.pb;
  let races = await pb.collection("races").getFullList();
  const currentDate = Date.now();
  races = races.sort(
    (a, b) => Date.parse(
      a.sessions[a.sessions.length - 1].date + " " + new Date(currentDate).getFullYear() + " " + a.sessions[a.sessions.length - 1].time
    ) - Date.parse(
      b.sessions[a.sessions.length - 1].date + " " + new Date(currentDate).getFullYear() + " " + b.sessions[b.sessions.length - 1].time
    )
  );
  for (const race of races) {
    const fullRaceDate = Date.parse(
      race.sessions[race.sessions.length - 1].date + " " + new Date(currentDate).getFullYear() + " " + race.sessions[race.sessions.length - 1].time
    );
    if (fullRaceDate > currentDate) {
      return race;
    }
  }
  return races[0];
});
const getRaces = q(async () => {
  const event = g();
  const pb = event.locals.pb;
  const races = await pb.collection("races").getFullList();
  return races;
});
for (const [name, fn] of Object.entries({ getF1Schedule, getNextRace, getRaces })) {
  fn.__.id = "pkzxfy/" + name;
  fn.__.name = name;
}
export {
  getF1Schedule,
  getNextRace,
  getRaces
};
