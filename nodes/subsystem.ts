import { HtmlCanvas } from "../.";
import { Camera } from "../camera";
import { Connection, ConnectionRenderer, defaultConnectionRenderer } from "../connection";
import { RenderResults } from "../graph";
import { combineContextMenus, ContextMenuConfig } from "../menu/context";
import { FlowNode, NodeState } from "../node";
import { organize_internal_plugin } from "../plugins/tools/organise";
import { Port, PortType } from "../port";
import { BoxStyle } from "../styles/box";
import { CursorStyle } from "../styles/cursor";
import { GraphSubsystem } from "../subsys";
import { onThemeChange, Theme } from "../theme";
import { Box } from "../utils/box";
import { Cfg } from "../utils/config";
import { exec } from "../utils/constants";
import { List } from "../utils/list";
import { VectorPool } from "../utils/pool";
import { Subsystem } from "../utils/subsys";
import { Vector2 } from "../utils/vector";
import { Widget } from "../widgets/widget";
import { NodeCreatedCallback, NodeFactory, NodeFactoryConfig } from "./factory";
import { Publisher } from "./publisher";

export type NodeAddedCallback = (node: FlowNode) => void;
export type NodeRemovedCallback = (node: FlowNode) => void;

export const nodeFlowGroup = "node-flow-graph-node-menu";

export type ConnectionRendererConfig = Partial<{
    size: number;
    color: string;

    mouseOverSize: number;
    mouseOverColor: string;

    renderer: ConnectionRenderer;
}>;

function buildConnectionRenderer(config?: ConnectionRendererConfig): ConnectionRenderer {
    if (config?.renderer) {
        return config.renderer;
    }

    return defaultConnectionRenderer(Cfg.value(config?.size, 2), undefined, Cfg.value(config?.mouseOverSize, 4), undefined);
}

interface PortIntersection {
    node: FlowNode;
    port: Port;
    index: number;
    inputPort: boolean;
}

type NodeSybsystemConfig = Partial<{
    idleConnection: ConnectionRendererConfig;
    nodes: NodeFactoryConfig;
}>;

export class NodeSubsystem extends GraphSubsystem {
    private postProcess: Subsystem;
    private nodes: Array<FlowNode>;
    private connections: Array<Connection>;
    private nodeHovering: number;
    private nodesGrabbed: List<number>;
    private connectionSelected: Connection | null;
    private idleConnectionRenderer: ConnectionRenderer;
    private portHovering: PortIntersection | null;
    private widgetHovering: Widget | null;
    private widgetCurrentlyClicking: Widget | null;

    private cursor: CursorStyle;
    private nodeFactory: NodeFactory;

    private boxSelect: boolean;
    private boxSelectStart_Space: Vector2;
    private boxSelectEnd_Space: Vector2;
    private boxSelectionNodes: List<number>;
    private boxSelectStyle: BoxStyle;

    private nodeRemovedCallbacks: Array<NodeRemovedCallback>;
    private registeredNodeAddedCallbacks: Array<NodeAddedCallback>;

    constructor(postProcess: Subsystem, config?: NodeSybsystemConfig) {
        super();
        this.postProcess = postProcess;
        this.nodes = [];
        this.nodeHovering = -1;
        this.nodesGrabbed = new List();
        this.connectionSelected = null;
        this.portHovering = null;
        this.widgetHovering = null;
        this.widgetCurrentlyClicking = null;
        this.connections = new Array();
        this.idleConnectionRenderer = buildConnectionRenderer(config?.idleConnection);

        this.cursor = CursorStyle.Default;
        this.nodeFactory = new NodeFactory(config?.nodes);

        this.registeredNodeAddedCallbacks = new Array();
        this.nodeRemovedCallbacks = new Array();

        this.boxSelect = false;
        this.boxSelectStart_Space = new Vector2();
        this.boxSelectEnd_Space = new Vector2();
        this.boxSelectionNodes = new List();
        this.boxSelectStyle = new BoxStyle({
            border: {
                color: Theme.BoxSelect.Color,
                size: Theme.BoxSelect.Size,
            },
            color: "#00000000",
            radius: Theme.BoxSelect.Radius,
        });

        onThemeChange((theme) => {
            this.boxSelectStyle = new BoxStyle({
                border: {
                    color: theme.BoxSelect.Color,
                    size: theme.BoxSelect.Size,
                },
                color: "#00000000",
                radius: theme.BoxSelect.Radius,
            });
        });
    }

    public addPublisher(id: string, pub: Publisher) {
        this.nodeFactory.addPublisher(id, pub);
    }

    public addOnNodeCreatedListener(callback: NodeCreatedCallback) {
        this.nodeFactory.addOnNodeCreatedListener(callback);
    }

    public addOnNodeAddedListener(callback: NodeAddedCallback) {
        if (!callback) {
            return;
        }
        this.registeredNodeAddedCallbacks.push(callback);
    }

    public addOnNodeRemovedListener(callback: NodeRemovedCallback) {
        if (!callback) {
            return;
        }
        this.nodeRemovedCallbacks.push(callback);
    }

    public getNodeFactory() {
        return this.nodeFactory;
    }

    clickStart(mousePosition: Vector2, camera: Camera, ctrlKey: boolean) {
        this.boxSelect = false;

        let hoveringSomething = false;
        if (this.nodeHovering > -1) {
            this.selectNodeByIndex(this.nodeHovering, !ctrlKey);

            for (let i = 0; i < this.nodes.length; i++) {
                if (this.nodes[i].isSelected()) {
                    this.nodesGrabbed.push(i);
                }
            }

            hoveringSomething = true;
        }

        if (this.widgetHovering !== null) {
            this.widgetHovering.clickStart();
            this.widgetCurrentlyClicking = this.widgetHovering;
            hoveringSomething = true;
        }

        if (this.portHovering === null) {
            if (ctrlKey && !hoveringSomething) {
                camera.screenSpaceToGraphSpace(mousePosition, this.boxSelectStart_Space);
                this.boxSelectEnd_Space.copy(this.boxSelectStart_Space);
                this.boxSelect = true;
            }

            return hoveringSomething || ctrlKey;
        }

        if (this.portHovering.inputPort) {
            for (let i = 0; i < this.connections.length; i++) {
                if (this.connections[i].inPort() === this.portHovering.port) {
                    this.connections[i].clearInput();
                    this.connectionSelected = this.connections[i];
                    break;
                }
            }
        } else {
            let inNode: FlowNode | null = this.portHovering.node;
            let inNodeIndex = this.portHovering.index;
            let outNode: FlowNode | null = this.portHovering.node;
            let outNodeIndex = this.portHovering.index;

            if (this.portHovering.inputPort) {
                outNode = null;
                outNodeIndex = -1;
            } else {
                inNode = null;
                inNodeIndex = -1;
            }

            const connection = new Connection(inNode, inNodeIndex, outNode, outNodeIndex, this.idleConnectionRenderer);
            this.connectionSelected = connection;
            this.connections.push(connection);
        }

        return true;
    }

    mouseDragEvent(delta: Vector2, scale: number) {
        let nodeMoved = false;

        VectorPool.run(() => {
            const scaledDelta = VectorPool.get();
            scaledDelta.x = delta.x / scale;
            scaledDelta.y = delta.y / scale;
            this.boxSelectEnd_Space.add(this.boxSelectEnd_Space, scaledDelta);

            if (this.interactingWithNode()) {
                for (let i = 0; i < this.nodesGrabbed.count(); i++) {
                    const node = this.nodes[this.nodesGrabbed.at(i)];
                    if (node.isLocked()) {
                        continue;
                    }
                    node.translate(scaledDelta);
                    nodeMoved = true;
                }
            }
        });

        if (nodeMoved) {
            return true;
        }
        return this.interactingWithConnection() || this.interactingWithWidget() || this.boxSelect;
    }

    clearNodeInputConnection(node: FlowNode, index: number) {
        const port = node.inputPort(index);
        for (let i = this.connections.length - 1; i >= 0; i--) {
            if (this.connections[i].inPort() === port) {
                this.removeConnection(this.connections[i], true);
            }
        }
    }

    clickEnd() {
        for (let i = 0; i < this.nodesGrabbed.count(); i++) {
            const node = this.nodes[this.nodesGrabbed.at(i)];
            node.raiseDragStoppedEvent();
        }
        this.nodesGrabbed.clear();

        if (this.boxSelect) {
            for (let i = 0; i < this.boxSelectionNodes.count(); i++) {
                this.selectNode(this.nodes[this.boxSelectionNodes.at(i)], false);
            }

            this.boxSelectionNodes.clear();
            this.boxSelect = false;
        }

        if (this.widgetCurrentlyClicking !== null) {
            this.widgetCurrentlyClicking.clickEnd();
            this.widgetCurrentlyClicking = null;
        }

        if (this.connectionSelected === null) {
            return;
        }

        if (this.portHovering === null) {
            this.clearCurrentlySelectedConnection();
            return;
        }

        const port = this.portHovering.port;
        const conn = this.connectionSelected;

        if (port === conn.inPort() || port === conn.outPort()) {
            this.clearCurrentlySelectedConnection();
            return;
        }

        if (this.portHovering.inputPort && conn.inPort() !== null) {
            this.clearCurrentlySelectedConnection();
            return;
        }

        if (!this.portHovering.inputPort && conn.outPort() !== null) {
            this.clearCurrentlySelectedConnection();
            return;
        }

        if (this.portHovering.inputPort && this.portHovering.port.getDataType() !== conn.outPort()?.getDataType()) {
            this.clearCurrentlySelectedConnection();
            return;
        }

        if (!this.portHovering.inputPort && this.portHovering.port.getDataType() !== conn.inPort()?.getDataType()) {
            this.clearCurrentlySelectedConnection();
            return;
        }

        if (this.portHovering.inputPort) {
            let replace = false;
            const inputPort = this.portHovering.node.inputPort(this.portHovering.index);
            if (this.portHovering.port.getPortType() !== PortType.InputArray && inputPort.getConnections().length > 0) {
                replace = true;
            }

            if (replace) {
                inputPort.getConnections()[0].clearOutput();

                this.removeConnection(inputPort.getConnections()[0], false);
            }
            conn.setInput(this.portHovering.node, this.portHovering.index, replace);
        } else {
            conn.setOutput(this.portHovering.node, this.portHovering.index);
        }

        this.connectionSelected = null;
    }

    connectNodes(nodeOut: FlowNode, outPort: number, nodeIn: FlowNode, inPort: number): Connection | undefined {
        const outType = nodeOut.outputPort(outPort).getDataType();
        const inType = nodeIn.inputPort(inPort).getDataType();
        if (outType !== inType) {
            console.error("can't connect nodes of different types", outType, inType);
            return;
        }

        const existingInputConnections = nodeIn.inputPort(inPort).getConnections();
        for (let i = 0; i < existingInputConnections.length; i++) {
            const connection = existingInputConnections[i];

            if (connection.getOutNode() !== nodeOut) {
                continue;
            }

            if (connection.outPort() !== nodeOut.outputPort(outPort)) {
                continue;
            }

            return;
        }

        const connection = new Connection(nodeIn, inPort, nodeOut, outPort, this.idleConnectionRenderer);
        this.connections.push(connection);
        return connection;
    }

    getNodes() {
        return this.nodes;
    }

    connectedInputsNodeReferencesByIndex(nodeIndex: number) {
        return this.connectedInputsNodeReferences(this.nodes[nodeIndex]);
    }

    connectedInputsNodeReferences(node: FlowNode) {
        const connections = new Array<FlowNode>();
        for (let i = 0; i < this.connections.length; i++) {
            const connection = this.connections[i];
            if (node !== connection.getInNode()) {
                continue;
            }

            const outNode = connection.getOutNode();
            if (outNode === null) {
                continue;
            }

            connections.push(outNode);
        }
        return connections;
    }

    connectedOutputsNodeReferences(nodeIndex: number) {
        const node = this.nodes[nodeIndex];
        const connections = new Array<FlowNode>();
        for (let i = 0; i < this.connections.length; i++) {
            const connection = this.connections[i];
            if (node !== connection.getOutNode()) {
                continue;
            }

            const inNode = connection.getInNode();
            if (inNode === null) {
                continue;
            }

            connections.push(inNode);
        }
        return connections;
    }

    addNode(node: FlowNode) {
        this.nodes.push(node);

        for (let i = 0; i < this.registeredNodeAddedCallbacks.length; i++) {
            const callback = this.registeredNodeAddedCallbacks[i];
            if (!callback) {
                continue;
            }
            callback(node);
        }
    }

    removeNode(node: FlowNode) {
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i] === node) {
                this.removeNodeByIndex(i);
            }
        }
    }

    private removeNodeConnections(nodeIndex: number) {
        if (nodeIndex >= this.nodes.length || nodeIndex < 0) {
            console.error("invalid node connection");
            return;
        }
        for (let i = this.connections.length - 1; i >= 0; i--) {
            if (this.connections[i].referencesNode(this.nodes[nodeIndex])) {
                this.removeConnectionByIndex(i, true);
            }
        }
    }

    private interactingWithNode() {
        return this.nodesGrabbed.count() > 0;
    }

    private interactingWithConnection() {
        return this.connectionSelected !== null;
    }

    private interactingWithWidget() {
        return this.widgetCurrentlyClicking !== null;
    }

    private removeNodeByIndex(nodeIndex: number) {
        this.removeNodeConnections(nodeIndex);
        const node = this.nodes[nodeIndex];
        this.nodes.splice(nodeIndex, 1);
        for (let i = 0; i < this.nodeRemovedCallbacks.length; i++) {
            this.nodeRemovedCallbacks[i](node);
        }
    }

    private removeConnectionByIndex(index: number, clearPorts: boolean) {
        if (clearPorts) {
            this.connections[index].clearPorts();
        }
        this.connections.splice(index, 1);
    }

    private removeConnection(connection: Connection, clearPorts: boolean) {
        const index = this.connections.indexOf(connection);
        if (index > -1) {
            this.removeConnectionByIndex(index, clearPorts);
        } else {
            console.error("no connection found to remove");
        }
    }

    organize(canvas: HtmlCanvas) {
        organize_internal_plugin(canvas, this);
    }

    private nodesSelected() {
        const selected = new Array<number>();
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i].isSelected()) {
                selected.push(i);
            }
        }
        return selected;
    }

    private organizeSelected(canvas: HtmlCanvas) {
        organize_internal_plugin(canvas, this, this.nodesSelected());
    }

    openContextMenu(canvas: HtmlCanvas, pos: Vector2): ContextMenuConfig | null {
        const organizeNodesSubMenu: ContextMenuConfig = {
            name: "Organize",
            group: nodeFlowGroup,
            items: [
                {
                    name: "All Nodes",
                    group: nodeFlowGroup,
                    callback: () => {
                        this.organize(canvas);
                    },
                },
            ],
        };

        let config: ContextMenuConfig = {
            items: [],
            subMenus: [organizeNodesSubMenu, this.nodeFactory.openMenu(this, pos)],
        };

        if (this.nodesSelected().length > 0) {
            organizeNodesSubMenu.items?.push({
                name: "Selected Nodes",
                group: nodeFlowGroup,
                callback: () => {
                    this.organizeSelected(canvas);
                },
            });
        }

        if (this.nodeHovering > -1) {
            const nodeToReview = this.nodeHovering;
            const nodeToReviewNode = this.nodes[nodeToReview];

            config.subMenus?.push({
                group: nodeFlowGroup,
                name: "Select",
                items: [
                    {
                        name: "Direct Connected Nodes",
                        group: nodeFlowGroup,
                        callback: () => {
                            this.selectConnectedNodes(nodeToReview);
                        },
                    },
                    {
                        name: "Input Nodes + Descendents",
                        group: nodeFlowGroup,
                        callback: () => {
                            this.selectInputNodesAndDescendents(nodeToReviewNode);
                        },
                    },
                ],
            });

            config.subMenus?.push({
                group: nodeFlowGroup,
                name: "Delete",
                items: [
                    {
                        name: "Node",
                        group: nodeFlowGroup,
                        callback: () => {
                            this.removeNodeByIndex(nodeToReview);
                        },
                    },
                    {
                        name: "Connections",
                        group: nodeFlowGroup,
                        callback: () => {
                            this.removeNodeConnections(nodeToReview);
                        },
                    },
                ],
            });
            config = combineContextMenus(config, nodeToReviewNode.getContextMenu());
        }

        return config;
    }

    private selectInputNodesAndDescendents(node: FlowNode) {
        if (node === undefined) {
            return;
        }
        this.selectNode(node, false);

        const inputs = this.connectedInputsNodeReferences(node);
        for (let i = 0; i < inputs.length; i++) {
            this.selectInputNodesAndDescendents(inputs[i]);
        }
    }

    private selectConnectedNodes(nodeIndex: number) {
        const node = this.nodes[nodeIndex];
        if (!node) {
            return;
        }
        this.selectNode(node, false);

        const outputs = this.connectedOutputsNodeReferences(nodeIndex);
        for (let i = 0; i < outputs.length; i++) {
            this.selectNode(outputs[i], false);
        }

        const inputs = this.connectedInputsNodeReferencesByIndex(nodeIndex);
        for (let i = 0; i < inputs.length; i++) {
            this.selectNode(inputs[i], false);
        }
    }

    private selectNodeByIndex(nodeIndex: number, unselectOthers: boolean) {
        this.selectNode(this.nodes[nodeIndex], unselectOthers);
    }

    private selectNode(node: FlowNode, unselectOthers: boolean) {
        node.select();

        if (!unselectOthers) {
            return;
        }

        for (let i = 0; i < this.nodes.length; i++) {
            if (node === this.nodes[i]) {
                continue;
            }
            this.nodes[i].unselect();
        }
    }

    private clearCurrentlySelectedConnection() {
        if (this.connectionSelected === null) {
            return;
        }
        this.removeConnection(this.connectionSelected, true);
        this.connectionSelected = null;
    }

    private renderConnections(canvas: HtmlCanvas, camera: Camera, mousePosition: Vector2 | undefined) {
        for (let i = 0; i < this.connections.length; i++) {
            let portMousedOver = false;
            if (mousePosition) {
                portMousedOver = this.connections[i].mouseOverPort(mousePosition) !== null;
                if (portMousedOver) {
                    this.cursor = CursorStyle.Pointer;
                }
            }
            this.connections[i].render(canvas, camera.zoom, portMousedOver, mousePosition);
        }
    }

    private renderNodes(canvas: HtmlCanvas, camera: Camera, mousePos: Vector2 | undefined) {
        this.portHovering = null;
        this.widgetHovering = null;
        this.nodeHovering = -1;
        this.boxSelectionNodes.clear();

        const selectedBox_ScreenSpace = this.boxSelectionScreenspaceBox(camera);

        for (let i = 0; i < this.nodes.length; i++) {
            let state = NodeState.Idle;

            if (mousePos && !this.boxSelect) {
                const intersection = this.nodes[i].inBounds(canvas, camera, mousePos);

                if (intersection.node !== undefined && intersection.portIndex === undefined && intersection.widget === undefined) {
                    state = NodeState.MouseOver;
                    this.nodeHovering = i;
                    this.cursor = CursorStyle.Grab;
                }

                if (intersection.widget !== undefined) {
                    this.widgetHovering = intersection.widget;
                    this.cursor = CursorStyle.Pointer;
                }

                if (intersection.port !== undefined && intersection.node !== undefined && intersection.portIndex !== undefined && intersection.portIsInput !== undefined) {
                    this.portHovering = {
                        index: intersection.portIndex,
                        node: intersection.node,
                        port: intersection.port,
                        inputPort: intersection.portIsInput,
                    };
                }
            } else if (this.boxSelect) {
                const nodeBounds = this.nodes[i].calculateBounds(canvas, camera);

                if (selectedBox_ScreenSpace.intersects(nodeBounds)) {
                    state = NodeState.MouseOver;
                    this.boxSelectionNodes.push(i);
                }
            }

            if (this.nodes[i].isSelected() && this.nodesGrabbed.count() > 0) {
                state = NodeState.Grabbed;
                this.cursor = CursorStyle.Grabbing;
            }

            this.nodes[i].render(canvas, camera, state, mousePos, this.postProcess);
        }
    }

    private boxSelectionScreenspaceBox(camera: Camera) {
        const box = new Box();

        camera.graphSpaceToScreenSpace(this.boxSelectStart_Space, box.pos);
        camera.graphSpaceToScreenSpace(this.boxSelectEnd_Space, box.size);

        box.size.sub(box.size, box.pos);

        return box;
    }

    render(canvas: HtmlCanvas, camera: Camera, mousePos: Vector2 | undefined): RenderResults | undefined {
        this.cursor = CursorStyle.Default;
        exec("Render_Connections", () => {
            this.renderConnections(canvas, camera, mousePos);
        });
        exec("Render_Nodes", () => {
            this.renderNodes(canvas, camera, mousePos);
        });

        if (this.boxSelect) {
            const box = this.boxSelectionScreenspaceBox(camera);
            canvas.ctx.setLineDash([Theme.BoxSelect.LineDashLength]);
            this.boxSelectStyle.draw(canvas, box, 1);
            canvas.ctx.setLineDash([]);
        }

        return { cursorStyle: this.cursor };
    }
}
