import { HtmlCanvas } from ".";
import { Camera } from "./camera";
import { Connection } from "./connection";
import { RenderElementBase } from "./elements/base";
import { ContainerRenderElement } from "./elements/container";
import { TextAlign, TextElement } from "./elements/text";
import { FlowNode } from "./node";
import { FontStyle } from "./styles/text";
import { Theme } from "./theme";
import { Box } from "./utils/box";
import { Color, HSV, HSV2RGB, rbgToHex } from "./utils/color";
import { Cfg } from "./utils/config";
import { Subsystem } from "./utils/subsys";
import { Text } from "./utils/text";
import { Vector2 } from "./utils/vector";

export enum PortType {
    Input = "INPUT",
    Output = "OUTPUT",
    InputArray = "INPUTARRAY",
    OutputArray = "OUTPUTARRAY",
}

export type PortStyle = Partial<{
    size: number;
    fillColor: string;
    borderColor: string;
    borderSize: number;
}>

type ConnectionChangeCallback = (connection: Connection, connectionIndex: number, port: Port, portType: PortType, node: FlowNode) => void;

export type PortConfig = Partial<{
    name: string;
    type: string;
    description: string;
    array: boolean;
    emptyStyle: PortStyle;
    filledStyle: PortStyle;
    onConnectionAdded: ConnectionChangeCallback;
    onConnectionRemoved: ConnectionChangeCallback;
}>;

function fallbackColor(type: string, s: number): string {
    let value = 0;
    for (let i = 0; i < type.length; i++) {
        value += type.charCodeAt(i) * (i + 1);
    }

    value = Math.round(value) % 24;

    const hsv: HSV = { h: (value / 23) * 360, s, v: 1 };
    const color: Color = { r: 0, g: 0, b: 0 };
    HSV2RGB(hsv, color);
    return rbgToHex(color);
}

export class Port {
    private node: FlowNode;
    private displayName: string;
    private emptyStyle: PortStyle;
    private filledStyle: PortStyle;
    private connections: Array<Connection>;
    private portType: PortType;
    private dataType: string;
    private dataTypePopupElement: RenderElementBase;
    private onConnectionAdded: Array<ConnectionChangeCallback>;
    private onConnectionRemoved: Array<ConnectionChangeCallback>;

    private box: Box = new Box();

    constructor(node: FlowNode, portType: PortType, config?: PortConfig) {
        this.node = node;
        this.connections = new Array();
        this.portType = portType;
        this.displayName = Cfg.value(config?.name, "Port");
        this.dataType = Cfg.value(config?.type, "");

        this.emptyStyle = {
            borderColor: Cfg.value(config?.emptyStyle?.borderColor, Theme.Node.Port.BorderColor),
            fillColor: Cfg.value(config?.emptyStyle?.fillColor, fallbackColor(this.dataType, 0.3)),
            borderSize: Cfg.value(config?.emptyStyle?.borderSize, 1),
            size: Cfg.value(config?.emptyStyle?.size, 4),
        };

        this.filledStyle = {
            borderColor: Cfg.value(config?.filledStyle?.borderColor, Theme.Node.Port.BorderColor),
            fillColor: Cfg.value(config?.filledStyle?.fillColor, fallbackColor(this.dataType, 0.2)),
            borderSize: Cfg.value(config?.filledStyle?.borderSize, 1),
            size: Cfg.value(config?.filledStyle?.size, 5),
        };

        this.onConnectionAdded = new Array();
        if (config?.onConnectionAdded) {
            this.onConnectionAdded.push(config.onConnectionAdded);
        }

        this.onConnectionRemoved = new Array();
        if (config?.onConnectionRemoved) {
            this.onConnectionRemoved.push(config.onConnectionRemoved);
        }

        const containerElements = new Array();
        let dataTypeDisplay = this.dataType;
        if (config?.array === true) {
            dataTypeDisplay = "Array<" + dataTypeDisplay + ">";
        }
        containerElements.push(
            new TextElement(
                new Text(dataTypeDisplay, {
                    color: "white",
                }),
                {
                    align: TextAlign.Center,
                },
            ),
        );

        const description = config?.description;
        if (description && description !== "") {
            containerElements.push(
                new TextElement(
                    new Text(description, {
                        color: "white",
                        style: FontStyle.Italic,
                    }),
                    {
                        align: TextAlign.Center,
                        padding: { top: 16 },
                        maxWidth: 400,
                        lineHeight: 1.5,
                    },
                ),
            );
        }

        this.dataTypePopupElement = new ContainerRenderElement(containerElements, {
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            border: {
                radius: 6,
            },
            padding: 13,
        });
    }

    addConnection(connection: Connection) {
        const c = this.connections.length;
        this.connections.push(connection);
        for (let i = 0; i < this.onConnectionAdded.length; i++) {
            this.onConnectionAdded[i](connection, c, this, this.portType, this.node);
        }
    }

    replaceConnection(connection: Connection, index: number) {
        const c = this.connections.length;
        this.connections[index] = connection;
        for (let i = 0; i < this.onConnectionAdded.length; i++) {
            this.onConnectionAdded[i](connection, c, this, this.portType, this.node);
        }
    }

    addConnectionAddedListener(callback: ConnectionChangeCallback) {
        if (!callback) {
            return;
        }
        this.onConnectionAdded.push(callback);
    }

    getConnections(): Array<Connection> {
        return this.connections;
    }

    addConnectionRemovedListener(callback: ConnectionChangeCallback) {
        if (callback === undefined) {
            return;
        }
        this.onConnectionRemoved.push(callback);
    }

    clearConnection(connection: Connection): void {
        const index = this.connections.indexOf(connection);
        if (index > -1) {
            this.connections.splice(index, 1);
            for (let i = 0; i < this.onConnectionRemoved.length; i++) {
                this.onConnectionRemoved[i](connection, index, this, this.portType, this.node);
            }
        } else {
            console.error("no connection found to remove");
        }
    }

    getDataType(): string {
        return this.dataType;
    }

    getPortType(): PortType {
        return this.portType;
    }

    getDisplayName(): string {
        return this.displayName;
    }

    filledStyleColor(): string {
        if (this.filledStyle.fillColor === undefined) {
            console.error("There's no fill color");
            return "black";
        }
        return this.filledStyle.fillColor;
    }

    render(canvas: HtmlCanvas, pos: Vector2, camera: Camera, mousePos: Vector2 | undefined, postProcess: Subsystem): Box {
        let style = this.emptyStyle;
        if (this.connections.length > 0) {
            style = this.filledStyle;
        }

        let scaledRadius = style.size! * camera.zoom;

        if (mousePos && this.box.contains(mousePos)) {
            scaledRadius *= 1.25;

            const xPos = pos.x;
            const yPos = pos.y;

            postProcess.queue(() => {
                const size = new Vector2();
                this.dataTypePopupElement.calcSize(canvas, size, new Vector2(-1, -1));
                this.dataTypePopupElement.render(canvas, new Vector2(xPos - size.x / 2, yPos), 1, size);
            });
        }

        this.box.pos.x = pos.x - scaledRadius;
        this.box.pos.y = pos.y - scaledRadius;
        this.box.size.x = scaledRadius * 2;
        this.box.size.y = scaledRadius * 2;

        canvas.strokeStyle(style.borderColor!).fillStyle(style.fillColor!);

        if (this.portType === PortType.InputArray) {
            canvas.rect(pos.x - scaledRadius, pos.y - scaledRadius, scaledRadius * 2, scaledRadius * 2, "f+s");
        } else {
            canvas.circle(pos.x, pos.y, scaledRadius, "f+s");
        }

        return this.box;
    }
}
