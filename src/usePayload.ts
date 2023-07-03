import type { Middleware } from "@wsvaio/utils";
import { compose, is, merge, pick } from "@wsvaio/utils";
import type { UnwrapNestedRefs } from "vue";
import { computed, inject, onUnmounted, provide, reactive } from "vue";
import { key } from "./utils";

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

/**
 * 用于处理 Payload 类型的对象，包含一系列属性和方法
 */
export type Payload<Initial extends object = {}> = {
	/**
	 * 用于存储初始化参数的集合
	 */
	$initials: Set<Record<any, any>>;
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
	$actionings: (symbol | string)[];

	/**
	 * 执行一个或多个动作
	 * @param options 动作选项，可以是配置对象或动作名
	 * @returns Promise<void>
	 */
	$action: (
		...options: (
			| (DeepPartial<Initial & { $name: symbol | string | (symbol | string)[] }>) | Record<any, any>
			| (symbol | string)
		)[]
	) => Promise<void>;

	/**
	 * 检查指定的动作是否正在执行中
	 * @param name 动作名
	 * @param names 其他动作名
	 * @returns boolean
	 */
	$actioning: (name: symbol | string, ...names: (symbol | string)[]) => boolean;

	/**
	 * 使用指定的中间件处理给定的动作
	 * @param name 动作名
	 * @param names 其他动作名
	 * @returns 函数，接收中间件列表作为参数
	 */
	$use: (
		name: symbol | string,
		...names: (symbol | string)[]
	) => (...middlewares: Middleware<Payload<Initial>>[]) => void;

	/**
	 * 移除指定动作的中间件处理
	 * @param name 动作名
	 * @param names 其他动作名
	 * @returns 函数，接收中间件列表作为参数
	 */
	$unuse: (
		name: symbol | string,
		...names: (symbol | string)[]
	) => (...middlewares: Middleware<Payload<Initial>>[]) => void;

	/**
	 * 重置指定属性为初始值
	 * @param keys 要重置的属性键值，若为空则重置所有
	 */
	$reset: (...keys: (keyof Initial)[] | (string | number | symbol)[]) => void;

	/**
	 * 使属性不可枚举
	 */
	$enumerable: () => void;
} & Initial &
Record<any, any>;

/**
 * 用于包装 use 和 unuse 的辅助函数
 * @param type 类型，可以为 "use" 或 "unuse"
 * @returns 函数，接收映射列表及其他参数
 */
const wrapper
	= <T extends object>(type: "use" | "unuse") =>
		(...maps: Map<Middleware<Payload>, Set<symbol | string>>[]) =>
			(...names: (symbol | string)[]) =>
				(...middlewares: Middleware<Payload<T>>[]) => {
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
 * usePayload 是一个基于 Vue 的自定义 Hook，用于在组件之间轻松共享和管理状态、动作和副作用。
 *
 * @param initial - 初始化参数，包含 $mode 和 $key 等属性。
 * @returns 返回一个 Payload 实例。
 */
export const usePayload = <T extends object, Initial extends object = Omit<T, "$mode" | "$key">>(
	initial = {} as Partial<T> & { $mode?: "" | "inject" | "provide"; $key?: symbol | string }
): UnwrapNestedRefs<Payload<Initial>> => {
	// 提取 $mode 和 $key 两个属性
	const { $mode, $key = key } = pick(initial, ["$mode", "$key"], true);
	let payload: UnwrapNestedRefs<Payload<Initial>>;
	// 如果 $mode 为 "inject"，则从当前组件的依赖中注入 Payload 实例
	if ($mode == "inject") {
		payload = inject<UnwrapNestedRefs<Payload<Initial>>>($key);
		if (!payload) throw new Error(`usePayload({ key: ${String($key)} }): 注入依赖失败，请确保父级组件提供了依赖。`);
		merge(payload, initial, { deep: Infinity });
	}
	else {
		// 创建一个 Payload 实例
		payload = reactive({
			...(merge({}, initial, { deep: Infinity }) as Initial),

			// 存储初始化参数的集合
			$initials: new Set(),
			// 计算属性，表示当前是否有操作正在进行中
			$loading: computed(() => !!payload.$actionings.length),
			// 存储操作和关联的名称集合
			$actions: new Map(),
			// 存储正在进行中的操作名称
			$actionings: [],
			// 执行指定的操作
			$action: async (...options) => {
				const names = options.filter(item => is("Symbol", "String")(item)) as (symbol | string)[];
				const opts = options.filter(item => !is("Symbol", "String")(item)) as (DeepPartial<Initial> & {
					$name?: symbol | string | (symbol | string)[];
				} & Record<any, any>)[];
				// 如果有参数，则合并到 Payload 实例中
				if (opts.length) {
					opts.forEach(opt => {
						const { $name } = pick(opt, ["$name"], true);
						$name && names.push(...(Array.isArray($name) ? $name : [$name]));
						merge(payload, opt);
					});
				}
				// 如果有操作名称，则执行对应的操作
				if (names.length) {
					const c = compose<Payload>();
					for (const [k, v] of payload.$actions) names.some(name => v.has(name)) && c(k);
					payload.$actionings.push(...names);
					await c(payload).finally(() =>
						names.forEach(name => payload.$actionings.splice(payload.$actionings.indexOf(name), 1))
					);
				}
			},
			// 判断指定的操作是否正在进行中
			$actioning: (...names) => names.some(name => payload.$actionings.includes(name)),
			// 清除指定的状态
			$reset: (...keys) => {
				const initial: Record<any, any> = {};
				payload.$initials.forEach(item => merge(initial, item, { deep: Infinity }));
				if (keys.length) {
					keys.forEach((key: any) => {
						payload[key] instanceof Object
							? merge(payload[key], initial[key], { deep: Infinity, del: true })
							: Reflect.set(payload, key, initial[key]);
					});
				}
				else {
					merge(
						payload,
						pick(
							initial,
							Object.keys(initial).filter(key => !key.startsWith("$"))
						),
						{ deep: Infinity, del: true }
					);
				}
			},
			// 设置对象属性为不可枚举
			$enumerable: () => {
				Object.keys(payload)
					.filter(item => item.startsWith("$"))
					.forEach(item => Object.defineProperty(payload, item, { enumerable: false }));
			},
		} as Payload<Initial>);
	}

	// 设置对象属性为不可枚举
	payload.$enumerable();

	// 创建一个用于存储操作名称与中间件映射关系的 Map 对象
	const actions = new Map<Middleware<Payload>, Set<symbol | string>>();
	// 合并 $use 和 $unuse 方法到 Payload 实例中
	merge(payload, {
		$use: wrapper<Initial>("use")(payload.$actions, actions),
		$unuse: wrapper<Initial>("unuse")(payload.$actions, actions),
	});
	// 当组件卸载时，移除操作名称与中间件的映射关系
	onUnmounted(() =>
		actions.forEach((set, action) => wrapper<Initial>("unuse")(payload.$actions, actions)(...set)(action))
	);
	// 将初始化参数添加到 $initials 集合中，并在组件卸载时移除
	payload.$initials.add(initial);
	onUnmounted(() => payload.$initials.delete(initial));

	// 如果 $mode 为 "provide"，则在当前组件提供 Payload 实例
	if ($mode == "provide") provide($key, payload);

	return payload;
};
