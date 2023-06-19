import type { Ref } from "vue";
import { isRef, onBeforeUnmount, ref } from "vue";

/**
 * 封装元素事件绑定和解绑的钩子函数
 * @param el 需要绑定事件的元素或 window 对象的引用或实例
 * @returns 包含事件绑定和解绑方法的对象
 */
export const useElementEvent = (el: Ref<HTMLElement | Window | undefined> | HTMLElement | Window) => {
	// 如果传入的不是响应式引用，则将其转换为响应式引用
	if (!isRef(el)) el = ref(el);
	const element = el as Ref<HTMLElement | Window | undefined>;
	// 用于存储事件处理函数的 Map，键为事件名称，值为处理函数集合
	const handlesMap = new Map<keyof HTMLElementEventMap, Set<(ev: Event) => void>>();
	// 在组件卸载前解绑所有事件
	onBeforeUnmount(() => {
		for (const [event, handles] of handlesMap.entries()) {
			for (const handle of handles) element.value?.removeEventListener(event, handle);

			handlesMap.delete(event);
		}
	});
	return {
		/**
		 * 绑定元素事件
		 * @param events 需要绑定的事件名称或事件名称数组
		 * @param handles 需要绑定的事件处理函数或事件处理函数数组
		 * @param options 可选，事件绑定选项
		 */
		on: (
			events: keyof HTMLElementEventMap | (keyof HTMLElementEventMap)[],
			handles: ((ev: Event) => void) | ((ev: Event) => void)[],
			options?: boolean | AddEventListenerOptions | undefined
		) => {
			if (!Array.isArray(events)) events = [events];
			if (!Array.isArray(handles)) handles = [handles];
			for (const event of events) {
				if (!handlesMap.has(event)) handlesMap.set(event, new Set());
				for (const handle of handles) {
					handlesMap.get(event)?.add(handle);
					element.value?.addEventListener(event, handle, options);
				}
			}
		},
		/**
		 * 解绑元素事件
		 * @param events 需要解绑的事件名称或事件名称数组
		 * @param handles 可选，需要解绑的事件处理函数或事件处理函数数组，不传则解绑该事件下所有处理函数
		 * @param options 可选，事件解绑选项
		 */
		off: (
			events: keyof HTMLElementEventMap | (keyof HTMLElementEventMap)[],
			handles?: ((ev: Event) => void) | ((ev: Event) => void)[],
			options?: boolean | EventListenerOptions | undefined
		) => {
			handles ||= [];
			if (!Array.isArray(events)) events = [events];
			if (!Array.isArray(handles) && handles) handles = [handles];
			for (const event of events) {
				if (!handlesMap.has(event)) return;
				// @ts-expect-error 可以正常遍历
				for (const handle of handles || handlesMap.get(event)) {
					element.value?.removeEventListener(event, handle, options);
					handlesMap.get(event)!.delete(handle);
				}
			}
		},
	};
};
