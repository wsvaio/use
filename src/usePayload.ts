import type { DeepPartial, Middleware } from "@wsvaio/utils";
import { compose, merge } from "@wsvaio/utils";
import { inject, reactive } from "vue";
export type Key = string | number | symbol;

export const injectKey = Symbol("injectKey");
export const defaultKey = Symbol("defaultKey");

export type Payload<Initial extends object = {}> = {
  $name: string;
  $loading: boolean;
  $actions: Map<Middleware<Payload>, Set<Key>>;
  $enumerable: () => void;
  $action: () => Promise<void>;
  $use: (...names: string[]) => (...middlewares: Middleware<Payload>[]) => void;
  $unuse: (...names: string[]) => (...middlewares: Middleware<Payload>[]) => void;
  $clear: () => void;
} & Initial;

export const usePayload = <Initial extends object>(
  initial = { } as Initial,
  injectable = false,
) => {
  if (injectable) {
    const injected = inject<Payload<Initial>>(injectKey);
    if (injected) return injected;
  }
  const payload = reactive<Payload<Initial>>({
    ...initial,
    $name: "",
    $loading: false,
    $actions: new Map<Middleware<Payload>, Set<Key>>(),
    $enumerable: () => {
      Object.keys(payload)
        .filter(item => item.startsWith("$"))
        .forEach(item => Object.defineProperty(payload, item, { enumerable: false }));
    },
    $action: async (options?: string | DeepPartial<Payload>) => {
      if (options instanceof Object) merge(payload, options);
      else if (options != undefined) payload.$name = options;
      const composes: Middleware<Payload>[] = [];
      for (const [k, v] of payload.$actions)
        (v.has(payload.$name) || v.has(defaultKey)) && composes.push(k);
      payload.$loading = true;
      await compose(...composes)(payload).finally(() => (payload.$loading = false));
    },
    $use:
      (...names) =>
        (...middlewares) => {
          names.length <= 0 && (names = [defaultKey as any]);
          names.forEach((name) => {
            middlewares.forEach((middleware) => {
              let set = payload.$actions.get(middleware);
              if (!set) payload.$actions.set(middleware, (set = new Set()));
              set.add(name);
            });
          });
        },
    $unuse:
      (...names) =>
        (...middlewares) => {
          names.length <= 0 && (names = [defaultKey as any]);
          names.forEach((name) => {
            middlewares.forEach((middleware) => {
              let set = payload.$actions.get(middleware);
              if (!set) return;
              set.delete(name);
              if (set.size <= 0) payload.$actions.delete(middleware);
            });
          });
        },
    $clear: () => {
      merge(payload, { ...initial, $name: "", $loading: false } as DeepPartial<Payload>, {
        del: true,
      });
    },
  });

  payload.$enumerable();
  return payload;
};
