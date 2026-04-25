import { ComponentRegisterData } from "./Component.types";
import { SchemaCursor } from "../Schema/Schema.types";
import { NCSRegister } from "../Register/NCSRegister";
import { NodeCursor } from "../Nodes/NodeCursor";
import { ComponentArray } from "./ComponentArray";
import { NCSPools } from "../Pools/NCSPools";
import { Graph } from "../Graphs/Graph";
import { ItemPool } from "../Util/ItemPool";
import { GraphClock } from "../Graphs/GraphClock";
export class ComponentCursor<
  ComponentSchema extends object = {},
  Data extends any = any,
  Shared extends any = any,
> {
  static Get() {
    const cursor = NCSPools.componentCursor.get();
    if (!cursor) return new ComponentCursor();
    return cursor;
  }
  static Return(cursor: ComponentCursor) {
    if (cursor.schema) {
      cursor.schema.__view.returnCursor(cursor.schema);
      (cursor as any).schema = null;
    }
    cursor._index = -1;
    return NCSPools.componentCursor.addItem(cursor);
  }
  /**The index of the parent node in the node array */
  get nodeIndex() {
    return this.node.index;
  }
  /**The index in the component array */
  get index() {
    return this._index;
  }
  get type() {
    return NCSRegister.components.idPalette.getStringId(this._type);
  }
  get shared(): Shared {
    return this.__proto.shared!;
  }
  schema: SchemaCursor<ComponentSchema>;

  get data(): Data {
    return this.arrays._data[this._index];
  }
  set data(data: Data) {
    this.arrays._data[this._index] = data;
  }

  get dataPool() {
    return this.arrays.dataPool as ItemPool<Data>;
  }

  public node = NodeCursor.Get();
  public arrays: ComponentArray;
  public __proto: ComponentRegisterData<ComponentSchema, Data, Shared>;

  get typeId() {
    return this._type;
  }
  private _index = 0;
  private _type = 0;

  private constructor() {}
  _returnable = true;
  setInstance(nodeIndex: number, graph: Graph, type: number, index: number) {
    this._index = index;
    this._type = type;
    this.node.setNode(graph, nodeIndex);
    this.__proto = NCSRegister.components.items[this._type];

    this.arrays = graph._components[type];

    if (this.arrays?.schemaArray?._data[index] !== undefined) {
      this.schema = this.arrays.schemaArray.createViewCursor(index);
      this.schema.setInstance(index);
    } else {
      (this as any).schema = null;
    }
    return this;
  }

  get isDisposed() {
    if (this._index == -1 || this.nodeIndex == -1) return true;
    return this.arrays._disposed[this._index];
  }
  dispose() {
    if (this.__proto.dispose) this.__proto.dispose(this);
    this.arrays.removeComponent(this._index);
    this._index = -1;
    this.node.clear(true,true,true,true,true);
  }

  returnCursor() {
    if (!this._returnable)
      throw new Error(
        `Tried to return component cursor that cannot be returned`,
      );
    return ComponentCursor.Return(this);
  }
  cloneCursor(
    cursor?: ComponentCursor,
    nodeCursor?: NodeCursor,
  ): ComponentCursor<ComponentSchema, Data, Shared> {
    const newCursor = cursor || ComponentCursor.Get();
    const newNodeCursor = nodeCursor || NodeCursor.Get();
    newNodeCursor.setNode(this.node.graph, this.node.index);

    newCursor.setInstance(
      newNodeCursor.index,
      newNodeCursor.graph,
      this.typeId,
      this._index,
    );
    return newCursor as any;
  }

  update(graphClock: GraphClock) {
    this.__proto.update && this.__proto.update(this, graphClock);
  }
}
