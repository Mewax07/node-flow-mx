import { HtmlCanvas } from "../mx";
import { Camera } from "./camera";
import { RenderResults } from "./graph";
import { ContextMenuConfig } from "./menu/context";
import { Vector2 } from "./utils/vector";

export abstract class GraphSubsystem {
    abstract render(canvas: HtmlCanvas, camera: Camera, mousePos: Vector2 | undefined): RenderResults | undefined;
    abstract openContextMenu(canvas: HtmlCanvas, pos: Vector2): ContextMenuConfig | null;
    abstract clickStart(mousePos: Vector2, camera: Camera, ctrlKey: boolean): boolean;
    abstract mouseDragEvent(delta: Vector2, scale: number): boolean;
    abstract clickEnd(): void;
}
