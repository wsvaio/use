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
	$clear: (...keys: (keyof Initial)[] | string[]) => void;
	[k: string | number | symbol]: any;
} & Initial;

const wrapper
	= <T extends object>(type: "use" | "unuse") =>
		(...maps: Map<Middleware<Payload>, Set<string>>[]) =>
			(...names: string[]) =>
				(...middlewares: Middleware<Payload<T>>[]) => {
					names.length <= 0 && (names = [defaultKey as any]);
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

export const usePayload = <T extends object, Initial extends object = Omit<T, "injectable" | "provideable">>(
	initial = {} as Partial<T> & { injectable?: boolean; provideable?: boolean }
): UnwrapNestedRefs<Payload<Initial>> => {
	let payload: UnwrapNestedRefs<Payload<Initial>>;
	const { injectable, provideable } = pick(initial, ["injectable", "provideable"], true);
	const actions = new Map<Middleware<Payload>, Set<string>>();
	if (injectable) {
		payload = inject<UnwrapNestedRefs<Payload<Initial>>>(injectKey);
		if (!payload) throw new Error("usePayload: 接收依赖失败，请确保父级组件注入依赖");
		merge(payload, initial, { deep: Infinity });
		payload.$enumerable();
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
				let opts = options.filter(item => typeof item !== "string") as DeepPartial<Payload<Initial>>[];
				names.length <= 0 && (names = [defaultKey as any]);
				const c = compose<Payload>();
				for (const [k, v] of payload.$actions) names.some(name => v.has(name)) && c(k);
				opts.forEach(opt => merge(payload, opt));
				payload.$loading = true;
				await c(payload).finally(() => (payload.$loading = false));
			},

			$clear: (...keys) => {
				if (keys.length > 0) {
					keys.forEach((key: string | number | symbol) => {
						if (payload[key] instanceof Object) merge(payload[key], initial[key], { deep: Infinity, del: true });
						else payload[key as number] = initial[key];
					});
				}
				else {
					merge(payload, pick(initial, Object.keys(initial).filter(key => !key.startsWith("$")) as any), {
						deep: Infinity,
						del: true,
					});
				}
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
