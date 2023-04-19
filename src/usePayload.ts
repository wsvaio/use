import type { DeepPartial, Middleware } from "@wsvaio/utils";
import { compose, merge, pick } from "@wsvaio/utils";
import type { UnwrapNestedRefs } from "vue";
import { inject, onBeforeUnmount, provide, reactive } from "vue";

export const injectKey = Symbol("injectKey");
export const defaultKey = Symbol("defaultKey");

export type Payload<Initial extends object = {}> = {
  $loading: boolean;
  $actions: Map<Middleware<Payload<Initial>>, Set<string>>;
  $enumerable: () => void;
  $action: (...names: string[]) => (...options: DeepPartial<Payload<Initial>>[]) => Promise<void>;
  $use: (...names: string[]) => (...middlewares: Middleware<Payload<Initial>>[]) => void;
  $unuse: (...names: string[]) => (...middlewares: Middleware<Payload<Initial>>[]) => void;
  $clear: (...keys: (keyof Initial)[]) => void;
} & Initial;

const wrapper = <T extends object>(type: "use" | "unuse") => (...maps: Map<Middleware<Payload>, Set<string>>[]) => (...names: string[]) => (...middlewares: Middleware<Payload<T>>[]) => {
  names.length <= 0 && (names = [defaultKey as any]);
  maps.forEach((map) => {
    names.forEach((name) => {
      middlewares.forEach((middleware) => {
        if (type == "use") {
          let set = map.get(middleware);
          if (!set) map.set(middleware, (set = new Set()));
          set.add(name);
        }
        if (type == "unuse") {
          let set = map.get(middleware);
          if (!set) return;
          set.delete(name);
          if (set.size <= 0) map.delete(middleware);
        }
      });
    });
  });
};

export const usePayload = <Initial extends object>(initial = {} as Initial, options = {} as { injectable?: boolean; provideable?: boolean }): UnwrapNestedRefs<Payload<Initial>> => {
  let payload: UnwrapNestedRefs<Payload<Initial>>;
  const actions = new Map<Middleware<Payload>, Set<string>>();
  if (options.injectable)
    payload = inject<UnwrapNestedRefs<Payload<Initial>>>(injectKey);

  if (!options.injectable || !payload) {
    payload = reactive({
      ...(merge({}, initial, { deep: Infinity }) as Initial),
      $loading: false,
      $actions: new Map<Middleware<Payload>, Set<string>>(),
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

      $clear: (...keys: (keyof Initial)[]) => {
        const del = !keys.length;
        keys.length <= 0 && (keys = Object.keys(initial).filter(key => !key.startsWith("$")) as any);
        merge(payload, pick(initial, keys), { deep: Infinity, del });
      },
    } as Payload<Initial>);
  }

  merge(payload, {
    $use: wrapper<Initial>("use")(payload.$actions, actions),
    $unuse: wrapper<Initial>("unuse")(payload.$actions, actions),
  });
  payload.$enumerable();

  if (options.provideable && !options.injectable)
    provide(injectKey, payload);

  onBeforeUnmount(() => {
    for (const [action, set] of actions)
      payload.$unuse(...set)(action);
  });

  return payload;
};
