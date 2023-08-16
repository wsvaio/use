<script setup lang="ts">
import { usePayload } from "@wsvaio/use";
import HelloWorld from "./HelloWorld.vue";
import WorldHello from "./WorldHello.vue";

const payload = usePayload<{
	ccc: number;
}>({ a: 1, $mode: "provide", ccc: 1, $select: "Hello World !", $params: { a: 1, b: 2 } });

payload.$action({ $name: "一个延迟事件" });
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
