import { Cfg } from "./utils/config";
import { Vector2 } from "./utils/vector";

export type CameraConfig = Partial<{
    min: number;
    max: number;
    start: number;
}>;

export class Camera {
    zoom: number;
    position: Vector2;
    config?: CameraConfig;

    constructor(config?: CameraConfig) {
        this.zoom = Cfg.value(config?.start, 1);
        this.position = new Vector2();
        this.config = config;
    }

    private clampZoom(value: number): number {
        if (!this.config) return value;

        if (this.config.min !== undefined) {
            value = Math.max(this.config.min, value);
        }

        if (this.config.max !== undefined) {
            value = Math.min(this.config.max, value);
        }

        return value;
    }

    setZoom(value: number) {
        this.zoom = this.clampZoom(value);
    }

    addZoom(delta: number) {
        this.setZoom(this.zoom + delta);
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
        this.zoom = this.clampZoom(1);
        this.position.x = 0;
        this.position.y = 0;
    }
}
