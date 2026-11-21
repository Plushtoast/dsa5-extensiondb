const lazyApi = (resolve) => new Proxy(function () {}, {
    get(_target, prop) {
        const api = resolve();
        const val = api?.[prop];
        return typeof val === 'function' ? val.bind(api) : val;
    },
    construct(_target, args) {
        return Reflect.construct(resolve(), args);
    },
});

export const DSA5_Utility = lazyApi(() => globalThis.dsa5.apps.DSA5_Utility);
export const DiceDSA5 = lazyApi(() => globalThis.dsa5.apps.DiceDSA5);
export const FateRolls = lazyApi(() => globalThis.dsa5.concerns.Actor.FateRolls);
