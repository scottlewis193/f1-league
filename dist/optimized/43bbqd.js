import { a } from "../chunks/event-state.js";
import "@sveltejs/kit";
import { q } from "../chunks/query.js";
import "puppeteer";
import "../chunks/form.js";
import "../chunks/false.js";
import "../chunks/paths.js";
const getDrivers = q(async () => {
  const event = a();
  const pb = event.locals.pb;
  let drivers = await pb.collection("drivers").getFullList({ sort: "-points" });
  return drivers;
});
for (const [name, fn] of Object.entries({ getDrivers })) {
  fn.__.id = "43bbqd/" + name;
  fn.__.name = name;
}
export {
  getDrivers
};
