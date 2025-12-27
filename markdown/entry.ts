import { HtmlCanvas } from "../.";
import { Theme } from "../theme";
import { List } from "../utils/list";
import { Text } from "../utils/text";
import { Vector2 } from "../utils/vector";

export interface ListItem {
    entry: BasicMarkdownEntry;
    depth: number;
    marker: "*" | "-" | "+" | "[ ]" | "[x]";
}

export interface MarkdownEntry {
    render(canvas: HtmlCanvas, position: Vector2, scale: number, maxWidth: number): number;
}

export class BlockQuoteMarkdownEntry implements MarkdownEntry {
    constructor(
        private entry: BasicMarkdownEntry,
        private depth: number = 1,
    ) {}

    render(canvas: HtmlCanvas, position: Vector2, scale: number, maxWidth: number): number {
        const barWidth = 4 * scale;
        const padding = 10 * scale;
        const offsetX = (this.depth - 1) * Theme.Note.QuoteIndent;

        const height = this.entry.render(canvas, new Vector2(position.x + barWidth + padding, position.y), scale, maxWidth - barWidth - padding);

        canvas.fillStyle(Theme.Note.BlockQuote.BarColor).rect(position.x + offsetX, position.y - padding / 2, barWidth, height + padding * 1.5);

        return height;
    }
}

export class CodeBlockEntry implements MarkdownEntry {
    private text: Text;
    private calculatedPositions: List<Vector2>;
    private calculatedEntries: List<Text>;
    private calculatedForWidth: number;

    constructor(text: Text) {
        this.text = text;
        this.calculatedForWidth = -1;

        this.calculatedEntries = new List();
        this.calculatedPositions = new List();

        document.fonts.addEventListener("loadingdone", (_) => {
            this.calculatedForWidth = -1;
        });
    }

    private calculatingLayout(canvas: HtmlCanvas, maxWidth: number) {
        if (this.calculatedForWidth === maxWidth) {
            return;
        }

        let adjustedWidth = maxWidth;
        adjustedWidth -= Theme.Note.CodeBlock.Padding * 2;

        this.calculatedEntries.clear();
        this.calculatedPositions.clear();

        let curHeight = 0;
        const lineInc = this.text.getStyle().getSize() + Theme.Note.LineSpacing;

        let entries = this.text.split("\n");

        for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
            const entry = entries[entryIndex];

            let lines = entry.breakIntoLines(canvas, adjustedWidth);
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                this.calculatedEntries.push(lines[lineIndex]);
                this.calculatedPositions.push(new Vector2(0, curHeight));

                curHeight += lineInc;
            }
        }

        this.calculatedForWidth = maxWidth;
    }

    render(canvas: HtmlCanvas, position: Vector2, scale: number, maxWidth: number) {
        this.calculatingLayout(canvas, maxWidth);

        let padding = Theme.Note.CodeBlock.Padding * scale;

        let max = 0;
        for (let i = 0; i < this.calculatedEntries.count(); i++) {
            const pos = this.calculatedPositions.at(i);
            max = Math.max(max, pos.y * scale);
        }

        canvas.fillStyle(Theme.Note.CodeBlock.BackgroundColor).roundedRect(position.x, position.y, maxWidth * scale, max + padding * 2, Theme.Note.CodeBlock.BorderRadius * scale);

        for (let i = 0; i < this.calculatedEntries.count(); i++) {
            const entry = this.calculatedEntries.at(i);
            const pos = this.calculatedPositions.at(i);

            entry.render(canvas, scale, new Vector2(pos.x * scale + position.x + padding, pos.y * scale + position.y + padding));

            max = Math.max(max, pos.y * scale);
        }

        return max + padding * 2;
    }
}

type ListItemLike = ListItem | BasicMarkdownEntry;

export class UnorderedListMarkdownEntry implements MarkdownEntry {
    constructor(private items: ListItemLike[]) {}

    render(canvas: HtmlCanvas, position: Vector2, scale: number, maxWidth: number): number {
        let offset = 0;
        const indentSize = 24 * scale;

        for (const rawItem of this.items) {
            const item = this.normalize(rawItem);

            const x = position.x + item.depth * indentSize;
            const y = position.y + offset;

            this.renderMarker(canvas, item.marker, x, y, scale);

            offset += item.entry.render(canvas, new Vector2(x + indentSize, y), scale, maxWidth - indentSize * (item.depth + 1)) + Theme.Note.LineSpacing * scale;
        }

        return offset;
    }

    private normalize(item: ListItemLike): ListItem {
        if (item instanceof BasicMarkdownEntry) {
            return {
                entry: item,
                depth: 0,
                marker: "*",
            };
        }
        return item;
    }

    private renderMarker(canvas: HtmlCanvas, marker: string, x: number, y: number, scale: number) {
        const size = Theme.Note.DotSize * scale;

        if (marker === "[ ]") {
            canvas
                .strokeStyle(Theme.Note.FontColor)
                .lineWidth(2)
                .rect(x, y + size, size * 2, size * 2, "s");
        } else if (marker === "[x]") {
            canvas
                .strokeStyle(Theme.Note.FontColor)
                .lineWidth(2)
                .rect(x, y + size, size * 2, size * 2, "f+s");
        } else {
            canvas.circle(x + size, y + size * 2, size);
        }
    }
}

export class BasicMarkdownEntry implements MarkdownEntry {
    private underline: boolean;
    private background: boolean;
    private entries: Array<Text>;
    private calculatedPositions: List<Vector2>;
    private calculatedEntries: List<Text>;
    private calculatedForWidth: number;

    constructor(lines: Array<Text>, underline: boolean, background: boolean) {
        this.entries = lines;
        this.underline = underline;
        this.background = background;
        this.calculatedForWidth = -1;

        this.calculatedEntries = new List<Text>();
        this.calculatedPositions = new List<Vector2>();

        document.fonts.addEventListener("loadingdone", (_) => {
            this.calculatedForWidth = -1;
        });
    }

    private calculateLayout(canvas: HtmlCanvas, maxWidth: number) {
        if (this.calculatedForWidth === maxWidth) {
            return;
        }

        let adjustedWith = maxWidth;
        if (this.background) {
            adjustedWith -= Theme.Note.CodeBlock.Padding * 2;
        }

        this.calculatedEntries.clear();
        this.calculatedPositions.clear();

        const curPosition: Vector2 = new Vector2();
        const texSize: Vector2 = new Vector2();

        let currentLineHeight = 0;
        const currentLineText = new List<Text>();
        const currentLineWidths = new List<number>();

        for (let entryIndex = 0; entryIndex < this.entries.length; entryIndex++) {
            const entry = this.entries[entryIndex];

            let lines = entry.splitAtWidth(canvas, adjustedWith - curPosition.x);
            let i = 0;
            while (lines.length > 1 && i < 100) {
                i++;

                if (lines[0].get() === "" && currentLineText.count() === 0) {
                    if (lines[1].get().length === 1) {
                        lines[0] = lines[1];
                        break;
                    } else {
                        lines = lines[1].splitAtIndex(1);
                    }
                }

                if (lines[0].get() !== "") {
                    lines[0].resizeSize(canvas, 1, texSize);
                    currentLineHeight = Math.max(currentLineHeight, texSize.y);

                    currentLineText.push(lines[0]);
                    currentLineWidths.push(curPosition.x);
                }

                curPosition.y += currentLineHeight;

                for (let i = 0; i < currentLineText.count(); i++) {
                    this.calculatedEntries.push(currentLineText.at(i));
                    this.calculatedPositions.push(new Vector2(currentLineWidths.at(i), curPosition.y));
                }

                currentLineText.clear();
                currentLineWidths.clear();

                curPosition.y += Theme.Note.LineSpacing;
                currentLineHeight = 0;
                curPosition.x = 0;

                lines = lines[1].splitAtWidth(canvas, adjustedWith);
            }
            if (i === 100) {
                console.log(lines);
            }

            lines[0].resizeSize(canvas, 1, texSize);
            currentLineHeight = Math.max(currentLineHeight, texSize.y);

            currentLineText.push(lines[0]);
            currentLineWidths.push(curPosition.x);

            curPosition.x += texSize.x;
        }

        curPosition.y += currentLineHeight;

        for (let i = 0; i < currentLineText.count(); i++) {
            this.calculatedEntries.push(currentLineText.at(i));
            this.calculatedPositions.push(new Vector2(currentLineWidths.at(i), curPosition.y));
        }

        this.calculatedForWidth = maxWidth;
    }

    render(canvas: HtmlCanvas, position: Vector2, scale: number, maxWidth: number): number {
        this.calculateLayout(canvas, maxWidth);

        let padding = 0;
        if (this.background) {
            padding += Theme.Note.CodeBlock.Padding * scale;
        }

        let max = 0;
        for (let i = 0; i < this.calculatedEntries.count(); i++) {
            const entry = this.calculatedEntries.at(i);
            const pos = this.calculatedPositions.at(i);

            entry.render(canvas, scale, new Vector2(pos.x * scale + position.x + padding, pos.y * scale + position.y + padding));

            max = Math.max(max, pos.y * scale);
        }

        if (this.underline) {
            const y = position.y + max + scale * 5;
            canvas
                .strokeStyle(Theme.Note.FontColor)
                .lineWidth(Theme.Note.HeaderLineWidth * scale)
                .begin()
                .moveTo(position.x, y)
                .lineTo(position.x + maxWidth * scale, y)
                .stroke();
        }

        return max + padding * 2;
    }
}
