<script setup lang="ts">
import { usePload } from "@wsvaio/use";

const pload = usePload({
  b: {
    c: 1,
    d: {
      e: 3
    },
    f: {
      g: 1,
      h: 1,

    }
  }
});

pload.$reset("b", "b.d.e");
pload.$assign({ c: 1 });
// pload.$assign({ b: { f: { h: 2, c: 123 } } });

pload.$assign({});
</script>

<template>
  <h1>{{ pload }}</h1>
  <button @click="pload.$reset()">
    重置
  </button>
  <button @click="pload.$reset('b.f')">
    重置f
  </button>
  <button @click="pload.$reset('asdfj.dafj.sajf')">
    重置不存在
  </button>
  <button @click="pload.$reset('b.f.a')">
    重置f不存在
  </button>
</template>

<style lang="less" scoped></style>
