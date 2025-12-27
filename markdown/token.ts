export enum MarkdownTokenType {
    NewLine,
    Whitespace,
    Tab,

    H1,
    H2,
    H3,
    H4,
    H5,
    H6,

    ListMarker,
    ListIndent,

    Star,
    DoubleStar,
    Tilde,
    DoubleTilde,

    Backtick,
    TripleBacktick,
    InlineCode,

    BlockQuote,

    LBracket,
    RBracket,
    LParen,
    RParen,
    Url,

    Text,

    EOF,
}

export class MarkdownToken {
    constructor(
        private _type: MarkdownTokenType,
        private _lexeme: string,
        private _start: number,
        private _end: number,
        private _lineStart: boolean,
    ) {}

    type() {
        return this._type;
    }

    lexeme() {
        return this._lexeme;
    }

    start() {
        return this._start;
    }

    end() {
        return this._end;
    }

    isLineStart() {
        return this._lineStart;
    }
}
