import { Vector2 } from "./vector";

export class Pool<Type> {
    private arr: Array<Type>;
    private count: number;
    private builder: () => Type;
    private reset: (v: Type) => void;
    private runningDepth: number;

    constructor(builder: () => Type, reset: (v: Type) => void) {
        this.arr = new Array<Type>();
        this.count = 0;
        this.builder = builder;
        this.reset = reset;
        this.runningDepth = 0;
    }

    public runIf(cond: boolean, fn: () => void) {
        if (cond) {
            this.run(fn);
        }
    }

    private running() {
        return this.runningDepth > 0;
    }

    public run(fn: () => void) {
        const start = this.count;
        this.runningDepth += 1;
        fn();
        this.runningDepth -= 1;
        this.count = start;
    }

    get(): Type {
        if (!this.running()) {
            throw new Error("can't use pool outside of running context");
        }

        let value: Type;
        if (this.arr.length === this.count) {
            value = this.builder();
            this.arr.push(this.builder());
        } else {
            value = this.arr[this.count];
            this.reset(value);
        }
        this.count++;
        return value;
    }
}

export const VectorPool = new Pool<Vector2>(
    () => new Vector2(0, 0),
    (v) => {
        v.x = 0;
        v.y = 0;
    },
);
