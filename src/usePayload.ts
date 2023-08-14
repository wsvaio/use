import type { DeepPartial, Middleware } from "@wsvaio/utils";
import { compose, merge, pick } from "@wsvaio/utils";
import type { UnwrapNestedRefs } from "vue";
import { computed, inject, onUnmounted, provide, reactive } from "vue";
import { key } from "./utils";

type ToUnionOfFunction<T> = T extends any ? (x: T) => any : never;
type UnionToIntersection<T> = ToUnionOfFunction<T> extends (x: infer P) => any ? P : never;

/**
 * 用于处理 Payload 类型的对象，包含一系列属性和方法
 */
export type Payload<
	T extends {
		Initial?: Record<any, any>;
		Actions?: Record<string, object>;
	} = {}
> = {
	/**
	 * 用于存储初始化参数的集合
	 */
	$initials: Set<object>;
	/**
	 * 表示当前是否有操作正在进行中
	 */
	$loading: boolean;
	/**
	 * 存储操作和关联的名称集合
	 */
	$actions: Map<Middleware<Payload<T>>, Set<string>>;
	/**
	 * 存储正在进行中的操作名称
	 */
	$actionings: string[];

	/**
	 * 执行一个或多个动作
	 * @param options 动作选项，可以是配置对象或动作名
	 * @returns Promise<void>
	 */

	// $action: <Names extends keyof T["Actions"]>(
	// 	...options:
	// 	| Names[]
	// 	| (keyof T["Actions"])[]
	// 	| (DeepPartial<T["Initial"]> & { $name?: Names | keyof T["Actions"] | Names[] | (keyof T["Actions"])[] } & UnionToIntersection<T["Actions"][Names]>)[]
	// 	| Record<any, any>[]
	// ) => Promise<void>;

	$action: <Names extends string>(
		...options: ({
			$name?: Names[] | (keyof T["Actions"])[] | Names | keyof T["Actions"];
		} & DeepPartial<T["Initial"]> &
		UnionToIntersection<T["Actions"][Names & keyof T["Actions"]]>)[]
	) => Promise<void>;

	/**
	 * 检查指定的动作是否正在执行中
	 * @param name 动作名
	 * @param names 其他动作名
	 * @returns boolean
	 */
	$actioning: <Names extends string>(...names: Names[] | (keyof T["Actions"])[]) => boolean;

	/**
	 * 使用指定的中间件处理给定的动作
	 * @param name 动作名
	 * @param names 其他动作名
	 * @returns 函数，接收中间件列表作为参数
	 */
	$use: <Names extends string>(
		...names: Names[] | (keyof T["Actions"])[]
	) => (
		...middlewares: Middleware<
		Payload<{
			Initial: T["Initial"] & UnionToIntersection<T["Actions"][Names & keyof T["Actions"]]>;
			Actions: T["Actions"];
		}>
		>[]
	) => void;

	/**
	 * 与$use相同，但在use时会直接action一次
	 * @param name 动作名
	 * @param names 其他动作名
	 * @returns 函数，接收中间件列表作为参数
	 */
	$using: <Names extends string>(
		...names: Names[] | (keyof T["Actions"])[]
	) => (
		...middlewares: Middleware<
		Payload<{
			Initial: T["Initial"] & UnionToIntersection<T["Actions"][Names & keyof T["Actions"]]>;
			Actions: T["Actions"];
		}>
		>[]
	) => Promise<void>;

	/**
	 * 移除指定动作的中间件处理
	 * @param name 动作名
	 * @param names 其他动作名
	 * @returns 函数，接收中间件列表作为参数
	 */
	$unuse: <Names extends string>(
		...names: Names[] | (keyof T["Actions"])[]
	) => (
		...middlewares: Middleware<
		Payload<{
			Initial: T["Initial"] & UnionToIntersection<T["Actions"][Names & keyof T["Actions"]]>;
			Actions: T["Actions"];
		}>
		>[]
	) => void;

	/**
	 * 重置指定属性为初始值
	 * @param keys 要重置的属性键值，若为空则重置所有
	 */
	$reset: (...keys: (keyof T["Initial"])[] | (keyof T["Actions"])[] | string[]) => void;

	/**
	 * 使属性不可枚举
	 */
	$enumerable: (...keys: (keyof T["Initial"])[] | (keyof T["Actions"])[] | string[]) => void;
	/**
	 * 使属性不可枚举
	 */
	$unenumerable: (...keys: (keyof T["Initial"])[] | (keyof T["Actions"])[] | string[]) => void;
} & T["Initial"] &
Record<any, any>;

/**
 * 用于包装 use 和 unuse 的辅助函数
 * @param type 类型，可以为 "use" 或 "unuse"
 * @returns 函数，接收映射列表及其他参数
 */
const wrapper
	= <T extends Payload>(type: "use" | "unuse") =>
		(...maps: Map<Middleware<T>, Set<string>>[]) =>
			(...names: string[]) =>
				(...middlewares: Middleware<T>[]) => {
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
// T extends object,
// 	Initial extends object = Omit<T, "$mode" | "$key">
export const usePayload = <Initial extends object, Actions extends Record<string, object> = {}>(
	initial = {} as Initial & { $mode?: "" | "inject" | "provide" | "auto"; $key?: string }
): UnwrapNestedRefs<Payload<{ Initial: Initial; Actions: Actions }>> => {
	// 提取 $mode 和 $key 两个属性
	let { $mode, $key = key } = pick(initial, ["$mode", "$key"], true) as {
		$mode?: "" | "inject" | "provide" | "auto";
		$key?: string;
	};
	let payload: UnwrapNestedRefs<Payload<{ Initial: Initial; Actions: Actions }>>;
	// 如果 $mode 为 "inject"，则从当前组件的依赖中注入 Payload 实例
	if ($mode == "inject" || $mode == "auto") {
		payload = inject<UnwrapNestedRefs<Payload<{ Initial: Initial; Actions: Actions }>>>($key);
		if (payload) {
			merge(payload, initial, { deep: Number.POSITIVE_INFINITY });
			$mode = "inject";
		}
		else if ($mode == "inject") {
			throw new Error(`usePayload({ key: ${String($key)} }): 注入依赖失败，请确保父级组件提供了依赖。`);
		}
	}
	if ($mode != "inject") {
		// 创建一个 Payload 实例
		payload = reactive({
			...(merge({}, initial, { deep: Number.POSITIVE_INFINITY }) as Initial),

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
				const names = (options as any[]).filter(item => typeof item == "string");
				const opts = (options as any[]).filter(item => typeof item != "string");
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
			$actioning: (...names) => (names as string[]).some(name => payload.$actionings.includes(name)),
			// 清除指定的状态
			$reset: (...keys) => {
				const initial: Record<any, any> = {};
				payload.$initials.forEach(item => merge(initial, item, { deep: Number.POSITIVE_INFINITY }));
				if (keys.length) {
					keys.forEach((key: any) => {
						payload[key] instanceof Object
							? merge(payload[key], initial[key], { deep: Number.POSITIVE_INFINITY, del: true })
							: Reflect.set(payload, key, initial[key]);
					});
				}
				else {
					merge(payload, pick(initial, Object.keys(initial)), { deep: Number.POSITIVE_INFINITY, del: true });
				}
			},
			// 设置对象属性为不可枚举
			$enumerable: (...keys) => keys.forEach(key => Object.defineProperty(payload, key, { enumerable: true })),
			$unenumerable: (...keys) => keys.forEach(key => Object.defineProperty(payload, key, { enumerable: false })),

			$using:
				(...names) =>
					(...middlewares) =>
					// @ts-expect-error 这里并不需要类型检测
						payload.$use(...names)(...middlewares) || payload.$action({ $name: names }),
		} as Payload<{ Initial: Initial; Actions: Actions }>);
	}

	// 以$开头的属性默认设为不可枚举
	payload.$enumerable(...Object.keys(initial).filter(item => item.startsWith("$")));

	// 创建一个用于存储操作名称与中间件映射关系的 Map 对象
	const actions = new Map<Middleware<Payload>, Set<string>>();
	// 合并 $use 和 $unuse 方法到 Payload 实例中
	merge(payload, {
		$use: wrapper<Payload<{ Initial: Initial; Actions: Actions }>>("use")(payload.$actions, actions),
		$unuse: wrapper<Payload<{ Initial: Initial; Actions: Actions }>>("unuse")(payload.$actions, actions),
	});
	// 当组件卸载时，移除操作名称与中间件的映射关系
	onUnmounted(() =>
		actions.forEach(
			(set, action) => payload.$unuse(...set)(action)
			// wrapper<Payload<{ Initial: Initial; Actions: Actions }>>("unuse")(payload.$actions, actions)(...set)(action)
		)
	);
	// 将初始化参数添加到 $initials 集合中，并在组件卸载时移除
	payload.$initials.add(initial);
	onUnmounted(() => payload.$initials.delete(initial));

	// 存储当前实例独有的属性
	const uniques = computed(() => Object.keys(initial).filter(item => [...payload.$initials].every(sub => !Object.keys(sub).includes(item))));
	// 卸载时移除当前实例加的属性（仅移除当前实例所独有的）
	onUnmounted(() => {
		uniques.value.map(item => delete payload[item]);
	});

	// 如果 $mode 为 "provide"，则在当前组件提供 Payload 实例
	if ($mode == "provide") provide($key, payload);

	return payload;
};
