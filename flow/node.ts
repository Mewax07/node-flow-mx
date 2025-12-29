import { HtmlCanvas } from ".";
import { Camera } from "./camera";
import { combineContextMenus, ContextMenuConfig, ContextMenuItemConfig } from "./menu/context";
import { nodeFlowGroup } from "./nodes/subsystem";
import { Port, PortConfig, PortType } from "./port";
import { BoxStyle, BoxStyleConfig } from "./styles/box";
import { FontWeight, TextStyle, TextStyleConfig } from "./styles/text";
import { onThemeChange, Theme } from "./theme";
import { Box } from "./utils/box";
import { Cfg } from "./utils/config";
import { Metadata, TextAlign, TextBaseline } from "./utils/constants";
import { List } from "./utils/list";
import { VectorPool } from "./utils/pool";
import { splitStringIntoLines } from "./utils/string";
import { Subsystem } from "./utils/subsys";
import { Text } from "./utils/text";
import { Vector2 } from "./utils/vector";
import { GlobalWidgetFactory } from "./widgets/factory";
import { NumberWidget } from "./widgets/number";
import { Widget } from "./widgets/widget";

const MINIMUM_NODE_WIDTH = 150;

type AnyPropertyChangeCallback = (propertyName: string, oldValue: any, newValue: any) => void;
type PropertyChangeCallback = (oldValue: any, newValue: any) => void;
type TitleChangeCallback = (node: FlowNode, oldTitle: string, newTitle: string) => void;
type InfoChangeCallback = (node: FlowNode, oldInfo: string, newInfo: string) => void;

export type WidgetConfig = Partial<{
    type: string;
    config: any;
}>;

export type FlowNodeTitleConfig = Partial<{
    textStyle: TextStyleConfig;
    color: string;
    padding: number;
}>;

export type FlowNodeStyle = Partial<{
    title: FlowNodeTitleConfig;
    idle: BoxStyleConfig;
    mouseOver: BoxStyleConfig;
    grabbed: BoxStyleConfig;
    selected: BoxStyleConfig;
    portText?: TextStyleConfig;
}>;

export enum MessageType {
    Info = "info",
    Warning = "warning",
    Error = "error",
}

function messageTypeColor(messageType: MessageType) {
    switch (messageType) {
        case MessageType.Info:
            return Theme.Node.Message.InfoColor;

        case MessageType.Warning:
            return Theme.Node.Message.WarnColor;

        case MessageType.Error:
            return Theme.Node.Message.ErrorColor;

        default:
            throw new Error(`Unreconized message type ${messageType}`);
    }
}

export type NodeMessageConfig = {
    message: string;
} & Partial<{
    type: MessageType;
    alwaysShow: boolean;
    color: string;
}>;

export type FlowNodeConfig = Partial<{
    position: Vector2 | { x: number; y: number };
    title: string;
    subTitle: string;
    info: string;
    messages: Array<NodeMessageConfig>;
    locked: boolean;
    data: Metadata;
    contextMenu: ContextMenuConfig;
    metadata: any;

    canEditTitle: boolean;
    canEditInfo: boolean;
    canEditPorts: boolean;

    inputs: Array<PortConfig>;
    outputs: Array<PortConfig>;

    onGrab: () => void;
    onRelease: () => void;
    onSelect: () => void;
    onUnselect: () => void;
    onDragStop: (node: FlowNode) => void;
    onTitleChange: TitleChangeCallback;
    onInfoChange: InfoChangeCallback;

    widgets: Array<WidgetConfig>;

    style: FlowNodeStyle;
}>;

export enum NodeState {
    Idle,
    MouseOver,
    Grabbed,
}

export type NodeIntersection = Partial<{
    node: FlowNode;

    port: Port;
    portIndex: number;
    portIsInput: boolean;

    widget: Widget;
    widgetIndex: number;
}>;

class MessageRenderer {
    private text: Text;
    private alwaysShow: boolean;

    constructor(config: NodeMessageConfig) {
        this.alwaysShow = Cfg.value(config.alwaysShow, false);
        this.text = new Text(
            config.message,
            {
                color: Cfg.value(config.color, messageTypeColor(Cfg.value(config.type, MessageType.Info))),
            },
            {
                lineSpacing: 2.5,
                maxWidth: 200,
            },
        );
    }

    render(canvas: HtmlCanvas, scale: number, pos: Vector2, hovering: boolean) {
        if (!this.alwaysShow && !hovering) {
            return 0;
        }
        canvas.ctx.textAlign = TextAlign.Center;
        this.text.render(canvas, scale, pos);
        return this.text.height(canvas) * scale;
    }
}

export class FlowNode {
    private position: Vector2;
    private title: Text;
    private subTitle: Text;
    private infoSymbol: Text;
    private infoText: string;
    private messages: Array<MessageRenderer>;
    private widgets: Array<Widget>;

    private input: Array<Port>;
    private output: Array<Port>;

    private locked: boolean;
    private canEditTitle: boolean;
    private canEditInfo: boolean;
    private canEditPorts: boolean;
    private contextMenu: ContextMenuConfig | null;
    private metadata: any;

    private onSelect: Array<() => void>;
    private onUnselect: Array<() => void>;
    private onDragStop: Array<(node: FlowNode) => void>;
    private titleChangeCallback: Array<TitleChangeCallback>;
    private infoChangeCallback: Array<InfoChangeCallback>;

    private titleColor: string;
    private selectedStyle: BoxStyle;
    private stateStyles: Map<NodeState, BoxStyle>;
    private padding: number;
    private portTextStyle: TextStyle;
    private elementSpacing: number;

    private selected: boolean;
    private inputPortPositions: List<Box>;
    private outputPortPositions: List<Box>;
    private widgetPositions: List<Box>;
    private data: Metadata;

    private registeredAnyPropertyChangeCallbacks: Array<AnyPropertyChangeCallback>;
    private registeredPropertyChangeCallbacks: Map<string, Array<PropertyChangeCallback>>;

    constructor(config?: FlowNodeConfig) {
        this.input = new Array();
        this.output = new Array();

        this.widgets = new Array();
        this.widgetPositions = new List();

        this.inputPortPositions = new List();
        this.outputPortPositions = new List();

        this.elementSpacing = 15;
        this.locked = Cfg.value(config?.locked, false);
        this.data = Cfg.value(config?.data, {});

        this.registeredPropertyChangeCallbacks = new Map();
        this.registeredAnyPropertyChangeCallbacks = new Array();

        this.canEditPorts = Cfg.value(config?.canEditPorts, false);
        this.canEditTitle = Cfg.value(config?.canEditTitle, false);
        this.canEditInfo = Cfg.value(config?.canEditInfo, false);
        this.contextMenu = Cfg.value(config?.contextMenu, null);

        this.metadata = config?.metadata;

        this.messages = [];
        if (config?.messages) {
            for (let i = 0; i < config.messages.length; i++) {
                const message = config.messages[i];
                this.messages.push(new MessageRenderer(message));
            }
        }

        this.selected = false;
        this.onSelect = new Array();
        this.onUnselect = new Array();
        this.onDragStop = new Array();
        this.titleChangeCallback = new Array();
        this.infoChangeCallback = new Array();

        if (config?.onSelect) {
            this.onSelect.push(config?.onSelect);
        }

        if (config?.onUnselect) {
            this.onUnselect.push(config?.onUnselect);
        }

        if (config?.onDragStop) {
            this.onDragStop.push(config.onDragStop);
        }

        if (config?.onTitleChange) {
            this.titleChangeCallback.push(config.onTitleChange);
        }

        if (config?.onInfoChange) {
            this.infoChangeCallback.push(config.onInfoChange);
        }

        if (config?.position) {
            if (config.position instanceof Vector2) {
                this.position = config.position;
            } else {
                this.position = new Vector2(config.position.x, config.position.y);
            }
        } else {
            this.position = new Vector2();
        }
        this.title = new Text(
            Cfg.value(config?.title, ""),
            TextStyle.textStyleFallback(config?.style?.title?.textStyle, {
                size: 16,
                weight: FontWeight.Bold,
                color: Theme.Node.FontColor,
            }),
        );

        this.subTitle = new Text(
            Cfg.value(config?.subTitle, ""),
            TextStyle.textStyleFallback(config?.style?.title?.textStyle, {
                size: 10,
                weight: FontWeight.Bold,
                color: Theme.Node.FontColor,
            }),
        );

        this.infoSymbol = new Text("i", {
            size: 13,
            weight: FontWeight.Bold,
            color: Theme.Node.FontColor,
        });
        this.infoText = config?.info ?? "";

        this.titleColor = Cfg.value(config?.style?.title?.color, Theme.Node.Title.Color);

        this.padding = Cfg.value(config?.style?.title?.padding, 15);

        this.stateStyles = new Map();
        this.stateStyles.set(
            NodeState.Idle,
            BoxStyle.boxStyleWithFallbackWithSelf(config?.style?.idle, {
                border: { color: Theme.Node.Border.Idle, size: 1 },
                radius: Theme.Node.BorderRadius,
                color: Theme.Node.BackgroundColor,
            }),
        );
        this.stateStyles.set(
            NodeState.MouseOver,
            BoxStyle.boxStyleWithFallbackWithSelf(config?.style?.mouseOver, {
                border: {
                    color: Theme.Node.Border.MouseOver,
                    size: 1.1,
                },
                radius: Theme.Node.BorderRadius,
                color: Theme.Node.BackgroundColor,
            }),
        );
        this.stateStyles.set(
            NodeState.Grabbed,
            BoxStyle.boxStyleWithFallbackWithSelf(config?.style?.grabbed, {
                border: { color: Theme.Node.Border.Grabbed, size: 2 },
                radius: Theme.Node.BorderRadius,
                color: Theme.Node.BackgroundColor,
            }),
        );

        this.selectedStyle = BoxStyle.boxStyleWithFallbackWithSelf(config?.style?.selected, {
            border: { color: Theme.Node.Border.Selected, size: 1 },
            radius: Theme.Node.BorderRadius,
            color: Theme.Node.BackgroundColor,
        });

        this.portTextStyle = new TextStyle({
            size: Cfg.value(config?.style?.portText?.size, 14),
            color: Cfg.value(config?.style?.portText?.color, Theme.Node.Port.FontColor),
            font: config?.style?.portText?.font,
            weight: config?.style?.portText?.weight,
        });

        if (config?.inputs) {
            for (let i = 0; i < config.inputs.length; i++) {
                this.addInput(config.inputs[i]);
            }
        }

        if (config?.outputs) {
            for (let i = 0; i < config.outputs.length; i++) {
                this.addOutput(config.outputs[i]);
            }
        }

        if (config?.widgets) {
            for (let i = 0; i < config.widgets.length; i++) {
                const widget = config.widgets[i];
                if (!widget.type) {
                    continue;
                }
                this.addWidget(GlobalWidgetFactory.create(this, widget.type, widget.config));
            }
        }

        onThemeChange((theme) => {
            this.title.setColor(theme.Node.FontColor);
            this.subTitle.setColor(theme.Node.FontColor);
            this.infoSymbol.setColor(theme.Node.FontColor);

            this.stateStyles.get(NodeState.Idle)?.setColor(theme.Node.BackgroundColor).setRadius(theme.Node.BorderRadius).setBorderColor(theme.Node.Border.Idle);
            this.stateStyles.get(NodeState.MouseOver)?.setColor(theme.Node.BackgroundColor).setRadius(theme.Node.BorderRadius).setBorderColor(theme.Node.Border.MouseOver);
            this.stateStyles.get(NodeState.Grabbed)?.setColor(theme.Node.BackgroundColor).setRadius(theme.Node.BorderRadius).setBorderColor(theme.Node.Border.Grabbed);

            this.selectedStyle.setColor(theme.Node.BackgroundColor).setRadius(theme.Node.BorderRadius).setBorderColor(theme.Node.Border.Selected);
            this.portTextStyle.setColor(Cfg.value(config?.style?.portText?.color, theme.Node.Port.FontColor));
        });
    }

    public getMetadata(): any {
        return this.metadata;
    }

    public isSelected() {
        return this.selected;
    }

    public select() {
        if (this.selected) {
            return;
        }
        this.selected = true;
        for (let i = 0; i < this.onSelect.length; i++) {
            this.onSelect[i]();
        }
    }

    public raiseDragStoppedEvent() {
        for (let i = 0; i < this.onDragStop.length; i++) {
            this.onDragStop[i](this);
        }
    }

    public addTitleChangeListener(callback: TitleChangeCallback) {
        if (callback === undefined || callback === null) {
        }
        this.titleChangeCallback.push(callback);
    }

    public addInfoChangeListener(callback: InfoChangeCallback) {
        if (callback === undefined || callback === null) {
        }
        this.infoChangeCallback.push(callback);
    }

    public addDragStoppedListener(callback: (node: FlowNode) => void) {
        if (callback === undefined || callback === null) {
        }
        this.onDragStop.push(callback);
    }

    public addAnyPropertyChangeListener(callback: AnyPropertyChangeCallback) {
        if (callback === undefined || callback === null) {
        }
        this.registeredAnyPropertyChangeCallbacks.push(callback);
    }

    public addPropertyChangeListener(name: string, callback: PropertyChangeCallback) {
        if (!this.registeredPropertyChangeCallbacks.has(name)) {
            this.registeredPropertyChangeCallbacks.set(name, []);
        }

        const callbacks = this.registeredPropertyChangeCallbacks.get(name);
        if (callbacks === undefined) {
            return;
        }
        callbacks.push(callback);
    }

    public setProperty(name: string, value: any) {
        const oldValue = this.data[name];
        if (oldValue === value) {
            return;
        }

        this.data[name] = value;

        for (let i = 0; i < this.registeredAnyPropertyChangeCallbacks.length; i++) {
            this.registeredAnyPropertyChangeCallbacks[i](name, oldValue, value);
        }

        const callbacks = this.registeredPropertyChangeCallbacks.get(name);
        if (callbacks === undefined) {
            return;
        }

        for (let i = 0; i < callbacks.length; i++) {
            callbacks[i](oldValue, value);
        }
    }

    public getProperty(name: string): any {
        return this.data[name];
    }

    private popupNodeTitleSelection() {
        //
    }

    private popupNodeInfoSelection() {
        //
    }

    private widgetSubmenu(): ContextMenuConfig {
        return {
            name: "Widget",
            items: [
                {
                    name: "Button",
                    // callback: this.#popupNewButtonWidget.bind(this),
                    callback() {
                        //
                    },
                },
                {
                    name: "Number",
                    callback: () => {
                        this.addWidget(new NumberWidget(this));
                    },
                },
                {
                    name: "Color",
                    callback: () => {
                        // this.addWidget(new ColorWidget(this));
                    },
                },
                {
                    name: "Slider",
                    callback: () => {
                        // FormPopup({
                        //     title: "New Slider",
                        //     form: [
                        //         {
                        //             name: "min",
                        //             type: "number",
                        //             startingValue: 0,
                        //         },
                        //         {
                        //             name: "max",
                        //             type: "number",
                        //             startingValue: 100,
                        //         },
                        //     ],
                        //     onUpdate: (data: Array<any>) => {
                        //         this.addWidget(
                        //             new SliderWidget(this, {
                        //                 min: data[0],
                        //                 max: data[1],
                        //             }),
                        //         );
                        //     },
                        // }).Show();
                    },
                },
                {
                    name: "String",
                    callback: () => {
                        // this.addWidget(new StringWidget(this));
                    },
                },
                {
                    name: "Toggle",
                    callback: () => {
                        // this.addWidget(new ToggleWidget(this));
                    },
                },
                {
                    name: "Image",
                    callback: () => {
                        // FormPopup({
                        //     title: "New Image",
                        //     form: [
                        //         {
                        //             name: "URL",
                        //             type: "text",
                        //             startingValue: "https://pbs.twimg.com/media/GYabtu6bsAA7m99?format=jpg&name=medium",
                        //         },
                        //         {
                        //             name: "Max Width",
                        //             type: "number",
                        //             startingValue: MINIMUM_NODE_WIDTH,
                        //         },
                        //         {
                        //             name: "Max Height",
                        //             type: "number",
                        //             startingValue: MINIMUM_NODE_WIDTH,
                        //         },
                        //     ],
                        //     onUpdate: (data: Array<any>) => {
                        //         this.addWidget(
                        //             new ImageWidget({
                        //                 image: data[0],
                        //                 maxWidth: data[1],
                        //                 maxHeight: data[2],
                        //             }),
                        //         );
                        //     },
                        // }).Show();
                    },
                },
            ],
        };
    }

    public getContextMenu(): ContextMenuConfig {
        let config: ContextMenuConfig = {
            group: nodeFlowGroup,
            items: [],
            subMenus: [],
        };

        if (this.getCanEditPorts() || this.getCanEditTitle() || this.canEditInfo) {
            const items = new Array<ContextMenuItemConfig>();
            if (this.getCanEditTitle()) {
                items.push({
                    name: "Title",
                    callback: () => {
                        this.popupNodeTitleSelection();
                    },
                });
            }

            if (this.canEditInfo) {
                items.push({
                    name: "Info",
                    callback: () => {
                        this.popupNodeInfoSelection();
                    },
                });
            }

            const submenus = new Array<ContextMenuConfig>();
            if (this.getCanEditPorts()) {
                submenus.push({
                    name: "Add",
                    items: [
                        {
                            name: "Input",
                            callback: () => {
                                // FormPopup({
                                //     title: "New Input",
                                //     form: [
                                //         {
                                //             name: "name",
                                //             type: "text",
                                //             startingValue: "input",
                                //         },
                                //         {
                                //             name: "type",
                                //             type: "text",
                                //             startingValue: "string",
                                //         },
                                //     ],
                                //     onUpdate: (data: Array<any>) => {
                                //         this.addInput({
                                //             name: data[0],
                                //             type: data[1],
                                //         });
                                //     },
                                // }).Show();
                            },
                        },
                        {
                            name: "Output",
                            callback: () => {
                                // FormPopup({
                                //     title: "New Output",
                                //     form: [
                                //         {
                                //             name: "name",
                                //             type: "text",
                                //             startingValue: "output",
                                //         },
                                //         {
                                //             name: "type",
                                //             type: "text",
                                //             startingValue: "string",
                                //         },
                                //     ],
                                //     onUpdate: (data: Array<any>) => {
                                //         this.addOutput({
                                //             name: data[0],
                                //             type: data[1],
                                //         });
                                //     },
                                // }).Show();
                            },
                        },
                    ],
                    subMenus: [this.widgetSubmenu()],
                });
            }

            config.subMenus?.push({
                group: nodeFlowGroup,
                name: "Edit",
                items: items,
                subMenus: submenus,
            });
        }

        if (this.locked) {
            config.items?.push({
                name: "Unlock Node Position",
                group: nodeFlowGroup,
                callback: this.unlock.bind(this),
            });
        } else {
            config.items?.push({
                name: "Lock Node Position",
                group: nodeFlowGroup,
                callback: this.lock.bind(this),
            });
        }

        if (this.contextMenu) {
            config = combineContextMenus(config, this.contextMenu);
        }

        return config;
    }

    public unselect() {
        if (!this.selected) {
            return;
        }
        this.selected = false;
        for (let i = 0; i < this.onUnselect.length; i++) {
            this.onUnselect[i]();
        }
    }

    public addUnselectListener(callback: () => void) {
        this.onUnselect.push(callback);
    }

    public addSelectListener(callback: () => void) {
        this.onSelect.push(callback);
    }

    // public dropFile(file: File) {
    //     for (let i = 0; i < this.onFiledrop.length; i++) {
    //         this.onFiledrop[i](file);
    //     }
    // }

    // public addFileDropListener(callback: (file: File) => void) {
    //     this.onFiledrop.push(callback);
    // }

    public isLocked() {
        return this.locked;
    }

    public lock() {
        this.locked = true;
    }

    public unlock() {
        this.locked = false;
    }

    public setPosition(position: Vector2) {
        this.position.copy(position);
    }

    public getPosition() {
        return this.position;
    }

    public calculateBounds(canvas: HtmlCanvas, camera: Camera) {
        const tempMeasurement = new Vector2();

        const doublePadding = this.padding * 2;

        const screenSpacePosition = new Vector2();
        camera.graphSpaceToScreenSpace(this.position, screenSpacePosition);

        const size = new Vector2();
        this.title.resizeSize(canvas, 1, size);

        const subtitleSize = new Vector2();
        this.subTitle.resizeSize(canvas, 1, subtitleSize);
        size.x = Math.max(size.x, subtitleSize.x);

        if (this.infoText !== "") {
            size.x += size.y * 4;
        }

        size.x += doublePadding;
        size.y += doublePadding + this.elementSpacing * this.input.length;

        for (let i = 0; i < this.input.length; i++) {
            const port = this.input[i];
            this.portTextStyle.measure(canvas, 1, port.getDisplayName(), tempMeasurement);
            size.y += tempMeasurement.y;
            size.x = Math.max(size.x, tempMeasurement.x + doublePadding);
        }

        size.y += this.elementSpacing * this.output.length;

        for (let i = 0; i < this.output.length; i++) {
            const port = this.output[i];
            this.portTextStyle.measure(canvas, 1, port.getDisplayName(), tempMeasurement);
            size.y += tempMeasurement.y;
            size.x = Math.max(size.x, tempMeasurement.x + doublePadding);
        }

        size.y += this.elementSpacing * this.widgets.length;

        for (let i = 0; i < this.widgets.length; i++) {
            const element = this.widgets[i];
            const eleSize = element.size();
            size.y += eleSize.y;
            size.x = Math.max(size.x, eleSize.x + doublePadding);
        }

        size.y += this.elementSpacing;

        size.x = Math.max(size.x, MINIMUM_NODE_WIDTH);
        size.scale(camera.zoom);

        return new Box(screenSpacePosition, size);
    }

    addInput(config: PortConfig) {
        const port = new Port(this, config.array ? PortType.InputArray : PortType.Input, config);
        this.input.push(port);
        return port;
    }

    addOutput(config: PortConfig) {
        const port = new Port(this, config.array ? PortType.OutputArray : PortType.Output, config);
        this.output.push(port);
        return port;
    }

    addWidget(widget: Widget): void {
        this.widgets.push(widget);
    }

    removeWidget(widget: Widget): void {
        const index = this.widgets.indexOf(widget, 0);
        if (index === -1) {
            throw new Error("Node does not contain widget");
        }
        this.widgets.splice(index, 1);
    }

    getWidget(index: number): Widget {
        return this.widgets[index];
    }

    widgetCount(): number {
        return this.widgets.length;
    }

    translate(delta: Vector2) {
        this.position.x += delta.x;
        this.position.y += delta.y;
    }

    inBounds(canvas: HtmlCanvas, camera: Camera, position: Vector2) {
        var intersection: NodeIntersection = {};

        const box = this.calculateBounds(canvas, camera);
        if (box.contains(position)) {
            intersection.node = this;
        }

        for (let i = 0; i < this.inputPortPositions.count(); i++) {
            if (this.inputPortPositions.at(i).contains(position)) {
                intersection.node = this;
                intersection.portIndex = i;
                intersection.portIsInput = true;
                intersection.port = this.input[i];
            }
        }

        for (let i = 0; i < this.outputPortPositions.count(); i++) {
            if (this.outputPortPositions.at(i).contains(position)) {
                intersection.node = this;
                intersection.portIndex = i;
                intersection.portIsInput = false;
                intersection.port = this.output[i];
            }
        }

        for (let i = 0; i < this.widgetPositions.count(); i++) {
            if (this.widgetPositions.at(i).contains(position)) {
                intersection.node = this;
                intersection.widgetIndex = i;
                intersection.widget = this.widgets[i];
            }
        }

        return intersection;
    }

    getCanEditTitle() {
        return this.canEditTitle;
    }

    getCanEditPorts() {
        return this.canEditPorts;
    }

    getTitle() {
        return this.title.get();
    }

    setTitle(newTitle: string) {
        if (!this.canEditTitle) {
            console.warn("setTitle instruction ignored, as node has been marked un-editable");
            return;
        }

        let cleaned = newTitle;
        if (cleaned === null || cleaned === undefined) {
            cleaned = "";
        }

        const old = this.getTitle();
        if (cleaned === old) {
            return;
        }

        this.title.set(cleaned);

        for (let i = 0; i < this.titleChangeCallback.length; i++) {
            const callback = this.titleChangeCallback[i];
            callback(this, old, cleaned);
        }
    }

    setInfo(newInfo: string) {
        if (!this.canEditInfo) {
            console.warn("setInfo instruction ignored, as node has been marked un-editable");
        }

        let cleaned = newInfo;
        if (cleaned === null || cleaned === undefined) {
            cleaned = "";
        }

        if (cleaned === this.infoText) {
            return;
        }

        const old = this.infoText;
        this.infoText = cleaned;

        for (let i = 0; i < this.infoChangeCallback.length; i++) {
            const callback = this.infoChangeCallback[i];
            callback(this, old, cleaned);
        }
    }

    inputPortPosition(index: number) {
        return this.inputPortPositions.at(index);
    }

    inputPort(index: number) {
        return this.input[index];
    }

    inputs() {
        return this.input.length;
    }

    outputPortPosition(index: number) {
        return this.outputPortPositions.at(index);
    }

    outputPort(index: number) {
        return this.output[index];
    }

    outputs() {
        return this.output.length;
    }

    private calculateStyle(state: NodeState) {
        if (this.selected && state === NodeState.Idle) {
            return this.selectedStyle;
        }

        let boxStyle = this.stateStyles.get(state);
        if (boxStyle === undefined) {
            throw new Error("no registered border style for state: " + state);
        }
        return boxStyle;
    }

    addMessage(message: NodeMessageConfig): void {
        this.messages.push(new MessageRenderer(message));
    }

    clearMessages(): void {
        this.messages = [];
    }

    render(canvas: HtmlCanvas, camera: Camera, state: NodeState, mousePos: Vector2 | undefined, postProcess: Subsystem) {
        VectorPool.run(() => {
            const tempMeasurement = VectorPool.get();

            this.inputPortPositions.clear();
            this.outputPortPositions.clear();
            this.widgetPositions.clear();
            const scaledPadding = this.padding * camera.zoom;
            const scaledElementSpacing = this.elementSpacing * camera.zoom;

            const nodeBounds = this.calculateBounds(canvas, camera);

            const nodeStyle = this.calculateStyle(state);
            nodeStyle.draw(canvas, nodeBounds, camera.zoom);

            const borderSize = nodeStyle.borderSize();
            canvas.alignText({
                text: TextAlign.Center,
                baseline: TextBaseline.Middle,
            });

            const titleSize = VectorPool.get();
            this.title.resizeSize(canvas, camera.zoom, titleSize);

            const subtitleSize = VectorPool.get();
            this.subTitle.resizeSize(canvas, camera.zoom, subtitleSize);

            const titleBoxSize = VectorPool.get();
            titleBoxSize.x = nodeBounds.size.x;
            titleBoxSize.y = titleSize.y + scaledPadding * 2;

            const titleX = nodeBounds.pos.x + borderSize * camera.zoom * 0.5;
            const titleY = nodeBounds.pos.y + borderSize * camera.zoom * 0.5;
            const titleWidth = titleBoxSize.x - borderSize * camera.zoom;
            const titleHeight = titleBoxSize.y - borderSize * camera.zoom * 0.5;
            canvas.fillStyle(this.titleColor).roundedRect(titleX, titleY, titleWidth, titleHeight, [nodeStyle.getRadius() * camera.zoom, nodeStyle.getRadius() * camera.zoom, 0, 0]);

            const titlePos = VectorPool.get();
            titlePos.x = nodeBounds.pos.x + nodeBounds.size.x / 2;
            titlePos.y = nodeBounds.pos.y + scaledPadding + titleSize.y / 2;

            if (this.subTitle.get() !== "") {
                const subtitlePos = VectorPool.get();
                subtitlePos.copy(titlePos);

                subtitlePos.y -= titleSize.y / 1.5;
                titlePos.y += scaledPadding / 2;

                this.subTitle.render(canvas, camera.zoom, subtitlePos);
            }

            this.title.render(canvas, camera.zoom, titlePos);

            if (this.infoText !== "") {
                const infoRadius = titleHeight * 0.25;
                const centerX = titleX + titleWidth - titleHeight * 0.25 - infoRadius;
                const centerY = titleY + titleHeight * 0.25 + infoRadius;
                const infoPosition = VectorPool.get();
                infoPosition.x = centerX;
                infoPosition.y = centerY + titleHeight * 0.025;

                let infoLineThickness = 1.5 * camera.zoom;

                if (mousePos && Vector2.distance(infoPosition, mousePos) <= infoRadius) {
                    infoLineThickness *= 1.5;

                    postProcess.queue(() => {
                        this.infoSymbol.getStyle().setupStyle(canvas, camera.zoom);
                        canvas.ctx.textAlign = TextAlign.Center;

                        const infoBoxWidth = titleWidth * 1.5;
                        const textEntries = splitStringIntoLines(canvas, this.infoText, infoBoxWidth);

                        const lineHeight = this.infoSymbol.getStyle().getSize() + 2;
                        const infoBoxHeight = lineHeight * textEntries.length * camera.zoom;
                        const scaledLineHeight = lineHeight * camera.zoom;
                        const start = titleY - infoBoxHeight - scaledLineHeight / 2;

                        canvas
                            .fillStyle(this.titleColor)
                            .roundedRect(
                                centerX - infoBoxWidth / 2 - scaledLineHeight / 2,
                                start - scaledLineHeight,
                                infoBoxWidth + scaledLineHeight,
                                infoBoxHeight + scaledLineHeight,
                                nodeStyle.getRadius() * camera.zoom,
                            );

                        this.infoSymbol.getStyle().setupStyle(canvas, camera.zoom);
                        for (let i = 0; i < textEntries.length; i++) {
                            const entry = textEntries[i];
                            canvas.textDraw(entry, centerX, start + i * lineHeight * camera.zoom);
                        }
                    });
                }

                canvas
                    .begin()
                    .arc(centerX, centerY, infoRadius, 0, 2 * Math.PI, false)
                    .lineWidth(infoLineThickness)
                    .strokeStyle(this.infoSymbol.getColor())
                    .stroke();

                canvas.ctx.textAlign = TextAlign.Center;
                this.infoSymbol.render(canvas, camera.zoom, infoPosition);
            }

            let startY = nodeBounds.pos.y + scaledPadding * 2 + titleSize.y + scaledElementSpacing;
            const leftSide = nodeBounds.pos.x + scaledPadding;
            for (let i = 0; i < this.input.length; i++) {
                canvas.ctx.textAlign = TextAlign.Left;
                const port = this.input[i];
                this.portTextStyle.measure(canvas, camera.zoom, port.getDisplayName(), tempMeasurement);
                const position = VectorPool.get();

                position.x = nodeBounds.pos.x;
                position.y = startY + tempMeasurement.y / 2;

                this.portTextStyle.setupStyle(canvas, camera.zoom);
                canvas.textDraw(port.getDisplayName(), leftSide, position.y);

                this.inputPortPositions.push(port.render(canvas, position, camera, mousePos, postProcess));

                startY += tempMeasurement.y + scaledElementSpacing;
            }

            const rightSide = nodeBounds.pos.x + nodeBounds.size.x;
            canvas.ctx.textAlign = TextAlign.Right;
            for (let i = 0; i < this.output.length; i++) {
                const port = this.output[i];
                this.portTextStyle.measure(canvas, camera.zoom, port.getDisplayName(), tempMeasurement);
                const pos = VectorPool.get();
                pos.x = rightSide;
                pos.y = startY + tempMeasurement.y / 2;

                this.portTextStyle.setupStyle(canvas, camera.zoom);
                canvas.textDraw(port.getDisplayName(), rightSide - scaledPadding, pos.y);

                this.outputPortPositions.push(port.render(canvas, pos, camera, mousePos, postProcess));

                startY += tempMeasurement.y + scaledElementSpacing;
            }

            for (let i = 0; i < this.widgets.length; i++) {
                const widget = this.widgets[i];
                const widgetSize = widget.size();
                const scaledWidgetWidth = widgetSize.x * camera.zoom;

                const position = VectorPool.get();
                position.x = nodeBounds.pos.x + (nodeBounds.size.x - scaledWidgetWidth) / 2;
                position.y = startY;

                this.widgetPositions.push(widget.draw(canvas, position, camera.zoom, mousePos));
                startY += widgetSize.y * camera.zoom + scaledElementSpacing;
            }

            const messageStart = VectorPool.get();
            messageStart.x = nodeBounds.pos.x + nodeBounds.size.x / 2;
            messageStart.y = nodeBounds.pos.y + nodeBounds.size.y + 15 * camera.zoom;
            for (let i = 0; i < this.messages.length; i++) {
                const message = this.messages[i];
                messageStart.y += message.render(canvas, camera.zoom, messageStart, !(state === NodeState.Idle)) + 10 * camera.zoom;
            }
        });
    }
}
