<script setup lang="ts">
import { usePayload } from "@wsvaio/use";

const payload = usePayload<
{
	aaa: {
		a: number;
		B: number;
		c: {
			cc: number;
		};
	};
	name: string;
},
{
	"啊？": Record<any, any>;
}
>({
	$mode: "inject",
	aaa: {
		a: 1,
		B: 2,
		c: { cc: 33 },
	},
	name: "Hello World !",
});
</script>

<template>
	<h1>Hello World</h1>
	<h2>{{ payload }}</h2>
	<h2>{{ { ...payload.$params } }}</h2>
	<h3>loading: {{ payload.$loading }}</h3>
	<h4>test1: {{ payload.$actioning("test1") }}</h4>
	<h4>test2: {{ payload.$actioning("test2") }}</h4>
	<h4>actionings: {{ payload.$actionings.length }}</h4>
	<button @click="payload.$action({ $name: 'test1' })">test1</button>
	<button @click="payload.$action({ $name: 'test2' })">test2</button>
	<button @click="payload.$action({ $params: { a: 333 }, a: 'dkfja;sldjfa', name: 'sdfklajsdl;' })">wdf</button>
	<button @click="payload.$reset()">clear</button>
</template>

<style lang="less"></style>
