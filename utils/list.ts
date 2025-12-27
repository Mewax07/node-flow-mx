export class List<Type> {
    private arr: Array<Type>;
    private count_n: number;

    constructor() {
        this.arr = new Array();
        this.count_n = 0;
    }

    public count() {
        return this.count_n;
    }

    public clear() {
        this.count_n = 0;
    }

    public at(idx: number) {
        return this.arr[idx];
    }

    public push(value: Type) {
        if (this.arr.length === this.count_n) {
            this.arr.push(value);
        } else {
            this.arr[this.count_n] = value;
        }
        this.count_n++;
    }

    public toArray() {
        let arr = new Array<Type>(this.count());
        for (let i = 0; i < this.count_n; i++) {
            arr[i] = this.arr[i];
        }
        return arr;
    }
}
