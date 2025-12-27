import { HtmlCanvas } from "../../libs";
import { Box } from "../utils/box";
import { Cfg } from "../utils/config";
import { TextAlign, TextBaseline } from "../utils/constants";
import { BoxStyle, BoxStyleConfig } from "./box";
import { TextStyle, TextStyleConfig } from "./text";

export type TextBoxStyleConfig = Partial<{
    box: BoxStyleConfig;
    text: TextStyleConfig;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
}>;

export function textBoxStyleWithFallback(input?: TextBoxStyleConfig, fallback?: TextBoxStyleConfig): TextBoxStyleConfig {
    return {
        box: BoxStyle.boxStyleWithFallback(input?.box, fallback?.box),
        text: TextStyle.textStyleFallback(input?.text, fallback?.text),

        textAlign: input?.textAlign ?? fallback?.textAlign,
        textBaseline: input?.textBaseline ?? fallback?.textBaseline,
    };
}

export class TextBoxStyle {
    private box: BoxStyle;
    private text: TextStyle;
    private textAlign: CanvasTextAlign;
    private textBaseline: CanvasTextBaseline;

    constructor(config?: TextBoxStyleConfig) {
        this.box = new BoxStyle(config?.box);
        this.text = new TextStyle(config?.text);

        this.textAlign = Cfg.value(config?.textAlign, TextAlign.Center);
        this.textBaseline = Cfg.value(config?.textBaseline, TextBaseline.Middle);
    }

    draw(canvas: HtmlCanvas, box: Box, scale: number, text: string) {
        this.box.draw(canvas, box, scale);

        this.text.setupStyle(canvas, scale);
        canvas.alignText({ text: this.textAlign, baseline: this.textBaseline }).textDraw(text, box.pos.x + box.size.x / 2, box.pos.y + box.size.y / 2);
    }

    drawUnderline(canvas: HtmlCanvas, box: Box, scale: number, text: string) {
        this.box.drawUnderline(canvas, box, scale);

        this.text.setupStyle(canvas, scale);
        canvas.alignText({ text: this.textAlign, baseline: this.textBaseline }).textDraw(text, box.pos.x + box.size.x / 2, box.pos.y + box.size.y / 2);
    }

    setTextColor(color: string) {
        this.text.setColor(color);
    }

    setBoxColor(color: string) {
        this.box.setColor(color);
    }

    setBorderColor(color: string) {
        this.box.setBorderColor(color);
    }

    getBox() {
        return this.box;
    }

    getText() {
        return this.text;
    }
}
