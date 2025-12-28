export type Theme = {
    css: Record<string, string>;
    colors: Record<string, string>;
    metadata?: {
        name: string;
        version: string;
        description: string;
        authors: string[] | string;
    };
};

const cssKeys = [
    "--_-bg_c",
    "--_-bg_c_h",
    "--_-ws_c",
    "--_-ws_b_c",
    "--_-card-bg",
    "--_-tr-spd",
    "--mocha-text",
    "--mocha-text-muted",
    "--mocha-text-faint",
    "--mocha-accent",
    "--mocha-accent-soft",
    "--mocha-accent-strong",
    "--mocha-user",
    "--mocha-host",
    "--mocha-path",
    "--mocha-symbol",
    "--mocha-border",
    "--mocha-border-soft",
    "--mocha-success",
    "--mocha-warning",
    "--mocha-error",
    "--mocha-selection",
    "--mocha-cursor",
];

const colorKeys = [
    "black",
    "red",
    "green",
    "yellow",
    "blue",
    "magenta",
    "cyan",
    "white",
    "brightBlack",
    "brightRed",
    "brightGreen",
    "brightYellow",
    "brightBlue",
    "brightMagenta",
    "brightCyan",
    "brightWhite",
    "reset",
];

export function hexFromBytes(r: number, g: number, b: number) {
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function base64ToBytes(base64: string): Uint8Array {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export function decodeTheme(data: string | { m: string; c: string; x: string }): Theme {
    const obj = typeof data === "string" ? JSON.parse(data) : data;

    const cssBuffer = base64ToBytes(obj.c);
    const colorsBuffer = base64ToBytes(obj.x);

    const css: Record<string, string> = {};
    const colors: Record<string, string> = {};

    for (let i = 0; i < cssKeys.length; i++) {
        const r = cssBuffer[i * 3],
            g = cssBuffer[i * 3 + 1],
            b = cssBuffer[i * 3 + 2];
        css[cssKeys[i]] = hexFromBytes(r, g, b);
    }

    for (let i = 0; i < colorKeys.length; i++) {
        const r = colorsBuffer[i * 3],
            g = colorsBuffer[i * 3 + 1],
            b = colorsBuffer[i * 3 + 2];
        colors[colorKeys[i]] = hexFromBytes(r, g, b);
    }

    return { css, colors };
}
