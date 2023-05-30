import type { Ref } from "vue";
import { isRef, onBeforeUnmount, ref } from "vue";

export const useElementEvent = (el: Ref<HTMLElement | Window | undefined> | HTMLElement | Window) => {
	if (!isRef(el)) el = ref(el);
	const element = el as Ref<HTMLElement | Window | undefined>;
	const handlesMap = new Map<keyof HTMLElementEventMap, Set<(ev: Event) => void>>();

	onBeforeUnmount(() => {
		for (const [event, handles] of handlesMap.entries()) {
			for (const handle of handles) element.value?.removeEventListener(event, handle);

			handlesMap.delete(event);
		}
	});
	return {
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
