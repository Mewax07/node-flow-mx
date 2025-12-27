import { HtmlCanvas } from "../.";
import { Vector2 } from "../utils/vector";
import { IRenderElement, RenderElementBase, RenderElementBaseStyling } from "./base";

interface ContainerRenderElementConfig extends RenderElementBaseStyling {}

export enum LayoutDirection {
    Column = "column",
    Row = "row",
}

export enum AlignItems {
    Stretch = "stretch",
    Start = "start",
    Center = "center",
    End = "end",
}

export class ContainerRenderElement extends RenderElementBase {
    private elements: Array<IRenderElement>;
    private layout: LayoutDirection;
    private alignment: AlignItems;

    constructor(elements: Array<IRenderElement>, config?: ContainerRenderElementConfig) {
        super(config);
        this.elements = elements;
        this.layout = LayoutDirection.Column;
        this.alignment = AlignItems.Stretch;
    }

    calcSize(canvas: HtmlCanvas, out: Vector2): void {
        out.x = 0;
        out.y = 0;

        const elmSize = new Vector2();

        switch (this.layout) {
            case LayoutDirection.Column:
                for (let i = 0; i < this.elements.length; i++) {
                    this.elements[i].size(canvas, elmSize);
                    out.x = Math.max(out.x, elmSize.x);
                    out.y += elmSize.y;
                }
                break;

            case LayoutDirection.Row:
                for (let i = 0; i < this.elements.length; i++) {
                    this.elements[i].size(canvas, elmSize);
                    out.y = Math.max(out.y, elmSize.y);
                    out.x += elmSize.x;
                }
                break;

            default:
                throw new Error("unknown layout: " + this.layout);
        }
    }

    doRender(canvas: HtmlCanvas, pos: Vector2, scale: number, scaledSpace: Vector2): void {
        switch (this.layout) {
            case LayoutDirection.Column:
                this.renderColumn(canvas, pos, scale, scaledSpace);
                break;

            default:
                throw new Error("unimplemented layout direction: " + this.layout);
        }
    }

    private renderColumn(canvas: HtmlCanvas, pos: Vector2, scale: number, scaledSpace: Vector2) {
        const currentPos = new Vector2(pos.x, pos.y);
        const scaledElmSize = new Vector2();

        for (let i = 0; i < this.elements.length; i++) {
            const elm = this.elements[i];

            elm.size(canvas, scaledElmSize);
            scaledElmSize.scale(scale);

            switch (this.alignment) {
                case AlignItems.Stretch:
                    currentPos.x = pos.x;
                    scaledElmSize.x = scaledElmSize.x;
                    break;

                case AlignItems.Start:
                    currentPos.x = pos.x;
                    break;

                case AlignItems.Center:
                    currentPos.x = scaledSpace.x - scaledElmSize.x / 2;
                    break;

                case AlignItems.End:
                    currentPos.x = scaledSpace.x - scaledElmSize.x;
                    break;

                default:
                    throw new Error("unimplmeneted alignment: " + this.alignment);
            }

            elm.render(canvas, currentPos, scale, scaledElmSize);
            currentPos.y += scaledElmSize.y;
        }
    }
}
