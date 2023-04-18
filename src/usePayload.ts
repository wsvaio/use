import type { DeepPartial, Middleware } from "@wsvaio/utils";
import { compose, merge } from "@wsvaio/utils";
import type { UnwrapNestedRefs } from "vue";
import { inject, onBeforeUnmount, provide, reactive } from "vue";
export type Key = string | number | symbol;

export const injectKey = Symbol("injectKey");
export const defaultKey = Symbol("defaultKey");

export type Payload<Initial extends object = {}> = {
  $loading: boolean;
  $actions: Map<Middleware<Payload<Initial>>, Set<Key>>;
  $enumerable: () => void;
  $action: (...names: string[]) => (...options: DeepPartial<Payload<Initial>>[]) => Promise<void>;
  $use: (...names: string[]) => (...middlewares: Middleware<Payload<Initial>>[]) => void;
  $unuse: (...names: string[]) => (...middlewares: Middleware<Payload<Initial>>[]) => void;
  $clear: () => void;
} & Initial;

export const usePayload = <Initial extends object>(initial = {} as Initial, options = {} as { injectable?: boolean; provideable?: boolean }) => {
  let payload: UnwrapNestedRefs<Payload<Initial>>;
  if (options.injectable)
    payload = inject<UnwrapNestedRefs<Payload<Initial>>>(injectKey);

  if (!options.injectable || !payload) {
    payload = reactive<Payload<Initial>>({
      ...(merge({}, initial, { deep: Infinity }) as Initial),
      $loading: false,
      $actions: new Map<Middleware<Payload>, Set<Key>>(),
      $enumerable: () => {
        Object.keys(payload)
          .filter(item => item.startsWith("$"))
          .forEach(item => Object.defineProperty(payload, item, { enumerable: false }));
      },

      $action: (...names) => async (...options) => {
        names.length <= 0 && (names = [defaultKey as any]);
        const c = compose<Payload>();
        for (const [k, v] of payload.$actions)
          names.some(name => v.has(name)) && c(k);

        options.forEach(option => merge(payload, option));
        await c(payload);
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
        merge(payload, merge({}, initial, { deep: Infinity }), { del: true });
        merge(payload, { $loading: false });
      },
    });
    payload.$enumerable();
    if (options.provideable)
      provide(injectKey, payload);
  }

  onBeforeUnmount(() => payload.$actions.clear());
  return payload;
};
