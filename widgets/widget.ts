import { HtmlCanvas } from "../../libs";
import { Box } from "../utils/box";
import { Vector2 } from "../utils/vector";

export const width = 150;
export const height = 25;

export abstract class Widget {
    abstract size(): Vector2;
    abstract draw(canvas: HtmlCanvas, position: Vector2, scale: number, mousePosition: Vector2 | undefined): Box;
    abstract clickStart(): void;
    abstract clickEnd(): void;
}