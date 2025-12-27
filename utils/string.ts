import { HtmlCanvas } from "../.";

interface BinarySearchParams<T> {
    max: number;
    getValue: (guess: number) => T;
    match: T;
}

const binarySearch = <T>({ max, getValue, match }: BinarySearchParams<T>): number => {
    let min = 0;

    while (min <= max) {
        let guess = Math.floor((min + max) / 2);
        const compareVal = getValue(guess);

        if (compareVal === match) return guess;
        if (compareVal < match) min = guess + 1;
        else max = guess - 1;
    }

    return max;
};

export function fitString(canvas: HtmlCanvas, str: string, maxWidth: number): string {
    let width = canvas.measureText(str).width;
    const ellipsis = "…";
    const ellipsisWidth = canvas.measureText(ellipsis).width;
    if (width <= maxWidth || width <= ellipsisWidth) {
        return str;
    }

    const index = binarySearch({
        max: str.length,
        getValue: (guess: number) => canvas.measureText(str.substring(0, guess)).width,
        match: maxWidth - ellipsisWidth,
    });

    return str.substring(0, index) + ellipsis;
}

export function splitString(canvas: HtmlCanvas, str: string, maxWidth: number): Array<string> {
    let width = canvas.measureText(str).width;
    if (width <= maxWidth) {
        return [str];
    }

    let index = binarySearch({
        max: str.length,
        getValue: (guess: number) => canvas.measureText(str.substring(0, guess)).width,
        match: maxWidth,
    });

    for (let backward = index - 1; backward >= 1; backward--) {
        if (str.charAt(backward) === " ") {
            index = backward + 1;
            break;
        }
    }

    return [str.substring(0, index), str.substring(index)];
}

export function splitStringIntoLines(canvas: HtmlCanvas, str: string, maxWidth: number): Array<string> {
    let width = canvas.measureText(str).width;
    if (width <= maxWidth) {
        return [str];
    }

    const strings = new Array<string>();
    let remaining = str;
    while (remaining !== "") {
        let index = binarySearch({
            max: remaining.length,
            getValue: (guess: number) => canvas.measureText(remaining.substring(0, guess)).width,
            match: maxWidth,
        });

        if (index === remaining.length) {
            strings.push(remaining.substring(0, index));
            break;
        }

        for (let backward = index - 1; backward >= 1; backward--) {
            if (remaining.charAt(backward) === " ") {
                index = backward + 1;
                break;
            }
        }

        strings.push(remaining.substring(0, index));
        remaining = remaining.substring(index);
    }

    return strings;
}

export function format(str: string, ...args: Array<string>): string {
    if (arguments.length) {
        for (let key in args) {
            str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
        }
    }
    return str;
}
