import { HtmlCanvas } from ".";
import { FlowNode } from "./node";
import { Port } from "./port";
import { Vector2 } from "./utils/vector";

export interface ConnectionRendererParams {
    canvas: HtmlCanvas;
    start: Vector2;
    end: Vector2;
    scale: number;
    mouseOver: boolean;

    inNode: FlowNode | null;
    inPort: Port | null;
    outNode: FlowNode | null;
    outPort: Port | null;
}

export type ConnectionRenderer = (params: ConnectionRendererParams) => void;

export function defaultConnectionRenderer(connectionSize: number, connectionColor: string | undefined, mouseOverSize: number, mouseOverColor: string | undefined): ConnectionRenderer {
    return (params: ConnectionRendererParams) => {
        let color = "#00FF00";
        if (params.outPort) {
            color = params.outPort.filledStyleColor();
        } else if (params.inPort) {
            color = params.inPort.filledStyleColor();
        }

        let lineSize = connectionSize * params.scale;
        if (connectionColor) {
            color = connectionColor;
        }

        if (params.mouseOver || params.inNode?.getSelected() || params.outNode?.getSelected()) {
            lineSize = mouseOverSize * params.scale;
            params.canvas.shadowBlur(25 * params.scale);

            if (mouseOverColor) {
                color = mouseOverColor;
            }

            params.canvas.shadowColor(color);
        }

        params.canvas.strokeStyle(color).lineWidth(lineSize).bezierCurve(params.start.x, params.start.y, params.end.x, params.end.y).shadowBlur(0);
    };
}

export class Connection {
    private inPos: Vector2;
    private outPos: Vector2;

    private inNode: FlowNode | null;
    private inNodePortIndex: number;
    private outNode: FlowNode | null;
    private outNodePortIndex: number;
    private renderer: ConnectionRenderer;

    constructor(inNode: FlowNode | null, inNodePortIndex: number, outNode: FlowNode | null, outNodePortIndex: number, renderer: ConnectionRenderer) {
        this.inNode = inNode;
        this.inNodePortIndex = inNodePortIndex;
        this.outNode = outNode;
        this.outNodePortIndex = outNodePortIndex;
        this.renderer = renderer;

        this.inPos = new Vector2();
        this.outPos = new Vector2();

        if (inNode !== null) {
            inNode.inputPort(this.inNodePortIndex).addConnection(this);
        }

        if (outNode !== null) {
            outNode.outputPort(this.outNodePortIndex).addConnection(this);
        }
    }

    render(canvas: HtmlCanvas, scale: number, mouseOver: boolean, mousePos: Vector2 | undefined): void {
        if (this.inNode === null && this.outNode === null) {
            return;
        }

        if (this.inNode !== null) {
            const inPortBox = this.inNode.inputPortPosition(this.inNodePortIndex);
            if (inPortBox === undefined) {
                return;
            }
            inPortBox.boxCenter(this.inPos);
        } else if (mousePos) {
            this.inPos.x = mousePos.x;
            this.inPos.y = mousePos.y;
        } else {
            return;
        }

        if (this.outNode !== null) {
            const outPortBox = this.outNode.outputPortPosition(this.outNodePortIndex);
            if (outPortBox === undefined) {
                return;
            }
            outPortBox.boxCenter(this.outPos);
        } else if (mousePos) {
            this.outPos.x = mousePos.x;
            this.outPos.y = mousePos.y;
        } else {
            return;
        }

        this.renderer({
            canvas,
            start: this.inPos,
            end: this.outPos,
            scale,
            mouseOver,

            inPort: this.inPort(),
            inNode: this.inNode,
            outPort: this.outPort(),
            outNode: this.outNode,
        });
    }

    getInNode(): FlowNode | null {
        return this.inNode;
    }

    getOutNode(): FlowNode | null {
        return this.outNode;
    }

    clearPort(mousePosition: Vector2): void {
        if (this.inNode !== null) {
            const inPortBox = this.inNode.inputPortPosition(this.inNodePortIndex);
            if (inPortBox !== undefined && inPortBox.contains(mousePosition)) {
                this.clearInput();
            }
        }

        if (this.outNode !== null) {
            const outPortBox = this.outNode.outputPortPosition(this.outNodePortIndex);
            if (outPortBox !== undefined && outPortBox.contains(mousePosition)) {
                this.clearOutput();
            }
        }
    }

    clearPorts(): void {
        this.clearInput();
        this.clearOutput();
    }

    setInput(node: FlowNode, portIndex: number, replace?: boolean): void {
        this.inNode = node;
        this.inNodePortIndex = portIndex;

        const port = this.inNode.inputPort(portIndex);
        if (!!replace && port.getConnections().length > 0) {
            port.replaceConnection(this, 0);
        } else {
            port.addConnection(this);
        }
    }

    setOutput(node: FlowNode, portIndex: number): void {
        this.outNode = node;
        this.outNodePortIndex = portIndex;
        this.outNode.outputPort(portIndex).addConnection(this);
    }

    clearInput() {
        this.inNode?.inputPort(this.inNodePortIndex).clearConnection(this);
        this.inNode = null;
        this.inNodePortIndex = -1;
    }

    clearOutput() {
        this.outNode?.outputPort(this.outNodePortIndex).clearConnection(this);
        this.outNode = null;
        this.outNodePortIndex = -1;
    }

    mouseOverPort(mousePosition: Vector2): Port | null {
        if (this.inNode !== null) {
            const inPortBox = this.inNode.inputPortPosition(this.inNodePortIndex);
            if (inPortBox !== undefined && inPortBox.contains(mousePosition)) {
                return this.inNode.inputPort(this.inNodePortIndex);
            }
        }

        if (this.outNode !== null) {
            const outPortBox = this.outNode.outputPortPosition(this.outNodePortIndex);
            if (outPortBox !== undefined && outPortBox.contains(mousePosition)) {
                return this.outNode.outputPort(this.outNodePortIndex);
            }
        }

        return null;
    }

    outPort(): Port | null {
        if (this.outNode === null) {
            return null;
        }
        return this.outNode.outputPort(this.outNodePortIndex);
    }

    inPort(): Port | null {
        if (this.inNode === null) {
            return null;
        }
        return this.inNode.inputPort(this.inNodePortIndex);
    }

    referencesNode(node: FlowNode): boolean {
        if (this.inNode === node) {
            return true;
        }

        if (this.outNode === node) {
            return true;
        }

        return false;
    }
}
