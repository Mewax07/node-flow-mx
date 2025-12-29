import { HtmlCanvas, RenderResults, Theme } from "..";
import { Camera } from "../camera";
import { ContextMenuConfig } from "../menu/context";
import { NodeSubsystem } from "../nodes/subsystem";
import { NoteSubsystem } from "../notes/subsystem";
import { Box } from "../utils/box";
import { Cfg } from "../utils/config";
import { Vector2 } from "../utils/vector";
import { Plugin } from "./plugin";

export type MinimapConfig = Partial<{
    width: number; // value between 0 and 1;
    height: number; // value between 0 and 1;

    padding: number;

    minMapZoom: number;
    maxMapZoom: number;
    mapZoomFactor: number; // default 0.6
}>;

export class Minimap extends Plugin {
    private width: number;
    private height: number;

    private padding: number;

    private minMapZoom: number;
    private maxMapZoom: number;
    private mapZoomFactor: number;

    constructor(config?: MinimapConfig) {
        super();
        this.width = Cfg.value(config?.width, 0.16);
        this.height = Cfg.value(config?.height, 0.16);
        this.padding = Cfg.value(config?.padding, 10);
        this.minMapZoom = Cfg.value(config?.minMapZoom, 0.5);
        this.maxMapZoom = Cfg.value(config?.maxMapZoom, 1.0);
        this.mapZoomFactor = Cfg.value(config?.mapZoomFactor, 0.6);
    }

    render(canvas: HtmlCanvas, camera: Camera, _mousePos: Vector2 | undefined, graph: NodeSubsystem, note: NoteSubsystem): RenderResults | undefined {
        const nodes = graph.getNodes();
        const notes = note.getNotes();

        if (nodes.length + notes.length <= 0) return;

        const canvasW = canvas.getWidth();
        const canvasH = canvas.getHeight();

        const minimapWidth = canvasW * this.width;
        const minimapHeight = canvasH * this.height;
        const padding = this.padding;

        const minimapX = canvasW - minimapWidth - padding;
        const minimapY = canvasH - minimapHeight - padding;

        canvas.fillStyle(Theme.Minimap.BackgroundColor).rect(minimapX, minimapY, minimapWidth, minimapHeight);

        const minMapZoom = this.minMapZoom;
        const maxMapZoom = this.maxMapZoom;
        const minimapZoom = Math.max(minMapZoom, Math.min(maxMapZoom, this.mapZoomFactor / camera.zoom));

        const centerX = canvasW * 0.5;
        const centerY = canvasH * 0.5;

        const viewW = minimapWidth * minimapZoom;
        const viewH = minimapHeight * minimapZoom;

        const viewX = minimapX + (minimapWidth - viewW) * 0.5;
        const viewY = minimapY + (minimapHeight - viewH) * 0.5;

        canvas.save().begin();
        canvas.ctx.rect(minimapX, minimapY, minimapWidth, minimapHeight);
        canvas.ctx.clip();

        for (const note of notes) {
            const b = note.getRenderingBox();

            const x = minimapX + ((b.pos.x - centerX) / canvasW) * minimapWidth * minimapZoom + minimapWidth * 0.5;

            const y = minimapY + ((b.pos.y - centerY) / canvasH) * minimapHeight * minimapZoom + minimapHeight * 0.5;

            const w = (b.size.x / canvasW) * minimapWidth * minimapZoom;
            const h = (b.size.y / canvasH) * minimapHeight * minimapZoom;

            canvas.fillStyle(Theme.Minimap.NoteFill).roundedRect(x, y, w, h, 2);
            canvas.lineWidth(Theme.Minimap.LineWidth).strokeStyle(Theme.Minimap.NoteStroke).roundedRect(x, y, w, h, 2, "s");
        }

        for (const node of nodes) {
            const b = node.calculateBounds(canvas, camera);

            const x = minimapX + ((b.pos.x - centerX) / canvasW) * minimapWidth * minimapZoom + minimapWidth * 0.5;

            const y = minimapY + ((b.pos.y - centerY) / canvasH) * minimapHeight * minimapZoom + minimapHeight * 0.5;

            const w = (b.size.x / canvasW) * minimapWidth * minimapZoom;
            const h = (b.size.y / canvasH) * minimapHeight * minimapZoom;

            canvas.fillStyle(Theme.Minimap.NodeFill).roundedRect(x, y, w, h, 2);
            canvas.lineWidth(Theme.Minimap.LineWidth).strokeStyle(Theme.Minimap.NodeStroke).roundedRect(x, y, w, h, 2, "s");
        }

        canvas.restore();

        canvas.save().begin();

        canvas.fillStyle("rgba(10, 10, 10, 0.4)");
        canvas.rect(minimapX, minimapY, minimapWidth, viewY - minimapY);
        canvas.rect(minimapX, viewY + viewH, minimapWidth, minimapY + minimapHeight - (viewY + viewH));
        canvas.rect(minimapX, viewY, viewX - minimapX, viewH);
        canvas.rect(viewX + viewW, viewY, minimapX + minimapWidth - (viewX + viewW), viewH);

        canvas.restore();

        canvas.lineWidth(Theme.Minimap.LineWidth).strokeStyle(Theme.Minimap.ViewportStroke).rect(viewX, viewY, viewW, viewH, "s");
        canvas.lineWidth(Theme.Minimap.LineWidth).strokeStyle(Theme.Minimap.BorderColor).rect(minimapX, minimapY, minimapWidth, minimapHeight, "s");
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

    // For click
    size(canvas: HtmlCanvas): Box {
        const canvasW = canvas.getWidth();
        const canvasH = canvas.getHeight();

        const minimapWidth = canvasW * this.width;
        const minimapHeight = canvasH * this.height;
        const padding = this.padding;

        const minimapX = canvasW - minimapWidth - padding;
        const minimapY = canvasH - minimapHeight - padding;

        return new Box(new Vector2(minimapX, minimapY), new Vector2(minimapWidth, minimapHeight));
    }
}
