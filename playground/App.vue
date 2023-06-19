<script setup lang="ts">
import { usePayload } from "@wsvaio/use";
import HelloWorld from "./HelloWorld.vue";
import { sleep } from "@wsvaio/utils";

const payload = usePayload({ a: 1, $provide: true, $key: "wdf" });

payload.$use("test1")(async ctx => {
	console.log("test1");
	await sleep(1000);
});

payload.$use("test2")(async ctx => {
	console.log("test2");
	await sleep(2000);
});

payload.$use()(async ctx => {
	console.log("wdf");
	await sleep(3000);
});


</script>

<template>
	<HelloWorld></HelloWorld>
</template>
