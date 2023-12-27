import type { Middleware } from "@wsvaio/utils";
import { compose } from "@wsvaio/utils";
import { reactive } from "vue";

export const useVerifyKey = Symbol("useVerifyKey");
/**
 * 创建一个验证器，用于对对象的属性进行验证
 * @template T - 需要验证的对象的类型
 * @param obj - 需要验证的对象
 * @returns 验证器对象，包含验证方法和管理中间件的方法
 */

export function useVerify<T extends object>(obj: T) {
  /**
   * 保存验证结果的状态对象
   * @type {Record<keyof T, string>}
   */
  const state = reactive<{ [K in keyof T]?: string }>({});

  /**
   * 保存中间件的映射表
   * @type {Map<string | number | symbol, Set<Middleware<any>>>}
   */
  const map = new Map<string | number | symbol, Set<Middleware<any>>>();

  /**
   * 添加中间件到映射表中
   * @param keys - 需要添加中间件的属性名，不传则默认添加到所有属性上
   */
  const use
    = <K extends keyof T>(...keys: K[]) =>
      (...middlewares: Middleware<{ key: K; value: T[K] }>[]) => {
        if (keys.length <= 0)
          keys = [useVerifyKey] as K[];
        keys.forEach(key => {
          let set = map.get(key);
          set || map.set(key, (set = new Set()));
          middlewares.forEach(middleware => set?.add(middleware));
        });
      };

  /**
   * 从映射表中移除中间件
   * @param keys - 需要移除中间件的属性名，不传则默认移除所有属性上的中间件
   */
  const unuse
    = <K extends keyof T>(...keys: K[]) =>
      (...middlewares: Middleware<{ key: K; value: T[K] }>[]) => {
        if (keys.length <= 0)
          keys = [useVerifyKey] as K[];
        keys.forEach(key => {
          const set = map.get(key);
          if (!set)
            return;
          middlewares.forEach(middleware => set?.delete(middleware));
          if (set.size <= 0)
            map.delete(key);
        });
      };

  /**
   * 清除指定属性上的中间件
   * @param keys - 需要清除中间件的属性名，不传则默认清除所有属性上的中间件
   */
  const clear = (...keys: (keyof T)[]) => {
    if (keys.length <= 0)
      keys = [useVerifyKey, ...Object.keys(state)] as (keyof T)[];
    keys.forEach(key => map.delete(key));
  };

  /**
   * 清除指定属性上的验证结果
   * @param keys - 需要清除验证结果的属性名，不传则默认清除所有属性的验证结果
   */
  const clearValidate = (...keys: (keyof T)[]) => {
    if (keys.length <= 0)
      keys = Object.keys(state) as (keyof T)[];
    keys.forEach(key => delete state[key]);
  };

  /**
   * 对指定属性进行验证
   * @param keys - 需要验证的属性名，不传则默认验证所有属性
   * @throws {Error} - 如果有任何属性验证失败，则抛出错误
   */
  const validate = async (...keys: (keyof T)[]) => {
    if (keys.length <= 0)
      keys = Object.keys(state) as (keyof T)[];
    for (const key of keys) {
      const set = map.get(key) || [];
      const defaults = map.get(key) || [];
      clearValidate(key);
      await compose(
        ...defaults,
        ...set
      )({ key, value: obj[key] }).catch(err => {
        state[key] = err?.message || err;
        console.warn(key, state[key]);
      });
    }
    if (keys.some(key => state[key]))
      throw new Error("验证失败");
  };

  /**
   * 获取指定属性的验证结果
   * @param key - 需要获取验证结果的属性名
   * @returns {string} - 验证结果
   */
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
}
