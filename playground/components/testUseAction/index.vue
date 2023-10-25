<script setup lang="ts">
import { useAction } from "@wsvaio/use";

const a = useAction<{
	操作1: { a: "啊？" };
	// 操作2: {};
}>();

// a.use("324", ev => {
// 	console.log(ev);
// });

// a.act("操作1", { a: '啊？' });
// a.using(
// 	{ $key: "操作12" },
// 	async (ev, next) => {
// 		console.log(ev, 6);
// 		const a = await next();
// 		console.log(a, 'sdajf;lasdj')
// 		return '啊？'
// 	},
// 	ev => {
// 		console.log(ev, 6);
// 		return '啊！'
// 	}
// );

// console.log(a.using);

a.using("操作12", ev => {
	console.log(ev);
});
</script>

<template>
	<h1>啊？</h1>
	<button @click="a.act({ $: '操作1', a: '啊？' })">操作1</button>
</template>

<style lang="less" scoped></style>
