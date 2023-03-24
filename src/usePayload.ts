import type { DeepPartial, Middleware } from "@wsvaio/utils";
import { compose, merge } from "@wsvaio/utils";
import { reactive } from "vue";
export type Key = string | number | symbol;

export interface BasePayload {
  $name: Key;
  $loading: boolean;
  [k: Key]: any;
}
export default <
  InitialPayload extends object,
  Payload extends InitialPayload & BasePayload = InitialPayload & BasePayload,
>(initialPayload = {} as InitialPayload) => {
  const payload = reactive({ ...initialPayload, $name: "", $loading: false }) as Payload;
  const actions = new Map<Middleware<Payload>, Set<Key>>();
  const defaultKey = Symbol("defaultKey");
  const enumerable = () =>
    Object.keys(payload)
      .filter(item => item.startsWith("$"))
      .forEach(item => Object.defineProperty(payload, item, { enumerable: false }));

  const action = async (payloadOptions?: Key | DeepPartial<Payload>) => {
    if (payloadOptions instanceof Object) merge(payload, payloadOptions);
    else if (payloadOptions != undefined) payload.$name = payloadOptions;
    const composes: Middleware<Payload>[] = [];
    for (const [k, v] of actions) (v.has(payload.$name) || v.has(defaultKey)) && composes.push(k);
    payload.$loading = true;
    await compose(...composes)(payload).finally(() => (payload.$loading = false));
  };

  const use
    = (...names: Key[]) =>
      (...middlewares: Middleware<Payload>[]) => {
        names.length <= 0 && (names = [defaultKey]);
        names.forEach((name) => {
          middlewares.forEach((middleware) => {
            let set = actions.get(middleware);
            if (!set) actions.set(middleware, (set = new Set()));
            set.add(name);
          });
        });
      };

  const unuse
    = (...names: Key[]) =>
      (...middlewares: Middleware<Payload>[]) => {
        names.length <= 0 && (names = [defaultKey]);
        names.forEach((name) => {
          middlewares.forEach((middleware) => {
            let set = actions.get(middleware);
            if (!set) return;
            set.delete(name);
            if (set.size <= 0) actions.delete(middleware);
          });
        });
      };

  const clear = () =>
    !!merge(payload, { ...initialPayload, $name: "", $loading: false } as DeepPartial<Payload>, {
      del: true,
    });

  enumerable();
  return {
    payload,
    actions,
    action,
    clear,
    use,
    unuse,
    enumerable,
  };
};
