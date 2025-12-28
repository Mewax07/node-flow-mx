import { HtmlCanvas } from "../.";
import { onThemeChange, Theme } from "../theme";
import { Cfg } from "../utils/config";
import { Vector2 } from "../utils/vector";

export enum FontWeight {
    Normal = "",
    Bold = "bold",
}

export enum FontStyle {
    Normal = "",
    Italic = "italic",
}

export enum FontStrike {
    Normal = "",
    Line = "line",
    Dashed = "dashed",
}

export type TextStyleConfig = Partial<{
    size: number;
    color: string;
    font: string;
    weight: FontWeight;
    style: FontStyle;
    strike: FontStrike;
}>;

export class TextStyle {
    private size: number;
    private color: string;
    private font: string;
    private weight: FontWeight;
    private fontStyle: FontStyle;
    private strike: FontStrike;

    constructor(config?: TextStyleConfig) {
        this.size = Cfg.value(config?.size, Theme.Note.H6.FontSize);
        this.color = Cfg.value(config?.color, Theme.Note.FontColor);
        this.font = Cfg.value(config?.font, Theme.FontFamily);
        this.weight = Cfg.value(config?.weight, FontWeight.Normal);
        this.fontStyle = Cfg.value(config?.style, FontStyle.Normal);
        this.strike = Cfg.value(config?.strike, FontStrike.Normal);

        onThemeChange((theme) => {
            this.size = Cfg.value(config?.size, theme.Note.H6.FontSize);
            this.color = Cfg.value(config?.color, theme.Note.FontColor);
            this.font = Cfg.value(config?.font, theme.FontFamily);
        });
    }

    setupStyle(canvas: HtmlCanvas, scale: number) {
        canvas.fillStyle(this.color).font(`${this.fontStyle} ${this.weight} ${this.size * scale}px ${this.font}`);
    }

    setFont(newFont: string) {
        this.font = newFont;
        return this;
    }

    setBold(value: boolean) {
        this.weight = value ? FontWeight.Bold : FontWeight.Normal;
        return this;
    }

    setItalic(value: boolean) {
        this.fontStyle = value ? FontStyle.Italic : FontStyle.Normal;
        return this;
    }

    setStrike(value: FontStrike) {
        this.strike = value;
        return this;
    }

    getSize() {
        return this.size;
    }

    getFont() {
        return this.font;
    }

    getWeight() {
        return this.weight;
    }

    getStyle() {
        return this.fontStyle;
    }

    getStrike() {
        return this.strike;
    }

    getColor(): string {
        return this.color;
    }

    measure(canvas: HtmlCanvas, scale: number, text: string, out: Vector2) {
        this.setupStyle(canvas, scale);
        const measurements = canvas.measureText(text);
        out.x = measurements.width;
        out.y = measurements.actualBoundingBoxAscent + measurements.actualBoundingBoxDescent;
    }

    setColor(color: string) {
        this.color = color;
        return this;
    }

    setSize(size: number) {
        this.size = size;
        return this;
    }

    setWeight(weight: FontWeight) {
        this.weight = weight;
        return this;
    }

    public static textStyleFallback(input?: TextStyleConfig, fallback?: TextStyleConfig): TextStyleConfig {
        return {
            color: Cfg.value(input?.color, fallback?.color),
            size: Cfg.value(input?.size, fallback?.size),
            font: Cfg.value(input?.font, fallback?.font),
            style: Cfg.value(input?.style, fallback?.style),
            weight: Cfg.value(input?.weight, fallback?.weight),
        };
    }
}
