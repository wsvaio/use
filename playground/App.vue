<script setup lang="ts">
import { usePayload } from "@wsvaio/use";
const a = { b: { c: 1 } };
const payload = usePayload(a);
payload.b.c = 2;
payload.$name = "fksajdflajsl;dfjalsdkjfl;";
console.log(payload.b.c, a);
payload.$clear();
console.log(payload.b.c, a);
payload.$use()(async () => {
  console.log("sdkafj;lsdjflaksjdl;fjk");
  console.log(payload.b.c);
});
</script>

<template>
  <h1>Hello World !</h1>
  <button @click="payload.$action()({ b: { c: 1 } })">
    action
  </button>
</template>
