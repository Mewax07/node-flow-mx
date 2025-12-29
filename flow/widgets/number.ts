import { HtmlCanvas } from "../.";
import { FlowNode } from "../node";
import { TextBoxStyle, TextBoxStyleConfig, textBoxStyleWithFallback } from "../styles/textbox";
import { onThemeChange, Theme } from "../theme";
import { Box } from "../utils/box";
import { Cfg } from "../utils/config";
import { Vector2 } from "../utils/vector";
import { height, Widget, width } from "./widget";

export type NumberWidgetConfig = Partial<{
    value: number;
    property: string;
    idleBoxStyle: TextBoxStyleConfig;
    highlightBoxStyle: TextBoxStyleConfig;
    blurBoxStyle: TextBoxStyleConfig;
    callback: (newNumber: number) => void;
}>;

export class NumberWidget extends Widget {
    private node: FlowNode;
    private nodeProperty: string | undefined;
    private value: number;
    private idleBoxStyle: TextBoxStyle;
    private highlightBoxStyle: TextBoxStyle;
    private bluredBoxStyle: TextBoxStyle;
    private text: string;
    private callback?: (newNumber: number) => void;

    public isBlured: boolean;

    constructor(node: FlowNode, config?: NumberWidgetConfig) {
        super();
        this.value = 0;
        this.text = "0";

        this.node = node;
        this.nodeProperty = config?.property;
        this.idleBoxStyle = new TextBoxStyle(
            textBoxStyleWithFallback(config?.idleBoxStyle, {
                box: {
                    color: Theme.Widget.BackgroundColor,
                    border: {
                        size: Theme.Widget.Border.Size,
                        color: Theme.Widget.Border.Color,
                    },
                    radius: Theme.Widget.Border.Radius,
                },
                text: { color: Theme.Widget.FontColor },
            }),
        );
        this.highlightBoxStyle = new TextBoxStyle(
            textBoxStyleWithFallback(config?.highlightBoxStyle, {
                box: {
                    color: Theme.Widget.Hover.BackgroundColor,
                    border: {
                        size: Theme.Widget.Border.Size,
                        color: Theme.Widget.Border.Color,
                    },
                    radius: Theme.Widget.Border.Radius,
                },
                text: { color: Theme.Widget.FontColor },
            }),
        );
        this.bluredBoxStyle = new TextBoxStyle(
            textBoxStyleWithFallback(config?.blurBoxStyle, {
                box: {
                    color: Theme.Widget.Blured.BackgroundColor,
                    border: {
                        size: Theme.Widget.Border.Size,
                        color: Theme.Widget.Border.Color,
                    },
                    radius: Theme.Widget.Border.Radius,
                },
                text: { color: Theme.Widget.FontColor },
            }),
        );
        this.set(Cfg.value(config?.value, 0));
        this.callback = config?.callback;

        if (this.nodeProperty) {
            this.node.addPropertyChangeListener(this.nodeProperty, (_oldVal, newVal) => {
                this.set(newVal);
            });
        }

        this.isBlured = false;

        onThemeChange((theme) => {
            this.idleBoxStyle = new TextBoxStyle(
                textBoxStyleWithFallback(config?.idleBoxStyle, {
                    box: {
                        color: theme.Widget.BackgroundColor,
                        border: {
                            size: theme.Widget.Border.Size,
                            color: theme.Widget.Border.Color,
                        },
                        radius: theme.Widget.Border.Radius,
                    },
                    text: { color: theme.Widget.FontColor },
                }),
            );
            this.highlightBoxStyle = new TextBoxStyle(
                textBoxStyleWithFallback(config?.highlightBoxStyle, {
                    box: {
                        color: theme.Widget.Hover.BackgroundColor,
                        border: {
                            size: theme.Widget.Border.Size,
                            color: theme.Widget.Border.Color,
                        },
                        radius: theme.Widget.Border.Radius,
                    },
                    text: { color: theme.Widget.FontColor },
                }),
            );
            this.bluredBoxStyle = new TextBoxStyle(
                textBoxStyleWithFallback(config?.blurBoxStyle, {
                    box: {
                        color: theme.Widget.Blured.BackgroundColor,
                        border: {
                            size: theme.Widget.Border.Size,
                            color: theme.Widget.Border.Color,
                        },
                        radius: theme.Widget.Border.Radius,
                    },
                    text: { color: theme.Widget.FontColor },
                }),
            );
        });
    }

    size() {
        return new Vector2(width, height);
    }

    set(newNumber: number) {
        if (this.value === newNumber) {
            return;
        }

        this.value = newNumber;

        if (this.nodeProperty) {
            this.node.setProperty(this.nodeProperty, this.value);
        }

        if (this.callback) {
            this.callback(this.value);
        }

        this.text = "" + parseFloat(this.value.toPrecision(6));
    }

    clickStart() {
        this.isBlured = true;
    }

    clickEnd() {}

    draw(canvas: HtmlCanvas, position: Vector2, scale: number, mousePosition: Vector2 | undefined): Box {
        const box = new Box();
        box.size.copy(new Vector2(width * scale, height * scale));
        box.pos.copy(position);

        let style: TextBoxStyle = this.idleBoxStyle;

        if (mousePosition) {
            if (box.contains(mousePosition)) {
                style = this.highlightBoxStyle;
            }
        }

        if (this.isBlured && style !== this.highlightBoxStyle && this.node.isSelected()) {
            style = this.bluredBoxStyle;
        }

        style.drawUnderline(canvas, box, scale, this.text);

        return box;
    }
}
