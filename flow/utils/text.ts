import { HtmlCanvas } from "../../libs";
import { FontWeight, TextStyle, TextStyleConfig } from "../styles/text";
import { Cfg } from "./config";
import { splitString, splitStringIntoLines } from "./string";
import { Vector2 } from "./vector";

export type MultilineTextConfig = Partial<{
    maxWidth: number;
    lineSpacing: number;
}>;

export class Text {
    private measured: boolean;
    private size: Vector2;
    private style: TextStyle;
    private value: string;
    private maxWidth: number;
    private lineSpacing: number;
    private textToRender: Array<string>;
    private indent: number;

    constructor(value: string, style?: TextStyleConfig, config?: MultilineTextConfig) {
        this.value = value;
        this.measured = false;
        this.size = new Vector2();
        this.style = new TextStyle(style);
        this.maxWidth = Cfg.value(config?.maxWidth, -1);
        this.lineSpacing = Cfg.value(config?.lineSpacing, 5);
        this.textToRender = [value];
        this.indent = 0;

        if (!document.fonts.check(`16px "${this.style.getFont()}"`)) {
            document.fonts.addEventListener("loadingdone", (_) => {
                this.measured = false;
            });
        }
    }

    set(newValue: string): void {
        this.value = newValue;
        this.measured = false;
    }

    setIndent(size: number) {
        this.indent = size;
        this.measured = false;
    }

    get(): string {
        return this.value;
    }

    breakIntoLines(canvas: HtmlCanvas, maxWidth: number): Array<Text> {
        const results = new Array<Text>();

        this.style.setupStyle(canvas, 1);
        const entries = splitStringIntoLines(canvas, this.value, maxWidth);
        if (entries.length === 1) {
            return [this];
        }
        for (let i = 0; i < entries.length; i++) {
            const text = new Text(entries[i]);
            text.style = this.style;
            results.push(text);
        }

        return results;
    }

    split(char: string): Array<Text> {
        const entries = this.value.split(char);
        const results = new Array<Text>();
        for (let i = 0; i < entries.length; i++) {
            const text = new Text(entries[i]);
            text.style = this.style;
            results.push(text);
        }
        return results;
    }

    splitAtIndex(index: number): Array<Text> {
        const results = [new Text(this.value.substring(0, index)), new Text(this.value.substring(index, 0))];

        for (let i = 0; i < results.length; i++) {
            results[i].style = this.style;
        }
        return results;
    }

    splitAtWidth(canvas: HtmlCanvas, maxWidth: number): Array<Text> {
        this.style.setupStyle(canvas, 1);
        const entries = splitString(canvas, this.value, maxWidth);
        if (entries.length === 1) {
            return [this];
        }

        const results = new Array<Text>();
        for (let i = 0; i < entries.length; i++) {
            const text = new Text(entries[i]);
            text.style = this.style;
            results.push(text);
        }
        return results;
    }

    measure(canvas: HtmlCanvas): void {
        if (this.measured) {
            return;
        }

        this.style.setupStyle(canvas, 1);

        if (this.maxWidth == -1) {
            const measurements = canvas.measureText(this.value);
            this.size.x = measurements.width;
            this.size.y = measurements.actualBoundingBoxAscent + measurements.actualBoundingBoxDescent;
            this.textToRender = [this.value];
            this.measured = true;
            return;
        }

        this.textToRender = splitStringIntoLines(canvas, this.value, this.maxWidth);

        this.size.x = 0;
        this.size.y = 0;
        for (let i = 0; i < this.textToRender.length; i++) {
            const measurements = canvas.measureText(this.textToRender[i]);
            this.size.x = Math.max(this.size.x, measurements.width);
        }

        this.size.y += (this.textToRender.length - 1) * this.lineSpacing + this.style.getSize() * this.textToRender.length;
        this.measured = true;
    }

    resizeSize(canvas: HtmlCanvas, scale: number, out: Vector2) {
        this.measure(canvas);
        out.copy(this.size).scale(scale);
    }

    height(canvas: HtmlCanvas) {
        this.measure(canvas);
        return this.size.y;
    }

    setColor(color: string) {
        this.style.setColor(color);
    }

    getColor(): string {
        return this.style.getColor();
    }

    setSize(size: number) {
        this.style.setSize(size);
    }

    setWeight(weight: FontWeight) {
        this.style.setWeight(weight);
    }

    render(canvas: HtmlCanvas, scale: number, position: Vector2): void {
        this.measure(canvas);
        this.style.setupStyle(canvas, scale);
        let yOffset = 0;
        for (let i = 0; i < this.textToRender.length; i++) {
            const line = " ".repeat(this.indent) + this.textToRender[i];
            canvas.textDraw(line, position.x, position.y + yOffset);

            if (this.style.getStrike()) {
                const width = canvas.measureText(line).width;
                const y = position.y + yOffset - (this.style.getSize() * scale) / 3;
                canvas.line(position.x, y, position.x + width, y);
            }

            yOffset += (this.style.getSize() + this.lineSpacing) * scale;
        }
    }

    getStyle(): TextStyle {
        return this.style;
    }
}
