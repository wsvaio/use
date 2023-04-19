<script setup lang="ts">
import { usePayload } from "@wsvaio/use";
const a = { b: { c: 1 }, $params: { abc: 123 }, $hh: 1 };
const payload = usePayload(a);

const handleClick = () => {
  payload.b.c++;
  payload.$params.abc++;
  payload.$hh++;
  console.log(payload);
  payload.$action("wdf", {});
};
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
