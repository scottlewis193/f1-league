import { g } from "../chunks/event.js";
import { fail, redirect } from "@sveltejs/kit";
import { f } from "../chunks/form.js";
import { q } from "../chunks/query.js";
import "../chunks/event-state.js";
import "../chunks/false.js";
import "../chunks/paths.js";
const getPlayers = q(async () => {
  const event = g();
  const pb = event.locals.pb;
  const players = await pb.collection("users").getFullList();
  return players;
});
const getCurrentPlayer = q(async () => {
  const event = g();
  const pb = event.locals.pb;
  if (!event.locals.user?.id) return;
  const player = await pb.collection("users").getOne(event.locals.user?.id);
  return player;
});
const updatePlayerProfile = f(async (data) => {
  const event = g();
  const pb = event.locals.pb;
  const updateData = Object.fromEntries(data);
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === "") delete updateData[key];
  });
  if (!event.locals.user?.id) return;
  await pb.collection("users").update(event.locals.user?.id, updateData);
});
const login = f(async (data) => {
  const event = g();
  const pb = event.locals.pb;
  const { email, password } = Object.fromEntries(data);
  if (!email || !password) {
    return fail(400, { error: "Email and password are required" });
  }
  await pb.collection("users").authWithPassword(email.toString(), password.toString());
  if (!pb.authStore.isValid) {
    return fail(400, { error: "Invalid email or password" });
  }
  return redirect(303, `/`);
});
const logout = f(() => {
  const event = g();
  const pb = event.locals.pb;
  pb.authStore.clear();
  return redirect(303, `/login`);
});
const register = f(async (data) => {
  const event = g();
  const pb = event.locals.pb;
  const { name, email, password, passwordConfirm } = Object.fromEntries(data);
  console.log({ name, email, password, passwordConfirm });
  if (password !== passwordConfirm) {
    return fail(400, { error: "Passwords do not match" });
  }
  const user = await pb.collection("users").create({ name, email, password, passwordConfirm });
  console.log(user);
  return redirect(303, `/login`);
});
for (const [name, fn] of Object.entries({ getCurrentPlayer, getPlayers, login, logout, register, updatePlayerProfile })) {
  fn.__.id = "11feve0/" + name;
  fn.__.name = name;
}
export {
  getCurrentPlayer,
  getPlayers,
  login,
  logout,
  register,
  updatePlayerProfile
};
