import { MarkdownToken, MarkdownTokenType } from "./token";

export class MarkdownLexer {
    private i = 0;
    private tokens: MarkdownToken[] = [];
    private isLineStart = true;

    constructor(private src: string) {}

    lex(): MarkdownToken[] {
        while (!this.eof()) {
            const c = this.current();

            if (c === "\n") {
                this.emit(MarkdownTokenType.NewLine, "\n");
                this.i++;
                this.isLineStart = true;
                continue;
            }

            if (c === "\t") {
                this.emit(MarkdownTokenType.Tab, "\t");
                this.i++;
                continue;
            }

            if (c === " ") {
                this.lexWhitespace();
                continue;
            }

            if (this.isLineStart && c === ">") {
                while (this.match(">")) {
                    this.emit(MarkdownTokenType.BlockQuote, ">");
                    this.i++;

                    if (this.match(" ")) {
                        this.emit(MarkdownTokenType.Whitespace, " ");
                        this.i++;
                    }
                }
                this.isLineStart = false;
                continue;
            }

            if (this.isLineStart && this.match("```")) {
                this.emit(MarkdownTokenType.TripleBacktick, "```");
                this.i += 3;
                this.isLineStart = false;
                continue;
            }

            if (this.isLineStart && c === "#") {
                this.lexHeading();
                continue;
            }

            if (this.isLineStart && this.isListMarker()) {
                this.lexListMarker();
                continue;
            }

            if (this.match("~~")) {
                this.emit(MarkdownTokenType.DoubleTilde, "~~");
                this.i += 2;
                continue;
            }

            if (this.match("**")) {
                this.emit(MarkdownTokenType.DoubleStar, "**");
                this.i += 2;
                continue;
            }

            if (c === "*") {
                this.emit(MarkdownTokenType.Star, "*");
                this.i++;
                continue;
            }

            if (c === "`") {
                this.lexInlineCode();
                continue;
            }

            if ("[]()".includes(c)) {
                const map: any = {
                    "[": MarkdownTokenType.LBracket,
                    "]": MarkdownTokenType.RBracket,
                    "(": MarkdownTokenType.LParen,
                    ")": MarkdownTokenType.RParen,
                };
                this.emit(map[c], c);
                this.i++;
                continue;
            }

            this.lexText();
        }

        this.emit(MarkdownTokenType.EOF, "");
        return this.tokens;
    }

    private lexHeading() {
        let level = 0;
        const start = this.i;

        while (this.current() === "#" && level < 6) {
            level++;
            this.i++;
        }

        const type =
            level === 1
                ? MarkdownTokenType.H1
                : level === 2
                  ? MarkdownTokenType.H2
                  : level === 3
                    ? MarkdownTokenType.H3
                    : level === 4
                      ? MarkdownTokenType.H4
                      : level === 5
                        ? MarkdownTokenType.H5
                        : MarkdownTokenType.H6;

        this.emit(type, this.src.slice(start, this.i));
        this.isLineStart = false;
    }

    private lexWhitespace() {
        const start = this.i;
        while (!this.eof() && this.current() === " ") this.i++;
        this.emit(MarkdownTokenType.Whitespace, this.src.slice(start, this.i));
    }

    private lexInlineCode() {
        this.i++;
        const start = this.i;
        while (!this.eof() && this.current() !== "`") this.i++;
        this.emit(MarkdownTokenType.InlineCode, this.src.slice(start, this.i));
        this.i++;
    }

    private lexListMarker() {
        if (this.match("[ ]")) {
            this.emit(MarkdownTokenType.ListMarker, "[ ]");
            this.i += 3;
        } else if (this.match("[x]")) {
            this.emit(MarkdownTokenType.ListMarker, "[x]");
            this.i += 3;
        } else {
            this.emit(MarkdownTokenType.ListMarker, this.current());
            this.i++;
        }
        this.isLineStart = false;
    }

    private isListMarker(): boolean {
        if ((this.current() === "*" || this.current() === "-" || this.current() === "+") && this.peek() === " ") return true;
        if (this.match("[ ]") || this.match("[x]")) return true;
        return false;
    }

    private lexText() {
        const start = this.i;
        while (!this.eof()) {
            const c = this.current();
            if ("\n\t*`[]()~>".includes(c)) break;
            this.i++;
        }
        this.emit(MarkdownTokenType.Text, this.src.slice(start, this.i));
        this.isLineStart = false;
    }

    private emit(type: MarkdownTokenType, lexeme: string) {
        this.tokens.push(new MarkdownToken(type, lexeme, this.i, this.i + lexeme.length, this.isLineStart));
    }

    private match(s: string) {
        return this.src.substr(this.i, s.length) === s;
    }

    private current() {
        return this.src[this.i];
    }

    private peek() {
        return this.src[this.i + 1];
    }

    private eof() {
        return this.i >= this.src.length;
    }
}
