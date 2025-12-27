import { HtmlCanvas } from "../../libs";

export type StrokeStyleConfig = Partial<{
    size: number;
    color: string;
}>;

export class StrokeStyle {
    private size: number;
    private color: string;

    constructor(config?: StrokeStyleConfig) {
        this.size = config?.size ? config.size : 0.5;
        this.color = config?.color ? config.color : "black";
    }

    setupStyle(canvas: HtmlCanvas, scale: number) {
        canvas.strokeStyle(this.color).lineWidth(scale * this.size);
        return this;
    }

    setColor(newColor: string) {
        this.color = newColor;
        return this;
    }

    setSize(newSize: number) {
        this.size = newSize;
        return this;
    }

    getSize() {
        return this.size;
    }

    public static strokeStyleWithFallback(input?: StrokeStyleConfig, fallback?: StrokeStyleConfig): StrokeStyleConfig {
        return {
            color: input?.color ? input.color : fallback?.color,
            size: input?.size ? input.size : fallback?.size,
        };
    }
}
