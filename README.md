# Node Flow (MX Edit) - TypeScript Rewrite of [Node Flow](https://github.com/EliCDavis/node-flow/tree/main)

Another Flow-based Node graph library.

## About

Node Flow (MX Edit) is a TypeScript rewrite of [Node Flow](https://github.com/EliCDavis/node-flow/tree/main).  
It is primarily used as the node-graph engine for the private tool **AnoSpy**. This version improves type safety, maintainability, and integration with other TypeScript projects.

## Install

Since this is a private fork for **AnoSpy**, it is not published to npm. Clone the repository and use locally (no build exists for no):

```bash
git clone https://github.com/Mewax07/node-flow-mx.git
cd node-flow-mx
bun i
bun run dev
```

## Usage

Basic example:

```typescript
import { NodeFlowGraph, FlowNode } from "./path-to-built-library";

// Create canvas
const canvas = new Html("canvas");

// Initialize graph
const graph = new NodeFlowGraph(canvas, {
    backgroundColor: "#222222",
});

// Add a node
const node = new FlowNode({ title: "Example Node" });
graph.addNode(node);
```

## Contributing

This project is currently maintained for internal use by **AnoSpy**.
External contributions are welcome under the following guidelines:

1. Ensure TypeScript type safety and project structure is maintained.
2. Keep commits focused and descriptive.
3. Major features or changes should be discussed before implementation.

Please note that some parts of the library are private/internal and may not be suitable for external use.

## License

This project is a private rewrite based on Node Flow. Respect the original Node Flow license when using or redistributing code.
