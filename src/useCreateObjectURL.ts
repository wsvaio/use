import { onUnmounted } from "vue";

/**
 * 封装创建 Blob 或 MediaSource URL 的钩子函数
 * @returns 包含创建 URL 和清除 URL 方法的对象
 */
export const useCreateObjectURL = () => {
	// 用于存储创建的 URL
	const urls: string[] = [];
	// 在组件卸载前清除所有创建的 URL
	onUnmounted(() => {
		urls.forEach(url => URL.revokeObjectURL(url));
	});
	return {
		/**
		 * 创建 Blob 或 MediaSource URL
		 * @param obj 需要创建 URL 的 Blob 或 MediaSource 对象
		 * @returns 创建的 URL
		 */
		createObjectURL: (obj: Blob | MediaSource) => {
			const url = URL.createObjectURL(obj);
			urls.push(url);
			return url;
		},
	};
};
