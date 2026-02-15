import { Graph } from "../Graphs/Graph";
import { NodeId } from "./NodeId";
import { NodeEvents } from "./NodeEvents";
import { NodeObservers } from "./NodeObservers";
import { NodeContext } from "./NodeContext";
import { NodeComponents } from "./NodeComponents";
import { NodeTags } from "./NodeTags";
import { Nullable } from "../Util/Util.types";
import { ComponentCursor } from "../Components/ComponentCursor";
import { TagCursor } from "../Tags/TagCursor";
import { NCSPools } from "../Pools/NCSPools";

export interface NodeCursor {}

export class NodeCursor {
  static Get() {
    const cursor = NCSPools.nodeCursor.get();
    if (!cursor) return new NodeCursor();
    return cursor;
  }

  static Return(cursor: NodeCursor) {
    if (cursor.index !== -1) {
      cursor.clear(
        cursor.hasEvents,
        cursor.hasContexts,
        cursor.hasObservers,
        cursor.hasComponents,
        cursor.hasTags,
      );
    }
    NCSPools.nodeCursor.addItem(cursor);
  }

  clear(
    events: boolean,
    context: boolean,
    observers: boolean,
    compoents: boolean,
    tags: boolean,
  ) {
    this._index = -1;
    if (events && this._events) {
      NodeEvents.Retrun(this._events);
      this._events = null;
    }
    if (context && this._context) {
      NodeContext.Retrun(this._context);
      this._context = null;
    }
    if (observers && this._observers) {
      NodeObservers.Retrun(this._observers);
      this._observers = null;
    }
    if (compoents && this._components) {
      NodeComponents.Retrun(this._components);
      this._components = null;
    }
    if (tags && this._tags) {
      NodeTags.Retrun(this._tags);
      this._tags = null;
    }
  }

  get index() {
    return this._index;
  }

  get id(): bigint | null {
    return this.graph._nodes._indexMap[this.index] || null;
  }

  get name() {
    return this.arrays._names[this._index];
  }

  private _events: Nullable<NodeEvents> = null;
  get events() {
    if (!this._events) {
      this._events = NodeEvents.Get();
    }
    this._events.node = this;
    return this._events;
  }

  get hasEvents() {
    return this._events !== null;
  }

  private _context: Nullable<NodeContext> = null;
  get context() {
    if (!this._context) {
      this._context = NodeContext.Get();
    }
    this._context.node = this;
    return this._context;
  }

  get hasContexts() {
    return this._context !== null;
  }

  private _observers: Nullable<NodeObservers> = null;
  get observers() {
    if (!this._observers) {
      this._observers = NodeObservers.Get();
    }
    this._observers.node = this;
    return this._observers;
  }

  get hasObservers() {
    return this.arrays._hasObservers[this._index];
  }

  private _components: Nullable<NodeComponents> = null;
  get components() {
    if (!this._components) {
      this._components = NodeComponents.Get();
    }
    this._components.node = this;
    return this._components;
  }

  get hasComponents() {
    return this._components !== null;
  }

  private _tags: Nullable<NodeTags> = null;
  get tags() {
    if (!this._tags) {
      this._tags = NodeTags.Get();
    }
    this._tags.node = this;
    return this._tags;
  }

  get hasTags() {
    return this._tags !== null;
  }

  get childrenArray() {
    return this.arrays._children[this._index] || null;
  }
  get parent() {
    return this.arrays._parents[this._index];
  }
  set parent(value: number) {
    this.arrays._parents[this._index] = value;
  }
  public graph: Graph;
  get arrays() {
    return this.graph._nodes;
  }

  get enabled() {
    return this.arrays._enabled[this._index];
  }
  set enabled(enabled: boolean) {
    this.arrays._enabled[this._index] = enabled;
    if (this.hasObservers) {
      this.observers.isEnabledSet && this.observers.enabled.notify(enabled);
    }
  }
  get isDisposed() {
    return this.arrays._disposed[this._index];
  }
  private _index = -1;

  private constructor() {}

  setNode(graph: Graph, index: number) {
    this._index = index;
    this.graph = graph;
    if (this.arrays._components[index] !== undefined) {
      this._components = NodeComponents.Get();
      this._components.node = this;
    } else {
      if (this._components) NodeComponents.Retrun(this._components);
      this._components = null;
    }
    if (this.arrays._tags[index] !== undefined) {
      this._tags = NodeTags.Get();
      this._tags.node = this;
    } else {
      if (this._tags) NodeTags.Retrun(this._tags);
      this._tags = null;
    }
    if (this.arrays._context[index] !== undefined) {
      this._context = NodeContext.Get();
      this._context.node = this;
    } else {
      if (this._context) NodeContext.Retrun(this._context);
      this._context = null;
    }
    return this;
  }

  toRef(cursor = new NodeCursor()) {
    return cursor.setNode(this.graph, this.index);
  }

  /** Traverse the node's direct children */
  *children(cursor?: NodeCursor): Generator<NodeCursor> {
    const array = this.childrenArray;

    if (!array) return false;
    const templChildArray: number[] = NCSPools.numberArray.get() || [];
    const length = array.length;
    templChildArray.length = length;
    for (let i = 0; i < length; i++) {
      templChildArray[i] = array[i];
    }
    let usedTemp = false;
    if (!cursor) {
      usedTemp = true;
      cursor = NodeCursor.Get();
    }
    for (let i = 0; i < length; i++) {
      cursor.setNode(this.graph, templChildArray[i]);
      yield cursor;
    }
    templChildArray.length = 0;
    NCSPools.numberArray.addItem(templChildArray);
    if (usedTemp) cursor.returnCursor();
    return true;
  }

  /** Traverse all the node's descendants */
  *traverseChildren(cursor?: NodeCursor): Generator<NodeCursor> {
    if (!this.childrenArray) return false;
    const children: number[][] = [this.childrenArray];
    let usedTemp = false;
    if (!cursor) {
      usedTemp = true;
      cursor = NodeCursor.Get();
    }
    while (children.length) {
      const childrenArray = children.pop()!;
      if (!childrenArray) continue;
      for (let i = 0; i < childrenArray.length; i++) {
        cursor.setNode(this.graph, childrenArray[i]);
        yield cursor;
        if (this.arrays._children[childrenArray[i]] !== undefined) {
          children.push(this.arrays._children[childrenArray[i]]);
        }
      }
    }
    if (usedTemp) cursor.returnCursor();
    return true;
  }

  /** Traverse all the node's parents */
  *traverseParents(cursor?: NodeCursor): Generator<NodeCursor> {
    let parent = this.parent;
    if (parent === undefined || parent < 0) return false;
    let usedTemp = false;
    if (!cursor) {
      usedTemp = true;
      cursor = NodeCursor.Get();
    }
    while (true) {
      cursor.setNode(this.graph, parent);
      yield cursor;
      parent = this.arrays._parents[cursor._index];
      if (parent === undefined || parent < 0) {
        if (usedTemp) cursor.returnCursor();
        return true;
      }
    }
  }

  /** Traverse all the node's components */
  *traverseComponents(cursor?: ComponentCursor): Generator<ComponentCursor> {
    const components = this.components!.components;
    if (!components || !components.length) return false;
    let usedTemp = false;
    if (!cursor) {
      usedTemp = true;
      cursor = ComponentCursor.Get();
    }
    for (let i = 0; i < components.length; i += 2) {
      yield cursor.setInstance(this.index,this.graph, components[i], components[i + 1]);
    }
    if (usedTemp) cursor.returnCursor();
    return true;
  }

  /** Traverse all the node's tags */
  *traverseTags(cursor?: TagCursor): Generator<TagCursor> {
    const tags = this.tags!.tags;
    if (!this.tags) return false;
    let usedTemp = false;
    if (!cursor) {
      usedTemp = true;
      cursor = TagCursor.Get();
    }
    for (let i = 0; i < tags.length; i += 2) {
      yield cursor.setTag(this, tags[i], tags[i + 1]);
    }
    if (usedTemp) cursor.returnCursor();
    return true;
  }

  dispose() {
    if (this.isDisposed) return;
    this.hasObservers &&
      this.observers!.isDisposedSet &&
      this.observers!.disposed.notify(this);

    if (this.arrays._components[this._index]?.length) {
      this.components!.dispose();
    }
    if (this.arrays._tags[this._index]?.length) {
      this.tags!.dispose();
    }

    if (this.childrenArray) {
      const templChildArray: number[] = NCSPools.numberArray.get() || [];
      const children = this.childrenArray;
      const length = children.length;
      templChildArray.length = length;
      for (let i = 0; i < length; i++) {
        templChildArray[i] = children[i];
      }
      const tempCursor = NodeCursor.Get();
      for (let i = 0; i < length; i++) {
        tempCursor.setNode(this.graph, templChildArray[i]);
        tempCursor.dispose();
      }
      tempCursor.returnCursor();
      templChildArray.length = 0;
      NCSPools.numberArray.addItem(templChildArray);
    }
    if (this.parent > -1) {
      const tempCursor = NodeCursor.Get();
      tempCursor.setNode(this.graph, this.parent);
      tempCursor.removeChild(tempCursor.getChildIndex(this.index));
      tempCursor.returnCursor();
    }
    const hadEvents = this.hasEvents;
    const hadContexts = this.hasContexts;
    const hadObservers = this.hasObservers;
    const hadComponents = this.hasComponents;
    const hadTags = this.hasTags;

    this.graph.removeNode(this.index);

    this.clear(hadEvents, hadContexts, hadObservers, hadComponents, hadTags);
  }

  hasChild(node: NodeCursor) {
    if (!this.childrenArray) return false;
    for (let i = 0; i < this.childrenArray.length; i++) {
      if (this.childrenArray[i] == node.index) return true;
    }
    return false;
  }

  parentTo(nodeToParentTo: NodeCursor) {
    if (this.index == nodeToParentTo.index)
      throw new Error(
        `NCS: Tried to parent node ${this.index} ${this.name} to itself`,
      );
    if (nodeToParentTo.hasChild(this)) return;
    const tempCursor = NodeCursor.Get();
    if (this.parent > -1) {
      tempCursor.setNode(this.graph, this.parent);
      tempCursor.removeChild(tempCursor.getChildIndex(this.index));
    }
    nodeToParentTo.addChild(this);
    this.parent = nodeToParentTo.index;
    this.hasObservers &&
      this.observers!.isParentedSet &&
      this.observers!.parented.notify(tempCursor);
    tempCursor.returnCursor();
  }

  getChild(index: number, cursor = NodeCursor.Get()) {
    const childrenArray = this.childrenArray;

    if (!childrenArray || childrenArray[index] === undefined) return null;
    return cursor.setNode(this.graph, childrenArray[index]);
  }

  getChildIndex(node: NodeCursor | number) {
    let index = typeof node == "number" ? node : node.index;
    for (let i = 0; i < this.childrenArray.length; i++) {
      if (this.childrenArray[i] == index) {
        return i;
      }
    }
    return -1;
  }

  addChild(node: NodeCursor) {
    if (this.hasChild(node)) return this.getChildIndex(node);
    if (!this.childrenArray) {
      this.arrays._children[this._index] = NCSPools.numberArray.get() || [];
    }
    node.parent = this.index;

    this.childrenArray.push(node.index);
    if (this.hasObservers) {
      this.observers!.isChildAddedSet &&
        this.observers!.childAdded.notify(node);
      this.observers!.isChildrenUpdatedSet &&
        this.observers!.childrenUpdated.notify(this);
    }
    if (node.hasObservers) {
      node.observers!.isParentedSet && node.observers!.parented.notify(node);
    }
    return this.childrenArray.length - 1;
  }

  removeChild(index: number) {
    if (!this.childrenArray || this.childrenArray[index] === undefined) return;

    const child = this.childrenArray.splice(index, 1)![0];
    this.arrays._parents[child] = -1;
    const tempCursor = NodeCursor.Get();
    tempCursor.setNode(this.graph, child);

    if (this.hasObservers) {
      this.hasObservers &&
        this.observers!.isChildRemovedSet &&
        this.observers!.childRemoved.notify(tempCursor);
      this.hasObservers &&
        this.observers!.isChildrenUpdatedSet &&
        this.observers!.childrenUpdated.notify(this);
    }

    if (tempCursor.hasObservers) {
      tempCursor.observers!.isRemovedFromParentSet &&
        tempCursor.observers!.removedFromParent.notify(tempCursor);
    }

    tempCursor.returnCursor();

    return child;
  }

  uniqueId() {
    let id = this.graph._nodes._indexMap[this.index];
    if (id) return id;
    id = NodeId.Create();
    this.graph._nodes.addNodeId(this.index, id);
    return id;
  }

  returnCursor() {
    return NodeCursor.Return(this);
  }

  cloneCursor(cursor?: NodeCursor) {
    const newCursor = cursor || NodeCursor.Get();
    newCursor.setNode(this.graph, this._index);
    return newCursor;
  }
}
