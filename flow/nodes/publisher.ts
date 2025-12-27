import { ContextMenuConfig, ContextMenuItemConfig } from "../menu/context";
import { FlowNode, FlowNodeConfig } from "../node";
import { Vector2 } from "../utils/vector";
import { NodeSubsystem } from "./subsystem";

interface PublisherNodes {
    [name: string]: FlowNodeConfig;
}

export type PublisherConfig = Partial<{
    name: string;
    description: string;
    version: string;
    nodes: PublisherNodes;
}>;

export class Publisher {
    private name: string;
    private description: string;
    private version: string;

    private registeredNodes: Map<string, FlowNodeConfig>;

    constructor(config?: PublisherConfig) {
        this.name = config?.name ? config.name : "Unknown";
        this.description = config?.description ? config.description : "No description";
        this.version = config?.version ? config.version : "v0.1.0";

        this.registeredNodes = new Map();

        if (config?.nodes) {
            for (const nodKey in config.nodes) {
                this.register(nodKey, config.nodes[nodKey]);
            }
        }
    }

    getNodes() {
        return this.registeredNodes;
    }

    register(nodeType: string, conf: FlowNodeConfig) {
        this.registeredNodes.set(nodeType, conf);
    }

    unregister(nodeType: string): boolean {
        return this.registeredNodes.delete(nodeType);
    }

    private recurseBuildMenu(graph: NodeSubsystem, name: string, subMenu: Map<string, FlowNodeConfig>, position: Vector2): ContextMenuConfig {
        const items: Array<ContextMenuItemConfig> = [];
        const subMenus = new Map<string, Map<string, FlowNodeConfig>>();

        for (let [key, nodeConfig] of subMenu) {
            const slashIndex = key.indexOf("/");
            const bracketIndex = key.indexOf("[");

            if (slashIndex === -1 || (bracketIndex !== -1 && bracketIndex < slashIndex)) {
                items.push({
                    name: key,
                    callback: () => {
                        const node = new FlowNode(nodeConfig);
                        node.setPosition(position);
                        graph.addNode(node);
                    },
                });
            } else {
                const elements = key.split("/");
                if (!subMenus.has(elements[0])) {
                    subMenus.set(elements[0], new Map<string, FlowNodeConfig>());
                }

                const menu = subMenus.get(elements[0]);
                elements.shift();
                menu?.set(elements.join("/"), nodeConfig);
            }
        }

        const menus: Array<ContextMenuConfig> = [];
        for (let [key, nodes] of subMenus) {
            menus.push(this.recurseBuildMenu(graph, key, nodes, position));
        }

        return {
            name: name,
            items: items,
            subMenus: menus,
        };
    }

    contextMenu(graph: NodeSubsystem, position: Vector2): ContextMenuConfig {
        return this.recurseBuildMenu(graph, this.name, this.registeredNodes, position);
    }

    create(nodeType: string): FlowNode {
        const config = this.registeredNodes.get(nodeType);
        if (!config) {
            throw new Error(`no builder registered for node: ${nodeType}.`);
        }

        return new FlowNode(config);
    }

    getName() {
        return this.name;
    }

    getDescription() {
        return this.description;
    }

    getVersion() {
        return this.version;
    }
}
