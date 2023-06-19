<script setup lang="ts">
import { usePayload } from "@wsvaio/use";

const payload = usePayload({ $inject: true, $key: "wdf" });
</script>

<template>
	<h1>Hello World</h1>
	<h2>{{ payload }}</h2>
	<h3>loading: {{ payload.$loading }}</h3>
	<h4>test1: {{ payload.$actioning("test1") }}</h4>
	<h4>test2: {{ payload.$actioning("test2") }}</h4>
	<h4>actionings: {{ payload.$actionings.size }}</h4>
	<button @click="payload.$action('test1')">test1</button>
	<button @click="payload.$action('test2')">test2</button>
  <button @click="payload.$action()">wdf</button>
</template>

<style lang="less"></style>

