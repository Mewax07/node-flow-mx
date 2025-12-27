import { FlowNode } from "../node";
import { NumberWidget, NumberWidgetConfig } from "./number";
import { Widget } from "./widget";

export type WidgetBuilder = (node: FlowNode, confg?: any) => Widget;

class WidgetFactory {
    private registeredWidgets: Map<string, WidgetBuilder>;

    constructor() {
        this.registeredWidgets = new Map<string, WidgetBuilder>();
    }

    register(widgetType: string, builder: WidgetBuilder): void {
        this.registeredWidgets.set(widgetType, builder);
    }

    create(node: FlowNode, widgetType: string, config: any): Widget {
        const builder = this.registeredWidgets.get(widgetType);
        if (builder === undefined) {
            throw new Error("No builder registered for widget: " + widgetType);
        }
        return builder(node, config);
    }
}

const globalWidgetFactory = new WidgetFactory();

// globalWidgetFactory.register("button", (_node: FlowNode, config?: ButtonWidgetConfig) => new ButtonWidget(config));
globalWidgetFactory.register("number", (node: FlowNode, config?: NumberWidgetConfig) => new NumberWidget(node, config));
// globalWidgetFactory.register("color", (node: FlowNode, config?: ColorWidgetConfig) => new ColorWidget(node, config));
// globalWidgetFactory.register("slider", (node: FlowNode, config?: SliderWidgetConfig) => new SliderWidget(node, config));
// globalWidgetFactory.register("string", (node: FlowNode, config?: StringWidgetConfig) => new StringWidget(node, config));
// globalWidgetFactory.register("toggle", (node: FlowNode, config?: ToggleWidgetConfig) => new ToggleWidget(node, config));
// globalWidgetFactory.register("image", (_node: FlowNode, config?: ImageWidgetConfig) => new ImageWidget(config));
// globalWidgetFactory.register("text", (node: FlowNode, config?: TextWidgetConfig) => new TextWidget(node, config));

export { globalWidgetFactory as GlobalWidgetFactory };