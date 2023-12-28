import type { DeepKeys, DeepPartial } from "@wsvaio/utils";
import { deepPick, merge, pick } from "@wsvaio/utils";
import { computed, inject, onUnmounted, provide, reactive } from "vue";

export const usePloadKey = Symbol("usePloadKey");

export type Pload<T extends Record<any, any> = Record<any, any>> = {
  $initials: Set<object>;
  $initial: Record<any, any>;
  $reset: (...keys: DeepKeys<T>[] | string[]) => void;
  $assign: (...options: (DeepPartial<T> & Record<any, any>)[]) => Pload<T>;
} & T &
Record<any, any>;

/**
 * Pload Hook
 * 用于在 Vue 组件之间共享状态和实现组件通信
 *
 * @param initial 初始化数据
 * @param initial.$mode 模式
 * @param initial.$key key
 * @returns Pload 实例
 */
export function usePload<Initial extends object>(
  initial: (Initial & { $mode?: "provide" | "provide" | "auto" | ""; $key?: string | symbol }) &
  Record<any, any> = {} as Record<any, any>
): Pload<Omit<Initial, "$mode" | "$key">> {
  /**
   * 模式和键名
   */
  let { $mode, $key = usePloadKey } = pick(initial, ["$mode", "$key"], true);

  let pload: Pload<Initial>;

  /**
   * 注入模式
   */
  if ($mode == "inject" || $mode == "auto") {
    pload = inject<Pload<Initial>>($key);
    if (pload) {
      merge(pload, initial, { deep: Number.POSITIVE_INFINITY });
      $mode = "inject";
    }
    else if ($mode == "inject") {
      throw new Error(`usePload({ key: ${String($key)} }): 注入依赖失败,请确保父级组件提供了依赖。`);
    }
  }
  if ($mode != "inject") {
    pload = reactive({
      ...(merge({}, initial, { deep: Number.POSITIVE_INFINITY }) as Initial),
      /**
       * 初始值集合
       */
      $initials: new Set(),
      $initial: computed(() => {
        const initial: Record<any, any> = {};
        pload.$initials.forEach(item => merge(initial, item, { deep: Number.POSITIVE_INFINITY }));
        return initial;
      }),

      $assign: (...options) => {
        options.forEach(option => {
          merge(pload, option, { deep: Number.POSITIVE_INFINITY });
        });
        return pload;
      },

      /**
       * 重置指定键的值
       */
      $reset: (...keys) =>
        merge(
          // @ts-expect-error pass
          keys.length ? deepPick(pload, ...keys) : pload,
          // @ts-expect-error pass
          keys.length ? deepPick(pload.$initial, ...keys) : pload.$initial,
          {
            deep: Number.POSITIVE_INFINITY,
            del: true,
          }
        ),
    } as Pload<Initial>);

    // 不可枚举
    ["$initials", "$assign", "$reset", "$initial"].forEach(key => {
      Object.defineProperty(pload, key, { enumerable: false });
    });
  }

  pload.$initials.add(initial);

  onUnmounted(() => {
    const uniqueInitialKeys = Object.keys(initial).filter(item =>
      [...pload.$initials].every(sub => !Object.keys(sub).includes(item))
    );
    uniqueInitialKeys.forEach(item => delete pload[item]);
    pload.$initials.delete(initial);
  });

  if ($mode == "provide")
    provide($key, pload);

  return pload as Pload<Omit<Initial, "$mode" | "$key">>;
}
