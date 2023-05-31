<script setup lang="ts">
import { usePayload } from "@wsvaio/use";

const a = { b: { c: 1 }, $params: { abc: 123 }, $hh: 1 };
const payload = usePayload(a);
payload.$clear("$hh", "$hh", "sdf");
payload.$action("dfjasdkj", { $hh: 123, skadjfkasdj: 12039129038192 });
function handleClick() {
	payload.b.c++;
	payload.$params.abc++;
	payload.$hh++;
	console.log(payload);
	payload.$action("wdf", {});
	payload.sdjflkasjdklfaj = 1;
}
</script>

<template>
	<h1>Hello World !</h1>
	<button @click="payload.$clear('$hh')">
		action
	</button>
	<button @click="handleClick">
		show
	</button>
</template>
