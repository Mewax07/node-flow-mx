export class Cfg {
    static value<T>(value: T | undefined, defaultValue: T): T {
        return value !== undefined ? value : defaultValue;
    }

    static object<T extends object>(config: Partial<T> | undefined, defaults: T): T {
        return { ...defaults, ...(config ?? {}) };
    }
}
