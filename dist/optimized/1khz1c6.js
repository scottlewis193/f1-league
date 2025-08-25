import { g } from "../chunks/event.js";
import "@sveltejs/kit";
import { q } from "../chunks/query.js";
import "puppeteer";
import "../chunks/event-state.js";
import "../chunks/form.js";
import "../chunks/false.js";
import "../chunks/paths.js";
const getTeams = q(async () => {
  const event = g();
  const pb = event.locals.pb;
  let teams = await pb.collection("teams").getFullList({ sort: "-points" });
  return teams;
});
for (const [name, fn] of Object.entries({ getTeams })) {
  fn.__.id = "1khz1c6/" + name;
  fn.__.name = name;
}
export {
  getTeams
};
