import type { DeepKeys, DeepPartial } from "@wsvaio/utils";
import { deepPick, merge, pick } from "@wsvaio/utils";
import type { UnwrapNestedRefs } from "vue";
import { computed, inject, onUnmounted, provide, reactive } from "vue";

export const usePloadKey = Symbol("usePloadKey");

export type Payload<T extends Record<any, any> = Record<any, any>> = {
  $initials: Set<object>;
  $initial: Record<any, any>;
  $reset: (...keys: DeepKeys<T>[] | string[]) => void;
  $assign: (...options: (DeepPartial<T> & Record<any, any>)[]) => Payload<T>;
} & T &
Record<any, any>;

/**
 * Payload Hook
 * 用于在 Vue 组件之间共享状态和实现组件通信
 */
export function usePload<Initial extends object>(initial = {} as (Initial & { $mode?: "provide"; $key?: string | symbol }) & Record<any, any>): UnwrapNestedRefs<Payload<Omit<Initial, "$mode" | "$key">>> {
  /**
   * 模式和键名
   */
  let { $mode, $key = usePloadKey } = pick(initial, ["$mode", "$key"], true) as {
    $mode?: "" | "inject" | "provide" | "auto";
    $key?: string | symbol;
  };

  let payload: UnwrapNestedRefs<Payload<Initial>>;

  /**
   * 注入模式
   */
  if ($mode == "inject" || $mode == "auto") {
    payload = inject<UnwrapNestedRefs<Payload<Initial>>>($key);
    if (payload) {
      merge(payload, initial, { deep: Number.POSITIVE_INFINITY });
      $mode = "inject";
    }
    else if ($mode == "inject") {
      throw new Error(`usePload({ key: ${String($key)} }): 注入依赖失败,请确保父级组件提供了依赖。`);
    }
  }
  if ($mode != "inject") {
    payload = reactive({
      ...(merge({}, initial, { deep: Number.POSITIVE_INFINITY }) as Initial),
      /**
       * 初始值集合
       */
      $initials: new Set(),
      $initial: computed(() => {
        const initial: Record<any, any> = {};
        payload.$initials.forEach(item => merge(initial, item, { deep: Number.POSITIVE_INFINITY }));
        return initial;
      }),

      $assign: (...options) => {
        options.forEach(option => {
          merge(payload, option, { deep: Number.POSITIVE_INFINITY });
        });
        return payload;
      },

      /**
       * 重置指定键的值
       */
      $reset: (...keys) =>
        merge(
          // @ts-expect-error pass
          keys.length ? deepPick(payload, ...keys) : payload,
          // @ts-expect-error pass
          keys.length ? deepPick(payload.$initial, ...keys) : payload.$initial,
          {
            deep: Number.POSITIVE_INFINITY,
            del: true,
          }
        ),
    } as Payload<Initial>);

    // 不可枚举
    ["$initials", "$assign", "$reset", "$initial"].forEach(key => {
      Object.defineProperty(payload, key, { enumerable: false });
    });
  }

  payload.$initials.add(initial);

  onUnmounted(() => {
    const uniqueInitialKeys = Object.keys(initial).filter(item =>
      [...payload.$initials].every(sub => !Object.keys(sub).includes(item))
    );
    uniqueInitialKeys.forEach(item => delete payload[item]);
    payload.$initials.delete(initial);
  });

  if ($mode == "provide")
    provide($key, payload);

  return payload;
}
