# 常用 use

- useCreateObjectURL: URL.createObjectURL 包装
- useElementEvent: 方便的绑定和解绑事件
- useGenerateKey: 生成随机字符串，保证全局唯一性
- useLngLat: 获取定位
- usePayload: 这段代码导出了一个 Vue.js 自定义的组合 API，称为 usePayload 。它旨在为 Vue.js 应用程序提供响应式载荷对象和管理状态和操作的实用方法，
  以下是 usePayload 的工作原理：
  1.它以可选的 initial 对象作为参数，其默认值为空对象。
  2. initial 对象还可以包含两个可选属性： injectable 和 provideable ，用于确定载荷是否将注入到子组件中或从父组件提供。
  3.它返回一个响应式载荷对象，具有以下属性和方法：
  - $loading ：一个布尔值，表示当前是否正在处理操作。
  - $actions ：一个 Map 实例，持有注册的中间件函数（操作），键为操作名称。
  - $enumerable ：一个使所有以 $ 开头的属性不可枚举的方法。
  - $action ：一个接受可选的操作名称和选项的方法，执行相应的操作中间件，并在操作正在处理时设置 $loading 为 true 。
  - $use ：用于向载荷注册操作（中间件）的方法。
  - $unuse ：用于从载荷注销操作（中间件）的方法。
  - $clear ：用于清除指定键或载荷中的所有键的值的方法。
  导出的 usePayload 函数可以在 Vue.js 组件中使用，以更流畅和统一的方式管理状态和操作。
