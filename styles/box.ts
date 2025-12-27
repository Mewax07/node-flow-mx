import { HtmlCanvas } from "../.";
import { Box } from "../utils/box";
import { StrokeStyle, StrokeStyleConfig } from "./stroke";

export type BoxStyleConfig = Partial<{
    border: StrokeStyleConfig;
    color: string;
    radius: number;
}>;

export class BoxStyle {
    private border: StrokeStyle | null;
    private color: string;
    private radius: number;

    constructor(config?: BoxStyleConfig) {
        this.color = config?.color ? config.color : "#cccccc";
        this.border = config?.border ? new StrokeStyle(config.border) : null;
        this.radius = config?.radius ? config?.radius : 2;
    }

    private box(canvas: HtmlCanvas, box: Box, scale: number, radius: any) {
        canvas.fillStyle(this.color);
        this.border?.setupStyle(canvas, scale);
        canvas.roundedRect(box.pos.x, box.pos.y, box.size.x, box.size.y, radius);
    }

    private draw_c(canvas: HtmlCanvas, box: Box, scale: number, radius: any) {
        this.box(canvas, box, scale, radius);
        canvas.stroke();
    }

    outline(canvas: HtmlCanvas, box: Box, scale: number, radius: any) {
        this.border?.setupStyle(canvas, scale);
        canvas.begin().roundedRect(box.pos.x, box.pos.y, box.size.x, box.size.y, radius).stroke();
    }

    draw(canvas: HtmlCanvas, box: Box, scale: number) {
        this.draw_c(canvas, box, scale, this.radius * scale);
    }

    drawRoundedTopOnly(canvas: HtmlCanvas, box: Box, scale: number) {
        this.draw_c(canvas, box, scale, [this.radius * scale * 2, this.radius * scale * 2, 0, 0]);
    }

    drawUnderline(canvas: HtmlCanvas, box: Box, scale: number) {
        this.box(canvas, box, scale, [this.radius * scale * 2, this.radius * scale * 2, 0, 0]);
        canvas.line(box.pos.x, box.pos.y + box.size.y, box.pos.x + box.size.x, box.pos.y + box.size.y);
    }

    borderSize(): number {
        if (this.border === null) {
            return 0;
        }
        return this.border.getSize();
    }

    getRadius(): number {
        return this.radius;
    }

    setColor(color: string): void {
        this.color = color;
    }

    setBorderColor(color: string): void {
        if (this.border === null) {
            this.border = new StrokeStyle({
                color: color,
            });
        } else {
            this.border.setColor(color);
        }
    }

    public static boxStyleWithFallbackWithSelf(input?: BoxStyleConfig, fallback?: BoxStyleConfig): BoxStyle {
        return new BoxStyle({
            radius: input?.radius ? input?.radius : fallback?.radius,
            color: input?.color ? input?.color : fallback?.color,
            border: StrokeStyle.strokeStyleWithFallback(input?.border, fallback?.border),
        });
    }

    public static boxStyleWithFallback(input?: BoxStyleConfig, fallback?: BoxStyleConfig): BoxStyleConfig {
        return {
            radius: input?.radius ? input?.radius : fallback?.radius,
            color: input?.color ? input?.color : fallback?.color,
            border: StrokeStyle.strokeStyleWithFallback(input?.border, fallback?.border),
        };
    }
}
