<script setup lang="ts">
import { usePayload } from "@wsvaio/use";
import HelloWorld from "./HelloWorld.vue";
import WorldHello from "./WorldHello.vue";

const payload = usePayload<
{
	a: number;
},
{
	无可匹敌: { www: number };
	发生什么事了: { mmm: string };
}
>({ a: 1, $mode: "provide" });

payload.$using("发生什么事了", "啊？", "", "")(async ctx => {

});

payload.$action({ $name: "发生什么事了" });
</script>

<template>
	<h1>payload.$select: {{ payload.$select }}</h1>
	<hr />
	<hello-world v-if="payload.$select == 'Hello World !'" />
	<world-hello v-else />
	<hr />
	<select v-model="payload.$select">
		<option>Hello World !</option>
		<option>World Hello !</option>
	</select>
</template>
