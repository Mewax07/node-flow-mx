import { HtmlCanvas } from "../.";
import { Text } from "../utils/text";
import { Vector2 } from "../utils/vector";
import { RenderElementBase, RenderElementBaseStyling } from "./base";

export enum TextAlign {
    Left = "left",
    Right = "right",
    Center = "center",
}

export enum VerticalAlign {
    Top = "top",
    Center = "center",
    Bottom = "bottom",
}

export type TextElementStyling = RenderElementBaseStyling &
    Partial<{
        align: TextAlign;
        verticalAlign: VerticalAlign;
        lineHeight: number;
    }>;

export class TextElement extends RenderElementBase {
    private text: Text;
    private align: TextAlign;
    private verticalAlign: VerticalAlign;
    private lineHeight: number;

    constructor(text: Text, styling?: TextElementStyling) {
        super(styling);
        this.text = text;
        this.align = styling?.align ?? TextAlign.Left;
        this.verticalAlign = styling?.verticalAlign ?? VerticalAlign.Top;
        this.lineHeight = styling?.lineHeight ?? 1;
    }

    doRender(canvas: HtmlCanvas, pos: Vector2, scale: number, scaledSpace: Vector2): void {
        const sc = new Vector2();
        this.calcSize(canvas, sc, scaledSpace);
        sc.scale(scale);

        const justifiedPosition = new Vector2().copy(pos);

        canvas.alignText();

        switch (this.align) {
            case TextAlign.Left:
                // Do nothing. This is default
                break;

            case TextAlign.Right:
                justifiedPosition.x += scaledSpace.x - sc.x;
                break;

            case TextAlign.Center:
                justifiedPosition.x += (scaledSpace.x - sc.x) / 2;
                break;

            default:
                throw new Error("unimplemented justification: " + this.align);
        }

        switch (this.verticalAlign) {
            case VerticalAlign.Top:
                // Do nothing. This is default
                break;

            case VerticalAlign.Bottom:
                justifiedPosition.y += scaledSpace.y - sc.y;
                break;

            case VerticalAlign.Center:
                justifiedPosition.y += (scaledSpace.y - sc.y) / 2;
                break;

            default:
                throw new Error("unimplemented justification: " + this.align);
        }

        if (scaledSpace.x <= 0) {
            this.text.render(canvas, scale, justifiedPosition);
        } else {
            const eles = this.text.breakIntoLines(canvas, scaledSpace.x);

            const tempSize = new Vector2();
            for (let i = 0; i < eles.length; i++) {
                eles[i].render(canvas, scale, justifiedPosition);
                eles[i].resizeSize(canvas, 1, tempSize);
                justifiedPosition.y += this.text.getStyle().getSize() * this.lineHeight;
            }
        }
    }

    calcSize(canvas: HtmlCanvas, out: Vector2, limitations: Vector2): void {
        if (limitations.x <= 0) {
            this.text.resizeSize(canvas, 1, out);
            return;
        }

        const elms = this.text.breakIntoLines(canvas, limitations.x);
        const tempSize = new Vector2();
        out.x = 0;
        out.y = this.text.getStyle().getSize() * elms.length * this.lineHeight;
        for (let i = 0; i < elms.length; i++) {
            elms[i].resizeSize(canvas, 1, tempSize);
            out.x = Math.max(tempSize.x, out.x);
        }
    }
}
