import { FontStrike, FontWeight } from "../styles/text";
import { Theme } from "../theme";
import { Text } from "../utils/text";
import { BasicMarkdownEntry, BlockQuoteMarkdownEntry, CodeBlockEntry, ListItem, MarkdownEntry, UnorderedListMarkdownEntry } from "./entry";
import { MarkdownToken, MarkdownTokenType } from "./token";

export class MarkdownParser {
    private i = 0;

    constructor(
        private tokens: MarkdownToken[],
        private source: string,
    ) {}

    parse(): MarkdownEntry[] {
        const entries: MarkdownEntry[] = [];

        while (!this.eof()) {
            const before = this.i;

            if (this.match(MarkdownTokenType.H1, MarkdownTokenType.H2, MarkdownTokenType.H3, MarkdownTokenType.H4, MarkdownTokenType.H5, MarkdownTokenType.H6)) {
                entries.push(this.parseHeading());
            } else if (this.match(MarkdownTokenType.TripleBacktick)) {
                entries.push(this.parseCodeBlock());
            } else if (this.match(MarkdownTokenType.BlockQuote)) {
                entries.push(this.parseBlockQuote());
            } else if (this.isListItem()) {
                entries.push(this.parseList());
            } else if (this.match(MarkdownTokenType.NewLine)) {
                this.i++;
            } else {
                entries.push(this.parseParagraph());
            }

            if (this.i === before) {
                console.warn("Parser stalled, skipping token:", this.current());
                this.i++;
            }
        }

        return entries;
    }

    private parseHeading(): MarkdownEntry {
        const level = this.current()!.type();
        this.i++;

        const texts: Text[] = [];

        while (!this.eof() && !this.match(MarkdownTokenType.NewLine)) {
            const t = this.current()!;

            switch (t.type()) {
                case MarkdownTokenType.Text:
                    const txt = new Text(t.lexeme());
                    texts.push(txt);
                    this.i++;
                    break;
                default:
                    this.i++;
                    break;
            }
        }

        this.skipNewline();

        for (const t of texts) {
            t.setColor(Theme.Note.FontColor);
            t.setWeight(FontWeight.Bold);
            t.setSize(
                level === MarkdownTokenType.H1
                    ? Theme.Note.H1.FontSize
                    : level === MarkdownTokenType.H2
                      ? Theme.Note.H2.FontSize
                      : level === MarkdownTokenType.H3
                        ? Theme.Note.H3.FontSize
                        : level === MarkdownTokenType.H4
                          ? Theme.Note.H4.FontSize
                          : level === MarkdownTokenType.H5
                            ? Theme.Note.H5.FontSize
                            : Theme.Note.H6.FontSize,
            );
        }

        return new BasicMarkdownEntry(texts, true, false);
    }

    private parseCodeBlock(): MarkdownEntry {
        this.i++;
        const start = this.tokens[this.i]?.start() ?? 0;

        while (!this.eof() && !this.match(MarkdownTokenType.TripleBacktick)) this.i++;

        const end = this.tokens[this.i]?.start() ?? start;
        this.i++;

        const text = new Text(this.source.slice(start, end));
        text.setColor(Theme.Note.FontColor);
        text.setSize(Theme.Note.FontSize);

        return new CodeBlockEntry(text);
    }

    private parseBlockQuote(): MarkdownEntry {
        let depth = 0;

        while (this.match(MarkdownTokenType.BlockQuote)) {
            depth++;
            this.i++;

            if (this.match(MarkdownTokenType.Whitespace)) {
                this.i++;
            }
        }

        const texts = this.parseInlineUntilNewline();
        this.skipNewline();
        this.applyNormalStyle(texts);

        for (const t of texts) {
            t.setIndent((depth - 1) * Theme.Note.QuoteIndent);
        }

        const entry = new BasicMarkdownEntry(texts, false, false);
        return new BlockQuoteMarkdownEntry(entry, depth);
    }

    private parseList(): MarkdownEntry {
        const items: ListItem[] = [];

        while (this.isListItem()) {
            let depth = 0;
            while (this.match(MarkdownTokenType.Tab)) {
                depth++;
                this.i++;
            }

            if (!this.match(MarkdownTokenType.ListMarker)) break;

            const markerToken = this.current()!;
            let marker: "*" | "-" | "+" | "[ ]" | "[x]" = "*";

            if (markerToken.lexeme() === "[ ]") marker = "[ ]";
            else if (markerToken.lexeme() === "[x]") marker = "[x]";
            else if ("*+-".includes(markerToken.lexeme())) marker = markerToken.lexeme() as "*" | "-" | "+";

            this.i++;

            const texts = this.parseInlineUntilNewline();
            this.skipNewline();
            this.applyNormalStyle(texts);

            const entry = new BasicMarkdownEntry(texts, false, false);
            items.push({ entry, depth, marker });
        }

        return new UnorderedListMarkdownEntry(items);
    }

    private parseParagraph(): MarkdownEntry {
        const texts = this.parseInlineUntilNewline();
        this.skipNewline();
        this.applyNormalStyle(texts);
        return new BasicMarkdownEntry(texts, false, false);
    }

    private parseInlineUntilNewline(): Text[] {
        const texts: Text[] = [];
        let bold = false;
        let italic = false;
        let strike = false;

        while (!this.eof() && !this.match(MarkdownTokenType.NewLine)) {
            const t = this.current()!;

            switch (t.type()) {
                case MarkdownTokenType.Star:
                    italic = !italic;
                    this.i++;
                    break;
                case MarkdownTokenType.DoubleStar:
                    bold = !bold;
                    this.i++;
                    break;
                case MarkdownTokenType.DoubleTilde:
                    strike = !strike;
                    this.i++;
                    break;
                case MarkdownTokenType.InlineCode:
                    const codeText = new Text(t.lexeme());
                    codeText.getStyle().setFont("monospace").setWeight(FontWeight.Bold);
                    texts.push(codeText);
                    this.i++;
                    break;
                default:
                    const txt = new Text(t.lexeme());
                    if (bold) txt.setWeight(FontWeight.Bold);
                    if (italic) txt.getStyle().setItalic(true);
                    if (strike) txt.getStyle().setStrike(FontStrike.Line);
                    texts.push(txt);
                    this.i++;
                    break;
            }
        }

        return texts;
    }

    private applyNormalStyle(texts: Text[]) {
        for (const t of texts) {
            t.setColor(Theme.Note.FontColor);
            t.setSize(Theme.Note.FontSize);
        }
    }

    private isListItem(): boolean {
        let j = this.i;
        while (this.tokens[j]?.type() === MarkdownTokenType.Tab) j++;
        return this.tokens[j]?.type() === MarkdownTokenType.ListMarker;
    }

    private skipNewline() {
        if (this.match(MarkdownTokenType.NewLine)) this.i++;
    }

    private match(...types: MarkdownTokenType[]) {
        const t = this.current();
        return !!t && types.includes(t.type());
    }

    private current() {
        return this.tokens[this.i];
    }

    private eof() {
        return this.i >= this.tokens.length;
    }
}
