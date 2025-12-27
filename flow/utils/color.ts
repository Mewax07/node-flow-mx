import { clamp01 } from "./constants";

export interface Color {
    r: number;
    g: number;
    b: number;
}

export interface HSV {
    h: number;
    s: number;
    v: number;
}

function cmpToHex(c: number) {
    let hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

export function rbgToHex(c: Color) {
    return "#" + cmpToHex(Math.round(c.r * 255)) + cmpToHex(Math.round(c.g * 255)) + cmpToHex(Math.round(c.b * 255));
}

export function hexToColor(hex: string): Color | null {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16) / 255,
              g: parseInt(result[2], 16) / 255,
              b: parseInt(result[3], 16) / 255,
          }
        : null;
}

export function HSV2RGB(hsv: HSV, out: Color) {
    if (hsv.s <= 0.0) {
        out.r = hsv.v;
        out.g = hsv.v;
        out.b = hsv.v;
        return;
    }
    let hh = hsv.h;
    if (hh >= 360.0) {
        hh = 0.0;
    }
    hh /= 60.0;

    const i = Math.round(hh);
    const ff = hh - i;
    const p = hsv.v * (1.0 - hsv.s);
    const q = hsv.v * (1.0 - hsv.s * ff);
    const t = hsv.v * (1.0 - hsv.s * (1.0 - ff));

    switch (i) {
        case 0:
            out.r = hsv.v;
            out.g = t;
            out.b = p;
            break;
        case 1:
            out.r = q;
            out.g = hsv.v;
            out.b = p;
            break;
        case 2:
            out.r = p;
            out.g = hsv.v;
            out.b = t;
            break;

        case 3:
            out.r = p;
            out.g = q;
            out.b = hsv.v;
            break;
        case 4:
            out.r = t;
            out.g = p;
            out.b = hsv.v;
            break;
        default:
            out.r = hsv.v;
            out.g = p;
            out.b = q;
            break;
    }

    out.r = clamp01(out.r);
    out.g = clamp01(out.g);
    out.b = clamp01(out.b);
}

export function RGB2HSV(rgb: Color, out: HSV) {
    out.h = 0;
    out.s = 0;
    out.v = 0;
    let min: number = 0;
    let max: number = 0;
    let delta: number = 0;

    min = rgb.r < rgb.g ? rgb.r : rgb.g;
    min = min < rgb.b ? min : rgb.b;

    max = rgb.r > rgb.g ? rgb.r : rgb.g;
    max = max > rgb.b ? max : rgb.b;

    out.v = max; // v
    delta = max - min;
    if (delta < 0.00001) {
        out.s = 0;
        out.h = 0; // undefined, maybe nan?
        return;
    }
    if (max > 0.0) {
        // NOTE: if Max is == 0, this divide would cause a crash
        out.s = delta / max; // s
    } else {
        // if max is 0, then r = g = b = 0
        // s = 0, h is undefined
        out.s = 0.0;
        out.h = NaN; // its now undefined
        return;
    }
    if (rgb.r >= max)
        // > is bogus, just keeps compilor happy
        out.h = (rgb.g - rgb.b) / delta; // between yellow & magenta
    else if (rgb.g >= max)
        out.h = 2.0 + (rgb.b - rgb.r) / delta; // between cyan & yellow
    else out.h = 4.0 + (rgb.r - rgb.g) / delta; // between magenta & cyan

    out.h *= 60.0; // degrees

    if (out.h < 0.0) out.h += 360.0;
}
