import type { DeepPartial, Middleware, UnionToIntersection } from "@wsvaio/utils";
import { compose, merge, pick } from "@wsvaio/utils";
import { computed, inject, onUnmounted, provide, reactive } from "vue";
import { key } from "./utils";

export type Payload<
	T extends {
		Initial?: Record<any, any>;
		Actions?: Record<string, object>;
	} = Record<any, any>
> = {
	$initials: Set<object>;
	$loading: boolean;
	$actions: Map<Middleware<Payload<T>>, Set<string>>;
	$actionings: string[];
	$options: Map<string, Record<any, any>[]>;
	$unenumerables: Set<string>;
	$action: <Names extends string | undefined = undefined>(
		...options: ({
			$name?: Names[] | (keyof T["Actions"])[] | Names | keyof T["Actions"];
		} & DeepPartial<T["Initial"]> &
		UnionToIntersection<T["Actions"][Names & keyof T["Actions"]]> &
		Record<any, any>)[]
	) => Promise<void>;

	$actioning: <Names extends string>(...names: Names[] | (keyof T["Actions"])[]) => boolean;

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

	$reset: (...keys: (keyof T["Initial"])[] | (keyof T["Actions"])[] | string[]) => void;

	$enumerable: (...keys: (keyof T["Initial"])[] | (keyof T["Actions"])[] | string[]) => void;

	$unenumerable: (...keys: (keyof T["Initial"])[] | (keyof T["Actions"])[] | string[]) => void;
} & T["Initial"] &
Record<any, any>;

/**
 * Payload Hook
 * 用于在 Vue 组件之间共享状态和实现组件通信
 */
export const usePayload = <Initial extends object, Actions extends Record<string, object> = Record<string, object>>(
	initial = {} as (
		| (Initial & { $mode?: "provide"; $key?: string | symbol })
		| (Partial<Initial> & { $mode?: "" | "inject" | "auto"; $key?: string | symbol })
	) &
	Record<any, any>
): Payload<{ Initial: Omit<Initial, "$mode" | "$key">; Actions: Actions }> => {
	/**
	 * 模式和键名
	 */
	let { $mode, $key = key } = pick(initial, ["$mode", "$key"], true) as {
		$mode?: "" | "inject" | "provide" | "auto";
		$key?: string | symbol;
	};

	let payload: Payload<{ Initial: Initial; Actions: Actions }>;

	/**
	 * 注入模式
	 */
	if ($mode == "inject" || $mode == "auto") {
		payload = inject<Payload<{ Initial: Initial; Actions: Actions }>>($key);
		if (payload) {
			merge(payload, initial, { deep: Number.POSITIVE_INFINITY });
			$mode = "inject";
		}
		else if ($mode == "inject") {
			throw new Error(`usePayload({ key: ${String($key)} }): 注入依赖失败,请确保父级组件提供了依赖。`);
		}
	}
	if ($mode != "inject") {
		payload = reactive({
			...(merge({}, initial, { deep: Number.POSITIVE_INFINITY }) as Initial),
			/**
			 * 初始值集合
			 */
			$initials: new Set(),
			/**
			 * 加载状态
			 */
			$loading: computed(() => !!payload.$actionings.length),
			/**
			 * 动作-中间件映射
			 */
			$actions: new Map(),
			/**
			 * 正在执行的动作
			 */
			$actionings: [],
			/**
			 * 选项缓存
			 */
			$options: new Map(),
			/**
			 * 不可枚举属性
			 */
			$unenumerables: new Set(),

			/**
			 * 异步执行动作
			 */
			$action: async (...options) => {
				const option: Record<any, any> = {};
				const names: string[] = [];
				options.forEach(item => {
					const { $name } = pick(item, ["$name"], true);
					$name && names.push(...(Array.isArray($name) ? $name : [$name]));
					merge(option, item, { deep: Number.POSITIVE_INFINITY });
				});

				merge(payload, option, { deep: Number.POSITIVE_INFINITY });

				if (names.length) {
					const c = compose<Payload>();
					for (const [k, v] of payload.$actions) names.some(name => v.has(name)) && c(k);

					for (const name of names) {
						const vs: Set<string>[] = [];
						for (const [k, v] of payload.$actions) vs.push(v) && v.has(name) && c(k);
						if (!vs.some(v => v.has(name))) {
							let options = payload.$options.get(name);
							if (!options) payload.$options.set(name, (options = []));
							options.push(option);
						}
					}

					payload.$actionings.push(...names);
					await c(payload).finally(() =>
						names.forEach(name => payload.$actionings.splice(payload.$actionings.indexOf(name), 1))
					);
				}
			},

			/**
			 * 判断动作是否正在执行
			 */
			$actioning: (...names) => (names as string[]).some(name => payload.$actionings.includes(name)),
			/**
			 * 重置指定键的值
			 */
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
					merge(
						payload,
						pick(
							initial,
							Object.keys(initial).filter(key => !payload.$unenumerables.has(key))
						),
						{ deep: Number.POSITIVE_INFINITY, del: true }
					);
				}
			},

			/**
			 * 异步执行动作(别名)
			 */
			$using:
				(...names) =>
					(...middlewares) =>
					// @ts-expect-error 这里并不需要类型检测
						payload.$use(...names)(...middlewares) || payload.$action({ $name: names }),
		} as Payload<{ Initial: Initial; Actions: Actions }>);
	}

	const unenumerables = new Set<string>();
	const actions = new Map<Middleware<Payload>, Set<string>>();
	merge(payload, {
		/**
		 * 设置键的可枚举性
		 */
		$enumerable: (...keys) =>
			keys.forEach(key => {
				Object.defineProperty(payload, key, { enumerable: true });
				unenumerables.delete(key);
				payload.$unenumerables.delete(key);
			}),
		/**
		 * 设置键的不可枚举性
		 */
		$unenumerable: (...keys) =>
			keys.forEach(key => {
				Object.defineProperty(payload, key, { enumerable: false });
				unenumerables.add(key);
				payload.$unenumerables.add(key);
			}),
		/**
		 * 使用中间件
		 */
		$use:
			(...names) =>
				(...middlewares) => {
					[actions, payload.$actions].forEach(map => {
						const options: Record<any, any>[] = [];
						names.forEach((name: string) => {
							const _options = payload.$options.get(name);
							if (_options) {
								options.push({ ..._options.shift(), $name: name });
								if (!_options.length) payload.$options.delete(name);
							}

							middlewares.forEach(middleware => {
								let set = map.get(middleware);
								if (!set) map.set(middleware, (set = new Set()));
								set.add(name);
							});
						});
						// @ts-expect-error 这里并不需要类型检测
						payload.$action(...options);
					});
				},
		/**
		 * 移除中间件
		 */
		$unuse:
			(...names) =>
				(...middlewares) => {
					[actions, payload.$actions].forEach(map =>
						names.forEach((name: string) => {
							middlewares.forEach(middleware => {
								let set = map.get(middleware);
								if (!set) return;
								set.delete(name);
								if (set.size <= 0) map.delete(middleware);
							});
						})
					);
				},
	} as Payload<{
		Initial: Initial;
		Actions: Actions;
	}>);

	payload.$unenumerable(...Object.keys(payload).filter(item => item.startsWith("$")));
	payload.$initials.add(initial);

	onUnmounted(() => {
		actions.forEach((set, action) => payload.$unuse(...set)(action));
		const uniqueUnenumerables = [...unenumerables].filter(item => !payload.$unenumerables.has(item));
		uniqueUnenumerables.forEach(item => payload.$enumerable(item));
		const uniqueInitialKeys = Object.keys(initial).filter(item =>
			[...payload.$initials].every(sub => !Object.keys(sub).includes(item))
		);
		uniqueInitialKeys.forEach(item => delete payload[item]);
		payload.$initials.delete(initial);
	});

	if ($mode == "provide") provide($key, payload);

	// return payload as Omit<
	// Payload<{ Initial: Omit<Initial, "$mode" | "$key">; Actions: Actions }>,
	// "$initials" | "$actions" | "$actionings" | "$options" | "$unenumerables"
	// >;

	return payload;
};
