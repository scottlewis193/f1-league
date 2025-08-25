import { g } from "../chunks/event.js";
import { redirect } from "@sveltejs/kit";
import { f } from "../chunks/form.js";
import { q } from "../chunks/query.js";
import { getNextRace } from "./pkzxfy.js";
import "../chunks/event-state.js";
import "../chunks/false.js";
import "../chunks/paths.js";
import "puppeteer";
const getPredictions = q(async () => {
  const event = g();
  const pb = event.locals.pb;
  const submissions = await pb.collection("predictions").getFullList({ expand: "user,race" });
  return submissions;
});
const getNextRacePredictions = q(async () => {
  const event = g();
  const pb = event.locals.pb;
  const race = (await getNextRace()).id;
  const submissions = await pb.collection("predictions").getFullList({ expand: "user,race", filter: `race='${race}'` });
  return submissions;
});
const getUserPredictions = q(async (raceId = "") => {
  const event = g();
  const pb = event.locals.pb;
  const user = pb.authStore.record?.id;
  const submissions = await pb.collection("predictions").getFullList({ expand: "user,race", filter: `user="${user}" && race='${raceId}'` });
  return submissions;
});
const addUpdatePrediction = f(async (data) => {
  const event = g();
  const pb = event.locals.pb;
  const predictions = [data.get("driver-1st"), data.get("driver-2nd"), data.get("driver-3rd")];
  const user = pb.authStore.record?.id;
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const race = data.get("race-id");
  const id = data.get("id")?.toString() || "";
  if (id !== "") {
    pb.collection("predictions").update(id, { predictions });
  } else {
    pb.collection("predictions").create({ predictions, user, year, race });
  }
  redirect(303, `/predictions`);
});
for (const [name, fn] of Object.entries({ addUpdatePrediction, getNextRacePredictions, getPredictions, getUserPredictions })) {
  fn.__.id = "lrcjri/" + name;
  fn.__.name = name;
}
export {
  addUpdatePrediction,
  getNextRacePredictions,
  getPredictions,
  getUserPredictions
};
