import type { Ref } from "vue";
import { computed, ref } from "vue";

/**
 * 封装多选框相关数据和方法的钩子函数
 * @param beBinds 绑定的选项数组
 * @returns 包含是否全选、是否全不选、是否部分选中、选中数组、判断选项是否已选中、添加选项、删除选项、切换选项、切换全选的方法的对象
 */
export const useBind = <T = string>(beBinds?: Ref<T[] | undefined>) => {
	// 绑定的选项数组
	const binds = ref<T[]>();
	// 判断选项是否已选中
	const has = (item: T) => binds.value?.includes(item);
	/**
	 * 添加选项
	 * @param items 要添加的选项
	 */
	const append = (...items: T[]) => {
		for (const item of items) has(item) || binds.value?.push(item);
	};
	/**
	 * 删除选项
	 * @param items 要删除的选项
	 */
	const remove = (...items: T[]) => {
		for (const item of items) has(item) && binds.value?.splice(binds.value.indexOf(item), 1);
	};
	/**
	 * 切换选项
	 * @param items 要切换的选项
	 */
	const toggle = (...items: T[]) => {
		for (const item of items) has(item) ? remove(item) : append(item);
	};
	// 是否全选
	const isBindAll = computed(() => beBinds?.value?.every(item => has(item)));
	// 是否全不选
	const isUnBind = computed(() => beBinds?.value?.every(item => !has(item)));
	// 是否部分选中
	const isIndeterminate = computed(() => !isBindAll.value && !isUnBind.value);
	/**
	 * 切换全选
	 */
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
