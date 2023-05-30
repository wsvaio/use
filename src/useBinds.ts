import type { Ref } from "vue";
import { computed, ref } from "vue";

export default <T = string>(beBinds?: Ref<T[] | undefined>) => {
	const binds = ref<T[]>();
	const has = (item: T) => binds.value?.includes(item);
	const append = (...items: T[]) => {
		for (const item of items) has(item) || binds.value?.push(item);
	};
	const remove = (...items: T[]) => {
		for (const item of items) has(item) && binds.value?.splice(binds.value.indexOf(item), 1);
	};
	const toggle = (...items: T[]) => {
		for (const item of items) has(item) ? remove(item) : append(item);
	};
	const isBindAll = computed(() => beBinds?.value?.every(item => has(item)));
	const isUnBind = computed(() => beBinds?.value?.every(item => !has(item)));
	const isIndeterminate = computed(() => !isBindAll.value && !isUnBind.value);
	const toggleBindAll = () => (isBindAll.value ? remove(...(beBinds?.value || [])) : append(...(beBinds?.value || [])));
	return {
		isBindAll,
		toggleBindAll,
		isUnBind,
		isIndeterminate,
		binds,
		has,
		append,
		remove,
		toggle,
	};
};
