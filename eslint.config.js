import wsvaio from "@wsvaio/eslint-config"

export default wsvaio({
	ignores: [
		"node_modules/*",
		"dist/*",
		"垃圾桶/*",
		"**/* copy*",
		"**/*.js",
	],
});
