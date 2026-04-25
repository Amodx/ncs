import { CreateComponentData } from "../Components/Component.types";
import { ComponentCursor } from "../Components/ComponentCursor";
import { NodeCursor } from "./NodeCursor";
import { NCSRegister } from "../Register/NCSRegister";
import { ComponentArray } from "../Components/ComponentArray";
import { NCSPools } from "../Pools/NCSPools";
import { NCS } from "../NCS";

export class NodeComponents {
  static Get() {
    const cursor = NCSPools.nodeComponents.get();
    if (!cursor) return new NodeComponents();
    return cursor;
  }

  static Retrun(cursor: NodeComponents) {
    return NCSPools.nodeComponents.addItem(cursor);
  }
  get components() {
    return this.node.arrays._components[this.node.index] || null;
  }
  node: NodeCursor;
  private constructor() {}

  dispose() {
    if (!this.components) return;
    const components = this.components;
    const tempCursor = ComponentCursor.Get();
    for (let i = 0; i < components.length; i += 2) {
      tempCursor.setInstance(
        this.node.index,
        this.node.graph,
        components[i],
        components[i + 1],
      );
      tempCursor.dispose();
    }
    tempCursor.returnCursor();
  }

  add(comp: CreateComponentData) {
    if (!this.components) {
      this.node.arrays._components[this.node.index] =
        NCSPools.numberArray.get() || [];
    }

    const compProto = NCSRegister.components.get(comp[0]);
    const typeId = NCSRegister.components.idPalette.getNumberId(compProto.type);
    let compArray = this.node.graph._components[typeId]!;
    if (!compArray) {
      compArray = new ComponentArray(this.node.graph, typeId);
      if (compArray.proto.update) {
        this.node.graph._updatingComponents.push(compArray);
      }
      this.node.graph._components[typeId] = compArray;
    }

    let compData = null;
    if (comp[3]) {
      compData = compArray.schemaArray.schema
        .getView(comp[2] || "default")!
        .fromRemote(comp[1]);
    } else {
      compData = compProto.schema
        ? compProto.schema.getView(comp[2] || "default")?.createData(comp[1]) ||
          null
        : null;
    }

    const componentIndex = compArray.addComponent(
      this.node.index,
      compData,
      comp[2] || "default",
    );

    comp[0] = "";
    comp[1] = null;
    comp[2] = null;
    comp[3] = null;

    NCSPools.createComponentData.addItem(comp);

    this.components.push(typeId, componentIndex);
    compArray.observers.nodeAdded.notify(this.node.index);
    const temp = ComponentCursor.Get();
    if (this.node.hasObservers) {
      temp.setInstance(
        this.node.index,
        this.node.graph,
        typeId,
        componentIndex,
      );

      this.node.observers.isComponentAddedSet &&
        this.node.observers.componentAdded.notify(temp);
      this.node.observers.isComponentsUpdatedSet &&
        this.node.observers.componentsUpdated.notify(temp);
    }

    temp.returnCursor();
    return componentIndex;
  }

  remove(type: string) {
    const components = this.components;
    if (!components) return;
    let removeIndex = -1;
    let removeComponentIndex = -1;
    const numberId = NCSRegister.components.idPalette.getNumberId(type);
    for (let i = 0; i < components.length; i += 2) {
      if (components[i] == numberId) {
        removeIndex = i;
        removeComponentIndex = components[i + 1];
        break;
      }
    }

    if (removeIndex == -1) return;
    const temp = ComponentCursor.Get();
    temp.setInstance(
      this.node.index,
      this.node.graph,
      numberId,
      removeComponentIndex,
    );
    this.components.splice(removeIndex, 2)!;

    if (this.node.hasObservers) {
      this.node.observers.isComponentRemovedSet &&
        this.node.observers.componentRemoved.notify(temp);
      this.node.observers.isComponentsUpdatedSet &&
        this.node.observers.componentsUpdated.notify(temp);
    }
    temp.dispose();
    temp.returnCursor();
    return true;
  }
  has(type: string): boolean {
    const components = this.components;
    if (!components) return false;
    const numberId = NCSRegister.components.idPalette.getNumberId(type);
    for (let i = 0; i < components.length; i += 2) {
      if (components[i] == numberId) {
        return true;
      }
    }
    return false;
  }
  get(
    type: string,
    cursor: ComponentCursor | null = null,
  ): ComponentCursor<any, any, any> | null {
    const components = this.components;
    if (!components) return null;
    let usedTemp = false;
    if (!cursor) {
      cursor = ComponentCursor.Get();
      usedTemp = true;
    }
    const numberId = NCSRegister.components.idPalette.getNumberId(type);
    for (let i = 0; i < components.length; i += 2) {
      if (components[i] == numberId) {
        cursor.setInstance(
          this.node.index,
          this.node.graph,
          numberId,
          components[i + 1],
        );
        return cursor;
      }
    }
    if (usedTemp) cursor.returnCursor();
    return null;
  }
  getAll(type: string): ComponentCursor<any, any, any>[] {
    const components = this.components;
    if (!components) return [];
    const cursors: ComponentCursor<any, any, any>[] = [];
    const numberId = NCSRegister.components.idPalette.getNumberId(type);
    for (let i = 0; i < components.length; i += 2) {
      if (components[i] == numberId) {
        const cursor = ComponentCursor.Get();
        cursor.setInstance(
          this.node.index,
          this.node.graph,
          components[i],
          components[i + 1],
        );
        cursors.push(cursor);
      }
    }
    return cursors;
  }
  removeAll(type: string) {
    const components = this.components;
    if (!components) return false;
    const numberId = NCSRegister.components.idPalette.getNumberId(type);
    const tempCursor = ComponentCursor.Get();
    for (let i = components.length; i > 0; i -= 2) {
      if (components[i] == numberId) {
        tempCursor.setInstance(
          this.node.index,
          this.node.graph,
          components[i],
          components[i + 1],
        );
        this.components.splice(i, 2)!;
        if (this.node.hasObservers) {
          this.node.observers.isComponentRemovedSet &&
            this.node.observers.componentRemoved.notify(tempCursor);
          this.node.observers.isComponentsUpdatedSet &&
            this.node.observers.componentsUpdated.notify(tempCursor);
        }
      }
    }
    tempCursor.returnCursor();
    return true;
  }

  getChild(
    type: string,
    cursor: ComponentCursor | null = null,
  ): ComponentCursor<any, any, any> | null {
    let usedTemp = false;
    if (!cursor) {
      cursor = ComponentCursor.Get();
      usedTemp = true;
    }
    const tempCursor = NodeCursor.Get();
    for (const child of this.node.traverseChildren(tempCursor)) {
      if (!child.components) continue;
      const found = child.components.get(type, cursor);
      if (found) {
        tempCursor.returnCursor();
        return found;
      }
    }
    if (usedTemp) {
      cursor.returnCursor();
    }
    tempCursor.returnCursor();
    return null;
  }

  getParent(
    type: string,
    cursor: ComponentCursor | null = null,
  ): ComponentCursor<any, any, any> | null {
    let usedTemp = false;
    if (!cursor) {
      cursor = ComponentCursor.Get();
      usedTemp = true;
    }
    const tempCursor = NodeCursor.Get();
    for (const parent of this.node.traverseParents(tempCursor)) {
      if (!parent.components) continue;
      const found = parent.components.get(type, cursor);
      if (found) {
        tempCursor.returnCursor();
        return found;
      }
    }
    if (usedTemp) {
      cursor.returnCursor();
    }
    tempCursor.returnCursor();
    return null;
  }
}
