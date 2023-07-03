<script setup lang="ts">
import { usePayload } from "@wsvaio/use";
import { sleep } from "@wsvaio/utils";
import HelloWorld from "./HelloWorld.vue";
import WorldHello from "./WorldHello.vue";

const payload = usePayload({
	a: 1,
	$key: "wdf",
	$mode: "provide",
	$select: "Hello World !",
	$form: { a: { b: { c: 1 } } },
});

payload.$use("test1")(async ctx => {
	console.log("test1");
	await sleep(1000);
});

payload.$use("test2")(async ctx => {
	console.log("test2");
	await sleep(2000);
});

payload.$use(
	"wdf",
	"fdw"
)(async ctx => {
	console.log("wdf");
	await sleep(3000);
});

payload.$action({ $form: { aaa: 1, a: { b: { c: 1 } } } });
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
