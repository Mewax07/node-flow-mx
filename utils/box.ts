import { VectorPool } from "./pool";
import { Vector2 } from "./vector";

export class Box {
    pos: Vector2;
    size: Vector2;

    constructor(pos?: Vector2, size?: Vector2) {
        this.pos = pos ? pos : new Vector2();
        this.size = size ? size : new Vector2();
    }

    public normalizeMinMax(min: Vector2, max: Vector2): void {
        if (min.x > max.x) {
            [min.x, max.x] = [max.x, min.x];
        }
        if (min.y > max.y) {
            [min.y, max.y] = [max.y, min.y];
        }
    }

    public intersects(other: Box): boolean {
        let intersects = false;

        VectorPool.run(() => {
            const aMin = VectorPool.get();
            const aMax = VectorPool.get();
            aMin.copy(this.pos);
            aMax.copy(aMin).add(aMin, this.size);
            this.normalizeMinMax(aMin, aMax);

            const bMin = VectorPool.get();
            const bMax = VectorPool.get();
            bMin.copy(other.pos);
            bMax.copy(bMin).add(bMin, other.size);
            this.normalizeMinMax(bMin, bMax);

            intersects = aMin.x <= bMax.x && aMax.x >= bMin.x && aMin.y <= bMax.y && aMax.y >= bMin.y;
        });

        return intersects;
    }

    public boxCenter(out: Vector2): Vector2 {
        out.x = this.pos.x + this.size.x / 2;
        out.y = this.pos.y + this.size.y / 2;
        return out;
    }

    public contains(position: Vector2): boolean {
        const min = this.pos;
        if (position.x < min.x) {
            return false;
        }
        if (position.y < min.y) {
            return false;
        }

        if (position.x > min.x + this.size.x) {
            return false;
        }
        if (position.y > min.y + this.size.y) {
            return false;
        }

        return true;
    }
}
