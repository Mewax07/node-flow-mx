import { NodeFlowGraph } from "./flow/graph";
import { FlowNode, MessageType } from "./flow/node";
import { FlowNote } from "./flow/notes/note";
import { Vector2 } from "./flow/utils/vector";
import { Html } from "./libs";

const canvas = Html.canvas().appendTo(document.body);

const graph = new NodeFlowGraph(canvas, {
    nodes: {
        publishers: {
            example: {
                name: "Example",
                description: "Bunch of example nodes",
                version: "1.0.0",
                nodes: {
                    empty: {
                        title: "Empty Node",
                        canEditTitle: true,
                        canEditPorts: true,
                        canEditInfo: true,
                    },
                },
            },
        },
    },
});

graph.addNote(
    new FlowNote({
        position: new Vector2(800, 20),
        locked: true,
        text: `
# Titre principal

## Titre secondaire

Texte normal avec *italique* **gras** et ~~texte striked~~
Texte avec du \`code inline\`.

> Ceci est une citation simple.
> Elle peut s'étendre sur plusieurs lignes.

> > Citation imbriquée
> > avec du *style*.

## Titre secondaire

- Élément de liste niveau 0
- Élément avec *italique* et **gras**
	- Élément indenté (tab)
		- Élément doublement indenté
	- Élément indenté (tab)
	- Élément indenté (tab)

- Élément après indentation

* Autre style de liste
+ Encore un style
[ ] Checkbox non cochée
[x] Checkbox cochée

Texte avec un lien :
[OpenAI](https://openai.com)
`,
    }),
);

var sumNode = new FlowNode({
    position: new Vector2(750, 700),
    title: "Add",
    info: "I add two numbers",
    inputs: [
        { name: "a", type: "float32" },
        { name: "b", type: "float32" },
    ],
    outputs: [{ name: "sum", type: "float32", description: "The sum of a and b" }],
});

var aNode = new FlowNode({
    position: new Vector2(450, 500),
    title: "Number",
    info: "I'm a node with a number widget",
    outputs: [{ name: "value", type: "float32" }],
    widgets: [
        {
            type: "number",
            config: { value: 1 },
        },
    ],
});

var bNode = new FlowNode({
    position: new Vector2(450, 650),
    title: "Number",
    info: "I'm a node with both a number and image widget on it",
    outputs: [{ name: "value", type: "float32" }],
    widgets: [
        {
            type: "number",
            config: { value: 2 },
        },
    ],
});

const arrNode = new FlowNode({
    position: new Vector2(750, 950),
    title: "Add",
    subTitle: "Array Inputs",
    info: "This node contains a port that can take multiple input nodes at once, which can be useful for operations that can operate on [0,n] data sizes",
    inputs: [{ name: "numbers", type: "float32", array: true, description: "All numbers to add together" }],
    outputs: [{ name: "sum", type: "float32", description: "The sum of all connected nodes to our 'numbers' port" }],
    messages: [
        {
            message: "I am a message attatched to the node",
            alwaysShow: true,
        },
        {
            message: "I am a message that only shows when you're hovering over the node!",
        },
        {
            message: 'I am another message attatched to the node with type "error"',
            type: MessageType.Error,
            alwaysShow: true,
        },
    ],
});

graph.addNode(sumNode);
graph.addNode(aNode);
graph.addNode(bNode);
graph.addNode(arrNode);

graph.connectNodes(aNode, 0, sumNode, 0);
graph.connectNodes(bNode, 0, sumNode, 1);

graph.connectNodes(aNode, 0, arrNode, 0);
graph.connectNodes(bNode, 0, arrNode, 0);
