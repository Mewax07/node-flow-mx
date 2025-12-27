import { MarkdownEntry } from "./entry";
import { MarkdownLexer } from "./lexer";
import { MarkdownParser } from "./parser";

export function buildMarkdown(data: string): Array<MarkdownEntry> {
    const lexer = new MarkdownLexer(data);
    const tokens = lexer.lex();
    // console.log(tokens);

    const parser = new MarkdownParser(tokens, data);
    const content = parser.parse();
    // console.log(content);

    return content;
}
