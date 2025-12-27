import { HtmlCanvas } from "../../libs";
import { Camera } from "../camera";
import { buildMarkdown } from "../markdown";
import { MarkdownEntry } from "../markdown/entry";
import { BoxStyle } from "../styles/box";
import { TextStyleConfig } from "../styles/text";
import { Theme } from "../theme";
import { Box } from "../utils/box";
import { Cfg } from "../utils/config";
import { Metadata, TextAlign, TextBaseline } from "../utils/constants";
import { Vector2 } from "../utils/vector";

export type NoteContentChangeCallback = (node: FlowNote, newContents: string) => void;
export type NoteWidthChangeCallback = (node: FlowNote, newWidth: number) => void;

export type FlowNoteConfig = Partial<{
    text: string;
    style: TextStyleConfig;
    metadata: Metadata;
    position: Vector2 | { x: number; y: number };
    width: number;
    locked: boolean;
    onWidthChange: NoteWidthChangeCallback;
    onContentChange: NoteContentChangeCallback;
}>;

export enum DragHandle {
    None,
    Left,
    Right,
}

const BOUNDS_SPACING = 20;
const BOX_SIZE = 10;

export class FlowNote {
    private originalText: string;
    private document: Array<MarkdownEntry>;
    private width: number;
    private edittingStyle: BoxStyle;

    private data: Metadata;
    private position: Vector2;
    private handleSelected: DragHandle;
    private edittingLayout: boolean;
    private lastRenderedBox: Box;
    private hovering: boolean;

    private widthChangeCallbacks: Array<NoteWidthChangeCallback>;
    private contentChangeCallbacks: Array<NoteContentChangeCallback>;

    private tempPosition: Vector2 = new Vector2();

    constructor(config?: FlowNoteConfig) {
        this.widthChangeCallbacks = new Array();
        this.contentChangeCallbacks = new Array();
        this.data = Cfg.value(config?.metadata, {});
        this.document = [];
        this.originalText = "";
        this.hovering = false;
        this.edittingLayout = config?.locked === undefined ? true : !config.locked;
        this.width = Cfg.value(config?.width, 500);
        if (config?.position) {
            if (config.position instanceof Vector2) {
                this.position = config.position;
            } else {
                this.position = new Vector2(config.position.x, config.position.y);
            }
        } else {
            this.position = new Vector2();
        }
        this.setText(Cfg.value(config?.text, ""));
        this.lastRenderedBox = new Box();
        this.handleSelected = DragHandle.None;

        this.edittingStyle = new BoxStyle({
            border: {
                color: "white",
                size: 1,
            },
        });

        if (config?.onWidthChange) {
            this.widthChangeCallbacks.push(config.onWidthChange);
        }

        if (config?.onContentChange) {
            this.contentChangeCallbacks.push(config.onContentChange);
        }
    }

    setText(text: string) {
        this.originalText = text;
        this.document = buildMarkdown(this.originalText);
        for (let i = 0; i < this.contentChangeCallbacks.length; i++) {
            this.contentChangeCallbacks[i](this, text);
        }
    }

    public setMetadataProperty(name: string, value: any) {
        this.data[name] = value;
    }

    public getMetadataProperty(name: string): any {
        return this.data[name];
    }

    text() {
        return this.originalText;
    }

    getWidth() {
        return this.width;
    }

    getPos() {
        return this.position;
    }

    translate(delta: Vector2) {
        this.position.x += delta.x;
        this.position.y += delta.y;
    }

    setPosition(position: Vector2) {
        this.position.copy(position);
    }

    getHandleSelected(): DragHandle {
        return this.handleSelected;
    }

    selectHandle(handle: DragHandle) {
        this.handleSelected = handle;
    }

    public setWidth(newWidth: number) {
        if (newWidth === undefined) {
            console.error("Attempted to set note's width to undefined");
        }
        this.width = newWidth;
        for (let i = 0; i < this.widthChangeCallbacks.length; i++) {
            this.widthChangeCallbacks[i](this, newWidth);
        }
    }

    public addWidthChangeListener(callback: NoteWidthChangeCallback) {
        if (callback === null || callback === undefined) {
            return;
        }
        this.widthChangeCallbacks.push(callback);
    }

    public addContentChangeListener(callback: NoteContentChangeCallback) {
        if (callback === null || callback === undefined) {
            return;
        }
        this.contentChangeCallbacks.push(callback);
    }

    render(canvas: HtmlCanvas, camera: Camera, mousePosition: Vector2 | undefined): void {
        if (this.edittingLayout && (this.hovering || this.handleSelected !== DragHandle.None)) {
            if (mousePosition) {
                if (this.handleSelected === DragHandle.Right) {
                    const leftPosition = this.position.x * camera.zoom + camera.position.x;
                    this.setWidth(Math.max((mousePosition.x - leftPosition) / camera.zoom, 1));
                } else if (this.handleSelected === DragHandle.Left) {
                    const scaledWidth = this.width * camera.zoom;
                    const rightPosition = this.position.x * camera.zoom + camera.position.x + scaledWidth;
                    this.setWidth(Math.max((rightPosition - mousePosition.x) / camera.zoom, 1));
                    this.position.x = rightPosition - this.width * camera.zoom - camera.position.x;
                    this.position.x /= camera.zoom;
                }
            }
            canvas.fillStyle("#293639");
            this.edittingStyle.outline(canvas, this.leftResizeHandleBox(), camera.zoom, 2);
            this.edittingStyle.outline(canvas, this.rightResizeHandleBox(), camera.zoom, 2);

            const left = this.lastRenderedBox.pos.x;
            const right = this.lastRenderedBox.pos.x + this.lastRenderedBox.size.x;
            const bottom = this.lastRenderedBox.pos.y;
            const top = this.lastRenderedBox.pos.y + this.lastRenderedBox.size.y;
            canvas
                .begin()
                .moveTo(left, bottom + this.lastRenderedBox.size.y / 2 - BOX_SIZE)
                .lineTo(left, bottom)
                .lineTo(right, bottom)
                .lineTo(right, bottom + this.lastRenderedBox.size.y / 2 - BOX_SIZE)
                .moveTo(left, top - this.lastRenderedBox.size.y / 2 + BOX_SIZE)
                .lineTo(left, top)
                .lineTo(right, top)
                .lineTo(right, top - this.lastRenderedBox.size.y / 2 + BOX_SIZE)
                .stroke();
        }

        camera.graphSpaceToScreenSpace(this.position, this.tempPosition);
        this.lastRenderedBox.pos.copy(this.tempPosition);

        const startY = this.tempPosition.y;
        const lineSpacing = Theme.Note.EntrySpacing * camera.zoom;

        canvas.alignText({ text: TextAlign.Left, baseline: TextBaseline.Alphabetic });
        for (let i = 0; i < this.document.length; i++) {
            const text = this.document[i];
            this.tempPosition.y += text.render(canvas, this.tempPosition, camera.zoom, this.width) + lineSpacing;
        }

        this.lastRenderedBox.pos.x -= BOUNDS_SPACING;
        this.lastRenderedBox.pos.y -= BOUNDS_SPACING;
        this.lastRenderedBox.size.x = camera.zoom * this.width + BOUNDS_SPACING * 2;
        this.lastRenderedBox.size.y = this.tempPosition.y - startY + BOUNDS_SPACING * 2;
    }

    leftResizeHandleBox() {
        return new Box(new Vector2(this.lastRenderedBox.pos.x - BOX_SIZE / 2, this.lastRenderedBox.pos.y + this.lastRenderedBox.size.y / 2 - BOX_SIZE / 2), new Vector2(BOX_SIZE, BOX_SIZE));
    }

    rightResizeHandleBox() {
        return new Box(
            new Vector2(this.lastRenderedBox.pos.x - BOX_SIZE / 2 + this.lastRenderedBox.size.x, this.lastRenderedBox.pos.y + this.lastRenderedBox.size.y / 2 - BOX_SIZE / 2),
            new Vector2(BOX_SIZE, BOX_SIZE),
        );
    }

    getEdittingLayout() {
        return this.edittingLayout;
    }

    setHovering(hovering: boolean) {
        this.hovering = hovering;
    }

    lock() {
        this.edittingLayout = false;
    }

    unlock() {
        this.edittingLayout = true;
    }

    bounds() {
        return this.lastRenderedBox;
    }
}
