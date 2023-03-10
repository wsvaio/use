import { compose, is, merge, Middleware } from "@wsvaio/utils";
import { reactive } from "vue";
export type PayloadBaseType = { $name: string; $loading: boolean; [k: string]: any };
export default function <
  InitialPayload extends object,
  Payload extends InitialPayload & PayloadBaseType = InitialPayload & PayloadBaseType
>(initialPayload = {} as InitialPayload) {
  const payload = reactive({ ...initialPayload, $name: "", $loading: false }) as Payload;
  const actionSet = new Set<Middleware<Payload>>();
  Object.keys(payload)
    .filter(item => item.startsWith("$"))
    .forEach(item => Object.defineProperty(payload, item, { enumerable: false }));

  const action = async (payloadOptions?: string | Partial<Payload>) => {
    is("String")(payloadOptions) && (payload.$name = payloadOptions);
    is("Object")(payloadOptions) && merge<any>(payload, payloadOptions);
    payload.$loading = true;
    await compose(...actionSet)(payload).finally(() => (payload.$loading = false));
  };
  const use =
    (...names: string[]) =>
    (...middlewares: Middleware<Payload>[]) => {
      actionSet.add(
        compose(
          async (ctx, next) => (names.includes(ctx.$name) || names.length == 0) && (await next()),
          ...middlewares
        )
      );
    };

  const clear = () =>
    !!merge<any>(payload, { ...initialPayload, $name: "", $loading: false }, { del: true });

  return {
    payload,
    action,
    clear,
    use,
  };
}
