import type { Middleware } from "@wsvaio/utils";
import { compose } from "@wsvaio/utils";
import { reactive } from "vue";
export const defaultKey = Symbol("defaultKey");

export default <T extends object>(obj: T) => {
  const state = reactive<{ [K in keyof T]?: string }>({});
  const map = new Map<string | number | symbol, Set<Middleware<any>>>();
  const use = <K extends keyof T>(...keys: K[]) => (...middlewares: Middleware<{ key: K; value: T[K] }>[]) => {
    if (keys.length <= 0) keys = [defaultKey] as K[];
    keys.forEach((key) => {
      let set = map.get(key);
      set || map.set(key, set = new Set());
      middlewares.forEach(middleware => set?.add(middleware));
    });
  };

  const unuse = <K extends keyof T>(...keys: K[]) => (...middlewares: Middleware<{ key: K; value: T[K] }>[]) => {
    if (keys.length <= 0) keys = [defaultKey] as K[];
    keys.forEach((key) => {
      let set = map.get(key);
      if (!set) return;
      middlewares.forEach(middleware => set?.delete(middleware));
      if (set.size <= 0) map.delete(key);
    });
  };
  const clear = (...keys: (keyof T)[]) => {
    if (keys.length <= 0) keys = [defaultKey, ...Object.keys(state)] as (keyof T)[];
    keys.forEach(key => map.delete(key));
  };
  const clearValidate = (...keys: (keyof T)[]) => {
    if (keys.length <= 0) keys = Object.keys(state) as (keyof T)[];
    keys.forEach(key => delete state[key]);
  };

  const validate = async (...keys: (keyof T)[]) => {
    if (keys.length <= 0) keys = Object.keys(state) as (keyof T)[];
    for (const key of keys) {
      const set = map.get(key) || [];
      const defaults = map.get(defaultKey) || [];
      clearValidate(key);
      await compose(...defaults, ...set)({ key, value: obj[key] }).catch((err) => {
        state[key] = err?.message || err;
        console.warn(key, state[key]);
      });
    }
    if (keys.some(key => state[key])) throw new Error("验证失败");
  };

  const verify = (key: keyof T) => {
    // obj[key] === undefined && (obj[key] = undefined);
    // @ts-expect-error pass
    state[key] ||= "";
    return state[key];
  };

  return {
    verify,
    validate,
    use,
    unuse,
    clear,
    clearValidate,
  };
};
