import { a } from "../chunks/event-state.js";
import "@sveltejs/kit";
import { q } from "../chunks/query.js";
import "../chunks/form.js";
import "../chunks/false.js";
import "../chunks/paths.js";
const getPlayers = q(async () => {
  const event = a();
  const pb = event.locals.pb;
  const players = await pb.collection("users").getFullList();
  return players;
});
for (const [name, fn] of Object.entries({ getPlayers })) {
  fn.__.id = "11feve0/" + name;
  fn.__.name = name;
}
export {
  getPlayers
};
