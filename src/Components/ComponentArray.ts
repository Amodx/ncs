import { Observable } from "../Util/Observable";
import { NCSRegister } from "../Register/NCSRegister";
import { SchemaArray } from "../Schema/SchemaArray";
import { ComponentRegisterData } from "./Component.types";
import { NodeCursor } from "../Nodes/NodeCursor";
import { ComponentCursor } from "./ComponentCursor";
import { Graph } from "../Graphs/Graph";
import { ItemPool } from "../Util/ItemPool";
import { GraphClock } from "../Graphs/GraphClock";
type ComponentObserverData = [type: number, index: number];
const componentObserverData: ComponentObserverData = [0, 0];
class ComponentArrayObservers {
  componentAdded = new Observable<ComponentObserverData>();
  componentRemoved = new Observable<ComponentObserverData>();
  nodeAdded = new Observable<number>();
  nodeRemoved = new Observable<number>();
}

export class ComponentArray {
  _freeSlots: number[] = [];
  _node: number[] = [];
  _disposed: boolean[] = [];
  _data: any[] = [];

  schemaArray: SchemaArray;
  dataPool = new ItemPool<any>();

  proto: ComponentRegisterData;
  observers = new ComponentArrayObservers();

  private _componentCursor: ComponentCursor;
  constructor(
    public graph: Graph,
    public numberTypeId: number,
  ) {
    const proto = NCSRegister.components.get(
      NCSRegister.components.idPalette.getStringId(numberTypeId),
    )!;
    if (proto.schema) this.schemaArray = proto.schema.array;
    this.proto = proto;
    this._componentCursor = ComponentCursor.Get();
    this._componentCursor._returnable = false;
  }
  addComponent(
    node: number,
    schema: any | null,
    schemaView: string | null,
  ): number {
    let slot = this._freeSlots.length
      ? this._freeSlots.pop()!
      : this._node.length;
    this._node[slot] = node;
    this._disposed[slot] = false;
    if (this.schemaArray) this.schemaArray.setData(slot, schema, schemaView);
    componentObserverData[0] = this.numberTypeId;
    componentObserverData[1] = slot;
    this.observers.componentAdded.notify(componentObserverData);

    return slot;
  }

  removeComponent(index: number) {
    if (this._disposed[index]) return null;
    componentObserverData[0] = this.numberTypeId;
    componentObserverData[1] = index;
    this.observers.componentRemoved.notify(componentObserverData);
    this.observers.nodeRemoved.notify(this._node[index]);
    this._freeSlots.push(index);
    const nodeIndex = this._node[index];
    this._disposed[index] = true;
    (this._data as any)[index] = undefined;

    this._node[index] = -1;
    if (this.schemaArray) this.schemaArray.removeData(index);
    return nodeIndex;
  }

  update(clock: GraphClock) {
    const update = this.proto.update;
    if (!update) return;
    for (let i = 0; i < this._disposed.length; i++) {
      const node = this._node[i];

      if (
        this._disposed[i] ||
        this.graph._nodes._disposed[node] ||
        this.graph._nodes._beingDisposed[node] ||
        node < 0
      )
        continue;
      this._componentCursor.setInstance(node, this.graph, this.numberTypeId, i);
      update(this._componentCursor, clock);
    }
  }

  init(index: number) {
    const init = this.proto.init;
    if (!init) return false;

    const cursor = !this.proto.performance?.useReusableCursor
      ? ComponentCursor.Get()
      : this._componentCursor;
    cursor.setInstance(this._node[index], this.graph, this.numberTypeId, index);

    init(cursor);

    return true;
  }
}
