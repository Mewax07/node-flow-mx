import { ContextMenuConfig } from "../menu/context";
import { FlowNode } from "../node";
import { Vector2 } from "../utils/vector";
import { Publisher, PublisherConfig } from "./publisher";
import { nodeFlowGroup, NodeSubsystem } from "./subsystem";

export type NodeCreatedCallback = (publisher: string, nodeType: string, node: FlowNode) => void;

interface NodeFactoryPublishers {
    [name: string]: PublisherConfig;
}

export type NodeFactoryConfig = Partial<{
    publishers: NodeFactoryPublishers;
    onNodeCreated: NodeCreatedCallback;
}>;

export class NodeFactory {
    registeredPublishers: Map<string, Publisher>;
    registeredCallbacks: Array<NodeCreatedCallback>;

    constructor(config?: NodeFactoryConfig) {
        this.registeredPublishers = new Map();
        this.registeredCallbacks = new Array();

        if (config?.onNodeCreated) {
            this.registeredCallbacks.push(config.onNodeCreated);
        }

        if (config?.publishers) {
            for (let entry in config.publishers) {
                this.addPublisher(entry, new Publisher(config.publishers[entry]));
            }
        }
    }

    addOnNodeCreatedListener(callback: NodeCreatedCallback) {
        this.registeredCallbacks.push(callback);
    }

    addPublisher(id: string, pub: Publisher) {
        this.registeredPublishers.set(id, pub);
    }

    create(publisher: string, nodeType: string): FlowNode {
        const publisherId = this.registeredPublishers.get(publisher);
        if (!publisherId) {
            throw new Error(`no publisher registered with identifier: ${publisher}.`);
        }

        const node = publisherId.create(nodeType);

        for (let callback of this.registeredCallbacks) {
            callback(publisher, nodeType, node);
        }

        return node;
    }

    newNodeSubmenus(graph: NodeSubsystem, position: Vector2): Array<ContextMenuConfig> {
        const menus: Array<ContextMenuConfig> = [];
        for (let [_, publisher] of this.registeredPublishers) {
            menus.push(publisher.contextMenu(graph, position));
        }
        return menus;
    }

    openMenu(graph: NodeSubsystem, position: Vector2): ContextMenuConfig {
        return {
            name: "New Node",
            group: nodeFlowGroup,
            subMenus: this.newNodeSubmenus(graph, position),
        };
    }
}
