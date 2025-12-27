import { HtmlCanvas } from "../.";
import { Camera } from "../camera";
import { RenderResults } from "../graph";
import { ContextMenuConfig } from "../menu/context";
import { List } from "./list";
import { Vector2 } from "./vector";

type RenderLambda = () => void;

export class Subsystem {
    private queue_l: List<RenderLambda>;

    constructor() {
        this.queue_l = new List();
    }

    queue(lambda: RenderLambda) {
        if (!lambda) {
            return;
        }
        this.queue_l.push(lambda);
    }

    render(_canvas: HtmlCanvas, _camera: Camera, _mousePosition: Vector2 | undefined): RenderResults | undefined {
        for (let i = 0; i < this.queue_l.count(); i++) {
            this.queue_l.at(i)();
        }
        this.queue_l.clear();
        return;
    }

    openContextMenu(_canvas: HtmlCanvas, _position: Vector2): ContextMenuConfig | null {
        // Left intentionally blank
        return null;
    }

    clickStart(_mousePosition: Vector2, _camera: Camera, _ctrlKey: boolean) {
        // Left intentionally blank
        return false;
    }

    mouseDragEvent(_delta: Vector2, _scale: number) {
        // Left intentionally blank
        return false;
    }

    clickEnd() {
        // Left intentionally blank
    }
}
