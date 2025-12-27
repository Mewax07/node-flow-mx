import type { HtmlCanvas } from "../libs";
import { Camera } from "./camera";
import { Connection } from "./connection";
import { MouseObserver } from "./input";
import { combineContextMenus, ContextEntry, ContextMenu, ContextMenuConfig } from "./menu/context";
import { FlowNode } from "./node";
import { NodeCreatedCallback, NodeFactoryConfig } from "./nodes/factory";
import { Publisher } from "./nodes/publisher";
import { ConnectionRendererConfig, NodeAddedCallback, NodeRemovedCallback, NodeSubsystem } from "./nodes/subsystem";
import { FlowNote } from "./notes/note";
import { NoteAddedCallback, NoteDragStartCallback, NoteDragStopCallback, NoteRemovedCallback, NoteSubsystem, NoteSubsystemConfig } from "./notes/subsystem";
import { CursorStyle } from "./styles/cursor";
import { Theme } from "./theme";
import { Cfg } from "./utils/config";
import { clamp01, exec } from "./utils/constants";
import { VectorPool } from "./utils/pool";
import { Subsystem } from "./utils/subsys";
import { Vector2 } from "./utils/vector";

export type GraphRenderer = (canvas: HtmlCanvas, position: Vector2, scale: number) => void;

const contextMenuGroup = "graph-context-menu";

function buildBackgroundRenderer(backgroundColor: string) {
    return (canvas: HtmlCanvas, position: Vector2, scale: number) => {
        canvas.fillStyle(backgroundColor);
        canvas.rect(0, 0, canvas.getWidth(), canvas.getHeight());

        const alpha = Math.round(clamp01(scale - 0.3) * 255);
        if (alpha <= 0) {
            return;
        }

        canvas.fillStyle(`rgba(41, 54, 57, ${alpha})`);
        const { x: px, y: py } = position;
        const s = 100 * scale;
        const r = 2 * scale;
        const pi2 = 2 * Math.PI;

        for (let x = -50; x < 50; x++) {
            const xPos = x * s + px;
            for (let y = -50; y < 50; y++) {
                const yPos = y * s + py;
                canvas.begin();
                canvas.arc(xPos, yPos, r, 0, pi2);
            }
        }
    };
}

export type FlowNodeGraphConfig = Partial<{
    backgroundRenderer: GraphRenderer;
    backgroundColor: string;

    idleConnection: ConnectionRendererConfig;

    contextMenu: ContextMenuConfig;

    nodes: NodeFactoryConfig;
    board: NoteSubsystemConfig;
}>;

export interface RenderResults {
    cursorStyle?: CursorStyle;
}

export interface GraphSubsystem {
    render(canvas: HtmlCanvas, camera: Camera, mousePos: Vector2 | undefined): RenderResults | undefined;

    openContextMenu(canvas: HtmlCanvas, pos: Vector2): ContextMenuConfig | null;

    clickStart(mousePos: Vector2, camera: Camera, ctrlKey: boolean): boolean;

    mouseDragEvent(delta: Vector2, scale: number): boolean;

    clickEnd(): void;
}

interface OpenContextMenu {
    menu: ContextMenu;
    pos: Vector2;
}

// interface OpenQuickMenu {
//     // menu: QuickMenu;
//     pos: Vector2;
// }

export class GraphView {
    private subsys: Array<GraphSubsystem>;

    constructor(subsys: Array<GraphSubsystem>) {
        this.subsys = subsys;
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
                let results = this.subsys[i].render(canvas, camera, mousePos);
                if (results?.cursorStyle) {
                    results.cursorStyle = results?.cursorStyle;
                }
            });
        }

        return results;
    }
}

export class NodeFlowGraph {
    private canvas: HtmlCanvas;

    private backgroundRenderer: GraphRenderer;

    private contextMenuConfig: ContextMenuConfig;

    private mousePosition: Vector2 | undefined;
    private camera: Camera;

    private openedContextMenu: OpenContextMenu | null;
    // private openQuickMenu: OpenQuickMenu | null;
    private contextMenuEntryHovering: ContextEntry | null;

    private views: Array<GraphView>;
    private currentView_n: number;

    private mainNodeSubsystem: NodeSubsystem;
    private mainNoteSubsystem: NoteSubsystem;

    private lastFrameCursor: CursorStyle;
    private cursor: CursorStyle;

    constructor(canvas: HtmlCanvas, config?: FlowNodeGraphConfig) {
        const postProcess = new Subsystem();

        this.mainNodeSubsystem = new NodeSubsystem(postProcess, {
            nodes: config?.nodes,
            idleConnection: config?.idleConnection,
        });

        this.lastFrameCursor = CursorStyle.Default;
        this.cursor = CursorStyle.Default;

        this.mainNoteSubsystem = new NoteSubsystem(config?.board);

        this.views = [new GraphView([this.mainNoteSubsystem, this.mainNodeSubsystem, postProcess])];
        this.currentView_n = 0;

        this.camera = new Camera();

        this.contextMenuConfig = combineContextMenus(
            {
                items: [
                    {
                        name: "Reset View",
                        group: contextMenuGroup,
                        callback: this.camera.reset.bind(this.camera),
                    },
                ],
            },
            config?.contextMenu,
        );

        this.openedContextMenu = null;
        // this.openQuickMenu = null;
        this.contextMenuEntryHovering = null;

        this.canvas = canvas;

        if (config?.backgroundRenderer) {
            this.backgroundRenderer = config.backgroundRenderer;
        } else {
            const backgroundColor = Cfg.value(config?.backgroundColor, Theme.Graph.BackgroundColor);
            this.backgroundRenderer = buildBackgroundRenderer(backgroundColor);
        }

        window.requestAnimationFrame(this.render.bind(this));

        this.canvas.on("wheel", (e) => {
            e.preventDefault();
            this.zoom(Math.sign(e.deltaY));
        });

        new MouseObserver(
            this.canvas,
            this.mouseDragEvent.bind(this),

            (mousePosition) => {
                this.mousePosition = mousePosition;
            },

            this.clickStart.bind(this),
            this.clickEnd.bind(this),
            this.openContextMenu.bind(this),
        );
    }

    public addNoteAddedListener(callback: NoteAddedCallback): void {
        this.mainNoteSubsystem.addNoteAddedListener(callback);
    }

    public addNoteRemovedListener(callback: NoteRemovedCallback): void {
        this.mainNoteSubsystem.addNoteRemovedListener(callback);
    }

    public addNoteDragStartListener(callback: NoteDragStartCallback): void {
        this.mainNoteSubsystem.addNoteDragStartListener(callback);
    }

    public addNoteDragStopListener(callback: NoteDragStopCallback): void {
        this.mainNoteSubsystem.addNoteDragStopListener(callback);
    }

    public addOnNodeCreatedListener(callback: NodeCreatedCallback): void {
        this.mainNodeSubsystem.addOnNodeCreatedListener(callback);
    }

    public addOnNodeAddedListener(callback: NodeAddedCallback): void {
        this.mainNodeSubsystem.addOnNodeAddedListener(callback);
    }

    public addOnNodeRemovedListener(callback: NodeRemovedCallback): void {
        this.mainNodeSubsystem.addOnNodeRemovedListener(callback);
    }

    zoom(amount: number) {
        let oldPos: Vector2 | undefined = undefined;
        if (this.mousePosition) {
            oldPos = this.screenPositionToGraphPosition(this.mousePosition);
        }

        this.camera.zoom += amount * this.camera.zoom * 0.05;

        if (!oldPos || !this.mousePosition) {
            return;
        }

        const newPos = this.screenPositionToGraphPosition(this.mousePosition);
        this.camera.position.x += (newPos.x - oldPos.x) * this.camera.zoom;
        this.camera.position.y += (newPos.y - oldPos.y) * this.camera.zoom;
    }

    private screenPositionToGraphPosition(screenPosition: Vector2): Vector2 {
        const out = new Vector2();
        this.camera.graphSpaceToScreenSpace(screenPosition, out);
        return out;
    }

    private clickStart(mousePosition: Vector2, ctrlKey: boolean) {
        if (this.contextMenuEntryHovering !== null) {
            this.contextMenuEntryHovering.click();
            this.openedContextMenu = null;
            this.contextMenuEntryHovering = null;
            return;
        }
        this.openedContextMenu = null;
        // this.openQuickMenu = null;
        this.contextMenuEntryHovering = null;

        this.mousePosition = mousePosition;
        this.currentView().clickStart(mousePosition, this.camera, ctrlKey);
    }

    currentView(): GraphView {
        return this.views[this.currentView_n];
    }

    organize() {
        this.mainNodeSubsystem.organize(this.canvas);
    }

    addPublisher(id: string, pub: Publisher) {
        this.mainNodeSubsystem.addPublisher(id, pub);
    }

    getNodes() {
        return this.mainNodeSubsystem.getNodes();
    }

    connectedInputsNodeReferences(nodeIndex: number): Array<FlowNode> {
        return this.mainNodeSubsystem.connectedInputsNodeReferencesByIndex(nodeIndex);
    }

    connectedOutputsNodeReferences(nodeIndex: number): Array<FlowNode> {
        return this.mainNodeSubsystem.connectedOutputsNodeReferences(nodeIndex);
    }

    connectNodes(nodeOut: FlowNode, outPort: number, nodeIn: FlowNode, inPort: number): Connection | undefined {
        return this.mainNodeSubsystem.connectNodes(nodeOut, outPort, nodeIn, inPort);
    }

    addNode(node: FlowNode) {
        this.mainNodeSubsystem.addNode(node);
    }

    removeNode(node: FlowNode) {
        this.mainNodeSubsystem.removeNode(node);
    }

    addNote(note: FlowNote): void {
        this.mainNoteSubsystem.addNote(note);
    }

    private sceenPositionToGraphPosition(screenPosition: Vector2): Vector2 {
        const out = new Vector2();
        this.camera.screenSpaceToGraphSpace(screenPosition, out);
        return out;
    }

    private openContextMenu(position: Vector2): void {
        let finalConfig = this.contextMenuConfig;

        const contextMenuPosition = this.sceenPositionToGraphPosition(position);

        finalConfig = combineContextMenus(finalConfig, this.currentView().openContextMenu(this.canvas, contextMenuPosition));

        this.openedContextMenu = {
            menu: new ContextMenu(finalConfig),
            pos: contextMenuPosition,
        };
    }

    private clickEnd() {
        this.currentView().clickEnd();
    }

    private mouseDragEvent(delta: Vector2) {
        let draggingSomething = this.currentView().mouseDragEvent(delta, this.camera.zoom);
        if (!draggingSomething) {
            this.camera.position.x += delta.x;
            this.camera.position.y += delta.y;
        }
    }

    private render() {
        if (this.canvas.elm.parentNode) {
            let rect = (this.canvas.elm.parentNode as any).getBoundingClientRect();
            this.canvas.resize(rect.width, rect.height);
        }

        this.cursor = CursorStyle.Default;

        exec("Render_Background", this.renderBackground.bind(this));

        exec("Render_View_" + this.currentView_n, () => {
            let results = this.currentView().render(this.canvas, this.camera, this.mousePosition);
            if (results?.cursorStyle) {
                results.cursorStyle = results?.cursorStyle;
            }
        });

        exec("Render_Context", this.renderContextMenu.bind(this));

        // exec("Render_QuickMenu", this.renderQuickMenu.bind(this));

        if (this.lastFrameCursor !== this.cursor) {
            this.canvas.elm.style.cursor = this.cursor;
        }
        this.lastFrameCursor = this.cursor;

        window.requestAnimationFrame(this.render.bind(this));
    }

    private renderBackground() {
        this.backgroundRenderer(this.canvas, this.camera.position, this.camera.zoom);
    }

    private renderContextMenu() {
        VectorPool.run(() => {
            if (this.openedContextMenu !== null) {
                const pos = VectorPool.get();
                this.camera.graphSpaceToScreenSpace(this.openedContextMenu.pos, pos);
                this.contextMenuEntryHovering = this.openedContextMenu.menu.render(this.canvas, pos, this.camera.zoom, this.mousePosition, true);

                if (this.contextMenuEntryHovering !== null) {
                    this.cursor = CursorStyle.Pointer;
                }
            }
        });
    }
}
