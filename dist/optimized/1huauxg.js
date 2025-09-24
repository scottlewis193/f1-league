import { g } from "../chunks/event.js";
import "@sveltejs/kit";
import { q } from "../chunks/query.js";
import { getNextRace } from "./pkzxfy.js";
import "../chunks/command.js";
import "../chunks/form.js";
import "../chunks/false.js";
import "../chunks/event-state.js";
import "../chunks/paths.js";
const getOdds = q(async () => {
  const event = g();
  const pb = event.locals.pb;
  let odds = await pb.collection("odds").getFullList({ expand: "driver,race" });
  return odds;
});
const getNextRaceOdds = q(async () => {
  const event = g();
  const pb = event.locals.pb;
  const race = (await getNextRace()).id;
  let odds = await pb.collection("odds").getFullList({ expand: "driver,race", filter: `race='${race}'` });
  return odds;
});
for (const [name, fn] of Object.entries({ getNextRaceOdds, getOdds })) {
  fn.__.id = "1huauxg/" + name;
  fn.__.name = name;
}
export {
  getNextRaceOdds,
  getOdds
};
