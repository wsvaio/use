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
  $action: (...options: (DeepPartial<Payload<Initial>> | string)[]) => Promise<void>;
  $use: (...names: string[]) => (...middlewares: Middleware<Payload<Initial>>[]) => void;
  $unuse: (...names: string[]) => (...middlewares: Middleware<Payload<Initial>>[]) => void;
  $clear: (...keys: (keyof Initial)[]) => void;
} & Initial;

const wrapper
  = <T extends object>(type: "use" | "unuse") =>
    (...maps: Map<Middleware<Payload>, Set<string>>[]) =>
      (...names: string[]) =>
        (...middlewares: Middleware<Payload<T>>[]) => {
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

export const usePayload = <
  T extends object,
  Initial extends object = Omit<T, "injectable" | "provideable">,
>(
    initial = {} as T & { injectable?: boolean; provideable?: boolean },
  ): UnwrapNestedRefs<Payload<Initial>> => {
  let payload: UnwrapNestedRefs<Payload<Initial>>;
  const { injectable, provideable } = pick(initial, ["injectable", "provideable"], true);
  const actions = new Map<Middleware<Payload>, Set<string>>();
  if (injectable) {
    payload = inject<UnwrapNestedRefs<Payload<Initial>>>(injectKey);
    if (!payload) throw new Error("usePayload: 接收依赖失败，请确保父级组件注入依赖");
  }
  else {
    payload = reactive({
      ...(merge({}, initial, { deep: Infinity }) as Initial),
      $loading: false,
      $actions: new Map<Middleware<Payload>, Set<string>>(),
      $enumerable: () => {
        Object.keys(payload)
          .filter(item => item.startsWith("$"))
          .forEach(item => Object.defineProperty(payload, item, { enumerable: false }));
      },

      $action: async (...options) => {
        let names = options.filter(item => typeof item === "string") as string[];
        let opts = options.filter(item => typeof item !== "string") as DeepPartial<
          Payload<Initial>
        >[];
        names.length <= 0 && (names = [defaultKey as any]);
        const c = compose<Payload>();
        for (const [k, v] of payload.$actions) names.some(name => v.has(name)) && c(k);
        opts.forEach(opt => merge(payload, opt));
        await c(payload);
      },

      $clear: (...keys: (keyof Initial)[]) => {
        keys.length <= 0
          && (keys = Object.keys(initial).filter(key => !key.startsWith("$")) as any);
        keys.forEach((key: any) => {
          if (payload[key] instanceof Object)
            merge(payload[key], initial[key], { deep: Infinity, del: true });
          else payload[key] = initial[key];
        });
      },
    } as Payload<Initial>);
  }

  merge(payload, {
    $use: wrapper<Initial>("use")(payload.$actions, actions),
    $unuse: wrapper<Initial>("unuse")(payload.$actions, actions),
  });
  payload.$enumerable();

  if (provideable && !injectable) provide(injectKey, payload);

  onBeforeUnmount(() => {
    for (const [action, set] of actions) payload.$unuse(...set)(action);
  });

  return payload;
};
