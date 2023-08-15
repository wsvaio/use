<center>

# @wsvaio/use

这是一个 Vue 3 实用工具库，提供了一系列实用的 Vue 3 组合式 API，帮助您更轻松地构建 Vue 3 项目。

[![Size](https://img.shields.io/bundlephobia/minzip/@wsvaio/use/latest)](https://www.npmjs.com/package/@wsvaio/use) [![Version](https://img.shields.io/npm/v/@wsvaio/use)](https://www.npmjs.com/package/@wsvaio/use) [![Languages](https://img.shields.io/github/languages/top/wsvaio/use)](https://www.npmjs.com/package/@wsvaio/use) [![License](https://img.shields.io/npm/l/@wsvaio/use)](https://www.npmjs.com/package/@wsvaio/use) [![Star](https://img.shields.io/github/stars/wsvaio/use)](https://github.com/wsvaio/use) [![Download](https://img.shields.io/npm/dm/@wsvaio/use)](https://www.npmjs.com/package/@wsvaio/use)

</center>

## 安装

您可以使用npm或yarn或pnpm安装@wsvaio/use：

`npm install @wsvaio/use`

或者

`yarn add @wsvaio/use`

或者

`pnpm add @wsvaio/use`

## 使用

在您的JavaScript代码中，您可以使用import或require来引入@wsvaio/use：

``` javascript
import { usePayload } from '@wsvaio/use';
// or
const { usePayload } = require('@wsvaio/use');
```

然后，您就可以使用@wsvaio/use提供的函数和工具了：

``` javascript
const payload = usePayload();
```

## 功能

@wsvaio/use提供了许多有用的函数和工具，包括：

[document……](https://wsvaio.github.io/use/modules.html)

## 贡献

如果您发现@wsvaio/use中有任何问题或缺少某些功能，请随时提交问题或请求。

我们欢迎您的贡献，包括提交错误修复、添加新功能或改进文档。



使用文档:

## Payload Hook

Payload Hook 用于在 Vue 组件之间共享状态和实现组件通信。它支持注入和提供两种模式获取 Payload 实例,并包含初始值、加载状态、动作-中间件映射等属性,可以异步执行动作和触发中间件。

### 使用方式
ts
import { usePayload } from './usePayload'

const payload = usePayload({
  // 初始值
  name: 'John'
})
这会创建一个 Payload 实例,其中包含 name 为 'John' 的初始值。

### 注入模式

如果父组件已经提供了 Payload 实例,子组件可以通过注入模式获取该实例:

父组件:
ts
provide('payload', payload)
子组件:
ts
const payload = usePayload({
  $mode: 'inject',
  $key: 'payload'
})
这会尝试注入名为 'payload' 的依赖,如果注入成功则使用该实例,否则会创建新实例。

### 提供模式

如果想在父组件提供 Payload 实例给子组件,可以使用提供模式:
ts
const payload = usePayload({
  $mode: 'provide',
  $key: 'payload'
})
这会创建 Payload 实例并通过 provide 方法提供名为 'payload' 的依赖给子组件。

### 自动模式

自动模式会先尝试注入依赖,如果失败则创建新实例:
ts
const payload = usePayload({
  $mode: 'auto',
  $key: 'payload'
})
这在注入依赖成功时会重用实例,否则创建新实例。

### 执行动作

可以通过 $action 方法异步执行动作:
ts
payload.$action({
  name: 'Jack'  // 将 name 更新为 'Jack'
})
这会将 Payload 实例的 name 属性更新为 'Jack'。

也可以指定动作名称,之后可以通过 $actioning 方法判断该动作是否正在执行:
ts
payload.$action({
  $name: 'updateName',
  name: 'Jack'
})

payload.$actioning('updateName') // 返回 true
### 使用中间件

可以为指定动作注册中间件,中间件会在动作执行前后被调用:
ts
payload.$use('updateName', middleware1, middleware2)

function middleware1(payload) {
  console.log('执行前')
}

function middleware2(payload) {
  console.log('执行后')
}
之后执行 updateName 动作时,会先调用 middleware1,然后执行动作,最后调用 middleware2。

可以通过 $unuse 方法移除中间件。

### 重置和可枚举性

可以通过 $reset 方法重置 Payload 实例的指定键,通过 $enumerable 和 $unenumerable 方法设置键的可枚举性。
ts
payload.$reset('name')     // 重置 name 属性
payload.$enumerable('age') // 设置 age 可枚举
payload.$unenumerable('age') // 设置 age 不可枚举
### 组件卸载

当组件卸载时,会自动移除所有中间件,还原键的可枚举性,并删除仅存在于 Payload 实例的键。

这可以确保 Payload 实例不会因为组件卸载而产生副作用。
