import { Vector2 } from "./utils/vector";

export class Camera {
    zoom: number;
    position: Vector2;

    constructor() {
        this.zoom = 1;
        this.position = new Vector2();
    }

    screenSpaceToGraphSpace(screenPos: Vector2, out: Vector2) {
        const scale = this.zoom;
        out.x = screenPos.x / scale - this.position.x / scale;
        out.y = screenPos.y / scale - this.position.y / scale;
    }

    graphSpaceToScreenSpace(graphPosition: Vector2, out: Vector2) {
        out.x = this.position.x + graphPosition.x * this.zoom;
        out.y = this.position.y + graphPosition.y * this.zoom;
    }

    reset() {
        this.zoom = 1;
        this.position.x = 0;
        this.position.y = 0;
    }
}
