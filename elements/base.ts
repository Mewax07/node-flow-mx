import { HtmlCanvas } from "../.";
import { Cfg } from "../utils/config";
import { Vector2 } from "../utils/vector";

export interface IRenderElement {
    size(canvas: HtmlCanvas, out: Vector2): void;
    render(canvas: HtmlCanvas, pos: Vector2, scale: number, scaledSpace: Vector2): void;
}

function initSidesStyling(config?: RenderElementSidesStyling | number): RenderElementSides {
    if (typeof config === "number") {
        return {
            bottom: config,
            right: config,
            top: config,
            left: config,
        };
    }
    return {
        bottom: Cfg.value(config?.bottom, 0),
        right: Cfg.value(config?.right, 0),
        top: Cfg.value(config?.top, 0),
        left: Cfg.value(config?.left, 0),
    };
}

export enum Display {
    Flex = "flex",
    None = "none",
}

interface RenderElementSides {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

type RenderElementSidesStyling = Partial<RenderElementSides>;

interface Border {
    color: string;
    thickness: number;
    radius: number;
}

type BorderStyling = Partial<Border>;

export type RenderElementBaseStyling = Partial<{
    margin: RenderElementSidesStyling | number;
    padding: RenderElementSidesStyling | number;
    border: BorderStyling;
    backgroundColor: string;
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
    display: Display;
}>;

export abstract class RenderElementBase implements IRenderElement {
    private margin: RenderElementSides;
    private padding: RenderElementSides;
    private border: Border;
    private backgroundColor?: string;
    private minWidth?: number;
    private maxWidth?: number;
    private minHeight?: number;
    private maxHeight?: number;

    private display: Display;

    constructor(config?: RenderElementBaseStyling) {
        this.margin = initSidesStyling(config?.margin);
        this.padding = initSidesStyling(config?.padding);
        this.backgroundColor = config?.backgroundColor;
        this.border = {
            color: config?.border?.color ?? "black",
            thickness: config?.border?.thickness ?? 0,
            radius: config?.border?.radius ?? 0,
        };
        this.minWidth = config?.minWidth;
        this.maxWidth = config?.maxWidth;
        this.minHeight = config?.minHeight;
        this.maxHeight = config?.maxHeight;
        this.display = config?.display ?? Display.Flex;
    }

    setBackgroundColor(newColor: string) {
        this.backgroundColor = newColor;
    }

    abstract doRender(canvas: HtmlCanvas, pos: Vector2, scale: number, scaledSpace: Vector2): void;

    render(canvas: HtmlCanvas, pos: Vector2, scale: number, scaledSpace: Vector2): void {
        if (this.display === Display.None) {
            return;
        }

        const scaledSize = new Vector2();
        this.size(canvas, scaledSize);

        scaledSize.x = scaledSize.x * scale;
        scaledSize.y = scaledSize.y * scale;
        scaledSize.x = Math.max(scaledSize.x, scaledSpace.x);
        scaledSize.y = Math.max(scaledSize.y, scaledSpace.y);

        if (this.backgroundColor) {
            canvas
                .fillStyle(this.backgroundColor)
                .begin()
                .roundedRect(
                    pos.x + this.margin.left * scale,
                    pos.y + this.margin.right * scale,
                    scaledSize.x - (this.margin.left + this.margin.right) * scale,
                    scaledSize.y - (this.margin.top + this.margin.bottom) * scale,
                    this.border.radius * scale,
                )
                .fill();
        }

        if (this.border.thickness > 0) {
            canvas
                .lineWidth(this.border.thickness * scale)
                .strokeStyle(this.border.color)
                .stroke();
        }

        const offsetPos = new Vector2(pos.x + this.totalLeftOffset() * scale, pos.y + this.totalTopOffset() * scale);
        const elementSize = new Vector2(scaledSize.x - this.horizontalOffset() * scale, scaledSize.y - this.verticalOffset() * scale);

        this.doRender(canvas, offsetPos, scale, elementSize);
    }

    abstract calcSize(canvas: HtmlCanvas, out: Vector2, limitations: Vector2): void;

    setDisplay(display: Display): void {
        this.display = display;
    }

    getDisplay(): Display {
        return this.display;
    }

    size(canvas: HtmlCanvas, out: Vector2): void {
        out.x = 0;
        out.y = 0;
        if (this.display === Display.None) {
            return;
        }

        this.calcSize(canvas, out, new Vector2(this.maxWidth, this.maxHeight));

        out.x += this.horizontalOffset();
        out.y += this.verticalOffset();

        if (this.minWidth) {
            out.x = Math.max(out.x, this.minWidth);
        }

        if (this.maxWidth) {
            out.x = Math.min(this.maxWidth, out.x);
        }

        if (this.maxHeight) {
            out.y = Math.min(this.maxHeight, out.y);
        }

        if (this.minHeight) {
            out.y = Math.max(this.minHeight, out.y);
        }
    }

    horizontalOffset(): number {
        return this.border.thickness + this.margin.left + this.margin.right + this.padding.left + this.padding.right;
    }

    verticalOffset(): number {
        return this.border.thickness + this.margin.top + this.margin.bottom + this.padding.top + this.padding.bottom;
    }

    totalTopOffset(): number {
        return this.border.thickness / 2 + this.margin.top + this.padding.top;
    }

    totalLeftOffset(): number {
        return this.border.thickness / 2 + this.margin.left + this.padding.left;
    }
}
