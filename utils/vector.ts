export class Vector2 {
    public x: number;
    public y: number;

    constructor(x?: number, y?: number) {
        this.x = x ?? 0;
        this.y = y ?? 0;
    }

    sub(a: Vector2, b: Vector2) {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        return this;
    }

    add(a: Vector2, b: Vector2) {
        this.x = a.x + b.x;
        this.y = a.y + b.y;
        return this;
    }

    scale(scale: number) {
        this.x *= scale;
        this.y *= scale;
        return this;
    }

    copy(src: Vector2) {
        this.x = src.x;
        this.y = src.y;
        return this;
    }

    public static distance(a: Vector2, b: Vector2): number {
        const xd = b.x - a.x;
        const yd = b.y - a.y;
        return Math.sqrt(xd * xd + yd * yd);
    }
}
