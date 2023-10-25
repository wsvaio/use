import { compose, merge, omit, pick } from "@wsvaio/utils";
import { inject, onUnmounted, provide } from "vue";
import type { IsEqual, Middleware, UnionToIntersection } from "@wsvaio/utils";

export const useActionKey = Symbol("useAction");

const resolveOptions = options => {
	let keys: string[] = [];
	let event: Record<any, any> = {};

	if (typeof options == "object") {
		const { $ } = pick(options, ["$"]);
		keys = Array.isArray($) ? $ : [$];
		event = omit(options, ["$"]);
	}
	else {
		keys = Array.isArray(options) ? options : [options];
	}
	return { keys, event };
};

export const useAction = <T extends Record<string, any>>(
	options: { mode?: "provide" | "inject" | "auto"; key?: string | symbol } = {}
) => {
	let { mode = "auto", key = useActionKey } = options;

	let result: {
		actMap: Map<Middleware<any>, Set<string | keyof T>>;
		evMap: Map<string | keyof T, Record<any, any>[]>;
		actings: (string | keyof T)[];
		act: <K extends string | undefined = undefined>(
			options: IsEqual<T[K], unknown> extends true
				?
				| K[]
				| (keyof T)[]
				| K
				| keyof T
				| ({
					$: K[] | (keyof T)[] | K | keyof T;
						  } & UnionToIntersection<T[K & keyof T]> &
				Record<any, any>)
				: {
					$: K[] | (keyof T)[] | K | keyof T;
				  } & UnionToIntersection<T[K & keyof T]> &
				Record<any, any>
		) => Promise<void>;

		acting: <K extends string>(...keys: K[] | (keyof T)[]) => boolean;

		use: <K extends string>(
			keys: K[] | (keyof T)[] | K | keyof T,
			...handles: Middleware<UnionToIntersection<T[K & keyof T]> & Record<any, any>>[]
		) => void;

		using: <K extends string | undefined = undefined>(
			options: IsEqual<T[K], unknown> extends true
				?
				| K[]
				| (keyof T)[]
				| K
				| keyof T
				| ({
					$: K[] | (keyof T)[] | K | keyof T;
						  } & UnionToIntersection<T[K & keyof T]> &
				Record<any, any>)
				: {
					$: K[] | (keyof T)[] | K | keyof T;
				  } & UnionToIntersection<T[K & keyof T]> &
				Record<any, any>,
			...handles: Middleware<UnionToIntersection<T[K & keyof T]> & Record<any, any>>[]
		) => void;

		unuse: <K extends string>(
			keys: K[] | (keyof T)[] | K | keyof T,
			...handles: Middleware<UnionToIntersection<T[K & keyof T]> & Record<any, any>>[]
		) => void;
	};

	if (mode == "inject" || mode == "auto") {
		result = inject(key);
		if (result) mode = "inject";
		else if (mode == "inject")
			throw new Error(`useAction({ key: ${String(key)} }): 注入依赖失败,请确保父级组件提供了依赖。`);
	}

	if (mode != "inject") {
		// @ts-expect-error pass
		result = {
			actMap: new Map(),
			evMap: new Map(),
			actings: [],
			act: async options => {
				let { keys, event } = resolveOptions(options);

				const c = compose();
				for (const [k, v] of result.actMap) keys.some(key => v.has(key)) && c(k);

				for (const key of keys) {
					if ([...result.actMap.values()].some(set => set.has(key))) {
						let events = result.evMap.get(key);
						if (!events) result.evMap.set(key, (events = []));
						events.push(event);
					}
				}

				result.actings.push(...keys);
				await c(event).finally(() => {
					Array.isArray(keys) || (keys = [keys]);
					keys.forEach(key => result.actings.splice(result.actings.indexOf(key), 1));
				});
			},

			acting: (...keys) => (keys.length ? keys.some(key => result.actings.includes(key)) : !!result.actings.length),

			using: (options, ...handles) => {
				let { keys } = resolveOptions(options);
				result.use(keys, ...handles);
				result.act(options);
			},
		};
	}

	const actMap = new Map<Middleware<any>, Set<string | keyof T>>();

	merge(result, {
		use: (keys, ...handles) => {
			(mode == "inject" ? [actMap, result.actMap] : [result.actMap]).forEach(map => {
				Array.isArray(keys) || (keys = [keys]);

				keys.forEach(key => {
					handles.forEach(handle => {
						let set = map.get(handle);
						if (!set) map.set(handle, (set = new Set()));
						set.add(key);
					});

					const events = result.evMap.get(key);
					// @ts-expect-error pass
					events?.forEach(event => result.act({ $: keys, ...event }));
				});
			});
		},
		unuse: (keys, ...handles) => {
			(mode == "inject" ? [actMap, result.actMap] : [result.actMap]).forEach(map => {
				Array.isArray(keys) || (keys = [keys]);
				keys.forEach(key => {
					handles.forEach(handle => {
						let set = map.get(handle);
						if (!set) return;
						set.delete(key);
						if (set.size <= 0) map.delete(handle);
					});
				});
			});
		},
	});

	onUnmounted(() => {
		actMap.forEach((set, action) => result.unuse([...set], action));
	});

	if (mode == "provide") provide(key, result);

	return result;
};
