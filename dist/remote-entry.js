import { c } from "./chunks/command.js";
import { f } from "./chunks/form.js";
import { error, json } from "@sveltejs/kit";
import { D } from "./chunks/false.js";
import { g } from "./chunks/event.js";
import { g as g$1, a, b as b$1, s } from "./chunks/event-state.js";
import { b, c as c$1 } from "./chunks/paths.js";
import { c as c2, g as g$2, p, r } from "./chunks/query.js";
import { q } from "./chunks/query.js";
// @__NO_SIDE_EFFECTS__
function prerender(validate_or_fn, fn_or_options, maybe_options) {
  const maybe_fn = typeof fn_or_options === "function" ? fn_or_options : void 0;
  const options = maybe_options ?? (maybe_fn ? void 0 : fn_or_options);
  const fn = maybe_fn ?? validate_or_fn;
  const validate = c2(validate_or_fn, maybe_fn);
  const __ = {
    type: "prerender",
    id: "",
    name: "",
    has_arg: !!maybe_fn,
    inputs: options?.inputs,
    dynamic: options?.dynamic
  };
  const wrapper = (arg) => {
    const promise = (async () => {
      const event = g();
      const state = g$1(event);
      const payload = a(arg, state.transport);
      const id = __.id;
      const url = `${b}/${c$1}/remote/${id}${payload ? `/${payload}` : ""}`;
      if (!state.prerendering && !D && !event.isRemoteRequest) {
        try {
          return await g$2(id, arg, event, async () => {
            const response = await fetch(new URL(url, event.url.origin).href);
            if (!response.ok) {
              throw new Error("Prerendered response not found");
            }
            const prerendered = await response.json();
            if (prerendered.type === "error") {
              error(prerendered.status, prerendered.error);
            }
            (state.remote_data ??= {})[b$1(id, payload)] = prerendered.result;
            return p(prerendered.result, state.transport);
          });
        } catch {
        }
      }
      if (state.prerendering?.remote_responses.has(url)) {
        return (
          /** @type {Promise<any>} */
          state.prerendering.remote_responses.get(url)
        );
      }
      const promise2 = g$2(
        id,
        arg,
        event,
        () => r(event, false, arg, validate, fn)
      );
      if (state.prerendering) {
        state.prerendering.remote_responses.set(url, promise2);
      }
      const result = await promise2;
      if (state.prerendering) {
        const body = { type: "result", result: s(result, state.transport) };
        state.prerendering.dependencies.set(url, {
          body: JSON.stringify(body),
          response: json(body)
        });
      }
      return result;
    })();
    promise.catch(() => {
    });
    return (
      /** @type {RemoteResource<Output>} */
      promise
    );
  };
  Object.defineProperty(wrapper, "__", { value: __ });
  return wrapper;
}
export {
  c as command,
  f as form,
  prerender,
  q as query
};
