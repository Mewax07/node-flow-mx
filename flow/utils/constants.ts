export function clamp(v: number, min: number, max: number): number {
    return Math.min(Math.max(v, min), max);
}

export function clamp01(v: number): number {
    return clamp(v, 0, 1);
}

export function exec(name: string, callback: Function) {
    const start = name + "_Start";
    const end = name + "_End";

    performance.mark(start);
    callback();
    performance.mark(end);
    performance.measure(name, start, end);
}

export interface Metadata {
    [name: string]: any;
}

export const enum TextAlign {
    Center = "center",
    End = "end",
    Left = "left",
    Right = "right",
    Start = "start",
}

export enum TextBaseline {
    Alphabetic = "alphabetic",
    Bottom = "bottom",
    Hanging = "hanging",
    Ideographic = "ideographic",
    Middle = "middle",
    Top = "top",
}
