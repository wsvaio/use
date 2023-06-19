import type { DeepPartial, Middleware } from "@wsvaio/utils";
import { compose, is, merge, pick } from "@wsvaio/utils";
import type { UnwrapNestedRefs } from "vue";
import { computed, inject, onUnmounted, provide, reactive } from "vue";
import { key } from "./utils";

/**
 * Payload 类型，包含状态、操作和相关方法，用于在 Vue 组件之间共享和管理状态、动作和副作用。
 * @template Initial - 初始化参数类型
 * @extends Initial - 继承初始化参数类型
 * @extends Record<any, any> - 允许任意属性
 */
export type Payload<Initial extends object = {}> = {
	/**
	 * 表示当前是否有操作正在进行中
	 */
	$loading: boolean;
	/**
	 * 存储操作和关联的名称集合
	 */
	$actions: Map<Middleware<Payload<Initial>>, Set<symbol | string>>;
	/**
	 * 存储正在进行中的操作名称
	 */
	$actionings: Set<symbol | string>;
	/**
	 * 执行指定的操作
	 */
	$action: (...options: ((DeepPartial<Initial> & Record<any, any>) | (symbol | string))[]) => Promise<void>;
	/**
	 * 判断指定的操作是否正在进行中
	 */
	$actioning: (...names: (symbol | string)[]) => boolean;
	/**
	 * 使用指定的中间件处理操作
	 */
	$use: (...names: (symbol | string)[]) => (...middlewares: Middleware<Payload<Initial>>[]) => void;
	/**
	 * 移除指定的中间件处理操作
	 */
	$unuse: (...names: (symbol | string)[]) => (...middlewares: Middleware<Payload<Initial>>[]) => void;
	/**
	 * 清除指定的状态
	 */
	$clear: (...keys: (keyof Initial)[] | (string | number | symbol)[]) => void;
	/**
	 * 设置对象属性为不可枚举
	 */
	$enumerable: () => void;
} & Initial &
Record<any, any>;
/**
 * 包装函数，用于处理 "use" 和 "unuse" 类型的操作。
 */
const wrapper
	= <T extends object>(type: "use" | "unuse") =>
		(...maps: Map<Middleware<Payload>, Set<symbol | string>>[]) =>
			(...names: (symbol | string)[]) =>
				(...middlewares: Middleware<Payload<T>>[]) => {
					names.length <= 0 && (names = [key]);
					maps.forEach(map => {
						names.forEach(name => {
							middlewares.forEach(middleware => {
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

/**
 * 这是一个基于 Vue 的自定义 Hook，名为 usePayload。它允许您在组件之间轻松共享和管理状态、动作和副作用。通过使用这个 Hook，您可以在组件中注入和提供状态，以及执行相关操作。此外，这个 Hook 还提供了一些实用的辅助方法，如 $action、$actioning、$use 和 $unuse 等，用于处理状态的更新和操作。总之，usePayload 是一个功能强大且易于使用的 Vue Hook，能够帮助您更高效地管理和共享组件状态。
 * @param initial - 初始化参数，包含 $inject、$provide 和 $key 等属性。
 * @returns 返回一个 Payload 实例。
 */
export const usePayload = <T extends object, Initial extends object = Omit<T, "$inject" | "$provide" | "$key">>(
	initial = {} as Partial<T> & { $inject?: boolean; $provide?: boolean; $key?: symbol | string }
): UnwrapNestedRefs<Payload<Initial>> => {
	const { $inject = false, $provide = false, $key = key } = pick(initial, ["$inject", "$provide", "$key"], true);

	let payload: UnwrapNestedRefs<Payload<Initial>>;
	const actions = new Map<Middleware<Payload>, Set<symbol | string>>();
	if ($inject) {
		payload = inject<UnwrapNestedRefs<Payload<Initial>>>($key);
		if (!payload) throw new Error(`usePayload: 注入依赖失败，请确保父级组件提供了依赖；key=${String($key)}。`);
		merge(payload, initial, { deep: Infinity });
		payload.$enumerable();
	}
	else {
		payload = reactive({
			...(merge({}, initial, { deep: Infinity }) as Initial),

			$loading: computed(() => !!payload.$actionings.size),

			$actions: new Map<Middleware<Payload>, Set<symbol | string>>(),
			$actionings: new Set<symbol | string>(),

			$action: async (...options) => {
				let opts = options.filter(name => !is("Symbol", "String")(name)) as (DeepPartial<Initial> & Record<any, any>)[];
				opts.forEach(opt => merge(payload, opt));

				let names = options.filter(name => is("Symbol", "String")(name)) as (symbol | string)[];
				names.length <= 0 && (names = [key]);
				const c = compose<Payload>();
				for (const [k, v] of payload.$actions) names.some(name => v.has(name)) && c(k);
				names.forEach(name => payload.$actionings.add(name));
				await c(payload).finally(() => names.forEach(name => payload.$actionings.delete(name)));
			},

			$actioning: (...names) => {
				names.length <= 0 && (names = [key]);
				return names.some(name => payload.$actionings.has(name));
			},

			$clear: (...keys) => {
				if (keys.length > 0) {
					keys.forEach((key: any) => {
						payload[key] instanceof Object
							? merge(payload[key], initial[key], { deep: Infinity, del: true })
							: ((payload as any)[key] = initial[key]);
					});
				}
				else {
					merge(
						payload,
						pick(
							initial,
							// @ts-expect-error pass
							Object.keys(initial).filter(key => !key.startsWith("$"))
						),
						{
							deep: Infinity,
							del: true,
						}
					);
				}
			},
			$enumerable: () => {
				Object.keys(payload)
					.filter(item => item.startsWith("$"))
					.forEach(item => Object.defineProperty(payload, item, { enumerable: false }));
			},
		} as Payload<Initial>);
	}

	merge(payload, {
		$use: wrapper<Initial>("use")(payload.$actions, actions),
		$unuse: wrapper<Initial>("unuse")(payload.$actions, actions),
	});

	payload.$enumerable();

	if ($provide && !$inject) provide($key, payload);

	onUnmounted(() => {
		for (const [action, set] of actions) payload.$unuse(...set)(action);
	});

	return payload;
};
