import { CreateNodeData } from "../Nodes/Node.types";
import { NodeId } from "../Nodes/NodeId";
import { NodeArray } from "../Nodes/NodeArray";
import { ComponentArray } from "../Components/ComponentArray";
import { NodeCursor } from "../Nodes/NodeCursor";
import { ContextArray } from "../Contexts/ContextArray";
import { TagArray } from "../Tags/TagArray";
import { NCSPools } from "../Pools/NCSPools";
import { SystemInstance } from "../Systems/SystemInstance";

function createNode(graph: Graph, data: CreateNodeData, parent: number) {
  const newNode = graph._nodes.addNode(
    typeof data[0] == "string" ? NodeId.FromString(data[0]) : data[0],
    parent,
    data[1],
  );
  const nodeCursor = NodeCursor.Get();
  nodeCursor.setNode(graph, newNode);

  if (data[2]?.length) {
    for (let i = 0; i < data[2].length; i++) {
      const comp = data[2][i];
      if (!comp) continue;
      nodeCursor.components.add(comp);
    }
  }
  if (data[3]?.length) {
    for (let i = 0; i < data[3].length; i++) {
      nodeCursor.tags.add(data[3][i]);
    }
  }

  if (data[4]?.length) {
    for (let i = 0; i < data[4].length; i++) {
      const node = data[4][i];
      if (!node) continue;
      createNode(graph, node, newNode);
    }
  }
  nodeCursor.setNode(graph, newNode);

  data[0] = null;
  data[1] = "";
  data[2] = null;
  data[3] = null;
  data[4] = null;
  NCSPools.createNodeData.addItem(data);

  if (parent >= 0) {
    const parentCursor = NodeCursor.Get();
    parentCursor.setNode(graph, parent);
    parentCursor.addChild(nodeCursor);
    parentCursor.returnCursor();
  }
  return nodeCursor;
}

export class Graph {
  _systems: SystemInstance[] = [];
  _nodes = new NodeArray();
  _components: ComponentArray[] = [];
  _contexts = new ContextArray();
  _tags: TagArray[] = [];
  _updatingComponents: ComponentArray[] = [];

  root = NodeCursor.Get();

  constructor() {
    const rootIndex = this._nodes.addNode(null, -1, "root");
    this.root.setNode(this, rootIndex);
  }
  getNode(index: number, cursor = NodeCursor.Get()) {
    const parentIndex = this._nodes._parents[index];
    if (typeof parentIndex === "undefined")
      throw new Error(`NCS: Node with index ${index} does not exist`);
    cursor.setNode(this, index);
    return cursor;
  }

  getNodeFromId(id: bigint | string, cursor = NodeCursor.Get()) {
    if (typeof id == "string") id = NodeId.FromString(id);
    const nodeIndex = this._nodes._idMap.get(id);
    if (typeof nodeIndex === "undefined")
      throw new Error(`NCS: Node with id ${id} does not exist`);
    cursor.setNode(this, nodeIndex);
    return cursor;
  }

  addNode(
    data: CreateNodeData,
    parent: number = this.root.index,
    cursor = NodeCursor.Get(),
  ) {
    if (typeof parent !== "number")
      throw new Error(
        `NCS: Passed in invalid parent ${parent} in graph.addNode`,
      );
    const newNode = createNode(this, data, parent);
    if (newNode.hasComponents) {
      const components = newNode.components.components;
      for (let i = 0; i < components.length; i += 2) {
        this._components[components[i]].init(components[i + 1]);
      }
    }
    for (const child of newNode.traverseChildren()) {
      if (child.hasComponents) {
        const components = child.components.components;
        for (let i = 0; i < components.length; i += 2) {
          this._components[components[i]].init(components[i + 1]);
        }
      }
    }
    newNode.toRef(cursor);
    newNode.returnCursor();
    return cursor;
  }

  removeNode(index: number) {
    const node = this._nodes.removeNode(index);
    if (!node) return false;
    return true;
  }
  private _lastTime = 0;
  update() {
    if (this._lastTime == 0) {
      this._lastTime = performance.now();
      return;
    }
    const current = performance.now();
    const delta = current - this._lastTime;
    this._lastTime = current;
    for (let i = 0; i < this._updatingComponents.length; i++) {
      this._updatingComponents[i].update(delta);
    }
    for (let i = 0; i < this._systems.length; i++) {
      this._systems[i].update(delta);
    }
  }
}
