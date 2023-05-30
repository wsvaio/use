import { onBeforeUnmount } from "vue";

export const generatekeys = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890".split("");
export const generatekeySet = new Set<string>();
export const randomKey = () => generatekeys[Math.floor(Math.random() * generatekeys.length)];
export const useGenerateKey = () => {
	const keySet = new Set<string>();
	const generateKey = (minLength = 4) => {
		minLength <= 0 && (minLength = 1);
		let result = "";
		for (let i = 0; i < minLength; i++) result += randomKey();

		return generatekeySet.has(result)
			? generateKey(++minLength)
			: generatekeySet.add(result) && keySet.add(result) && result;
	};

	const clearKey = (...keys: string[]) => {
		if (keys.length == 0) keys.push(...keySet);
		keys.forEach(item => generatekeySet.delete(item) && keySet.delete(item));
	};
	onBeforeUnmount(clearKey);

	return {
		generateKey,
		clearKey,
	};
};
