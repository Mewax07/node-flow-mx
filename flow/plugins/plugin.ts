import { HtmlCanvas, RenderResults } from "..";
import { Camera } from "../camera";
import { combineContextMenus, ContextMenuConfig } from "../menu/context";
import { NodeSubsystem } from "../nodes/subsystem";
import { NoteSubsystem } from "../notes/subsystem";
import { exec } from "../utils/constants";
import { Vector2 } from "../utils/vector";

export abstract class Plugin {
    abstract render(canvas: HtmlCanvas, camera: Camera, mousePos: Vector2 | undefined, nodesGraph: NodeSubsystem, notesGraph: NoteSubsystem): RenderResults | undefined;
    abstract openContextMenu(canvas: HtmlCanvas, pos: Vector2): ContextMenuConfig | null;
    abstract clickStart(mousePos: Vector2, camera: Camera, ctrlKey: boolean): boolean;
    abstract mouseDragEvent(delta: Vector2, scale: number): boolean;
    abstract clickEnd(): void;
}

export class PluginManager {
    private subsys: Array<Plugin>;

    constructor(
        subsys: Array<Plugin>,
        private nodesGraph: NodeSubsystem,
        private notesGraph: NoteSubsystem,
    ) {
        this.subsys = subsys;
    }

    register(plugin: Plugin) {
        this.subsys.push(plugin);
    }

    clickStart(mousePos: Vector2, camera: Camera, ctrlKey: boolean) {
        for (let i = this.subsys.length - 1; i >= 0; i--) {
            if (this.subsys[i].clickStart(mousePos, camera, ctrlKey)) {
                return;
            }
        }
    }

    openContextMenu(canvas: HtmlCanvas, pos: Vector2): ContextMenuConfig {
        let finalConfig: ContextMenuConfig = {};

        for (let i = 0; i < this.subsys.length; i++) {
            const subSystemMenu = this.subsys[i].openContextMenu(canvas, pos);
            if (subSystemMenu !== null) {
                finalConfig = combineContextMenus(finalConfig, subSystemMenu);
            }
        }

        return finalConfig;
    }

    clickEnd(): void {
        for (let i = 0; i < this.subsys.length; i++) {
            this.subsys[i].clickEnd();
        }
    }

    mouseDragEvent(delta: Vector2, scale: number): boolean {
        for (let i = 0; i < this.subsys.length; i++) {
            if (this.subsys[i].mouseDragEvent(delta, scale)) {
                return true;
            }
        }
        return false;
    }

    render(canvas: HtmlCanvas, camera: Camera, mousePos: Vector2 | undefined): RenderResults {
        const results: RenderResults = {};

        for (let i = 0; i < this.subsys.length; i++) {
            exec("Render_Subsystem_" + i, () => {
                let results = this.subsys[i].render(canvas, camera, mousePos, this.nodesGraph, this.notesGraph);
                if (results?.cursorStyle) {
                    results.cursorStyle = results?.cursorStyle;
                }
            });
        }

        return results;
    }
}
