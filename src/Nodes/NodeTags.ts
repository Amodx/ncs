import { TagArray } from "../Tags/TagArray";
import { NCSPools } from "../Pools/NCSPools";
import { NCSRegister } from "../Register/NCSRegister";
import { TagCursor } from "../Tags/TagCursor";
import { NodeCursor } from "./NodeCursor";

export class NodeTags {
  node: NodeCursor;
  static Get() {
    const cursor = NCSPools.nodeTags.get();
    if (!cursor) return new NodeTags();
    return cursor;
  }

  static Retrun(cursor: NodeTags) {
    return NCSPools.nodeTags.addItem(cursor);
  }
  get tags() {
    return this.node.arrays._tags[this.node.index];
  }

  private constructor() {}

  dispose() {
    const tempCursor = TagCursor.Get();
    for (let i = 0; i < this.tags.length; i += 2) {
      tempCursor.setTag(this.node, this.tags[i], this.tags[i + 1]);
      tempCursor.dispose();
    }
  }

  add(id: number, cursor?: TagCursor): any {
    let usedTemp = false;
    if (!cursor) {
      usedTemp = true;
      cursor = TagCursor.Get();
    }
    let tagArray = this.node.graph._tags[id]!;
    if (!tagArray) {
      tagArray = new TagArray(NCSRegister.tags.get(id).id);
      this.node.graph._tags[id] = tagArray;
    }
    const newTag = tagArray.addTag(this.node.index);
    if (!this.node.arrays._tags[this.node.index]) {
      this.node.arrays._tags[this.node.index] =
        NCSPools.numberArray.get() || [];
    }
    this.tags.push(id, newTag);
    cursor.setTag(this.node, id, newTag);
    if (this.node.hasObservers) {
      this.node.observers.isTagsAddedSet &&
        this.node.observers.tagsAdded.notify(cursor);
    }
    if (usedTemp) cursor.returnCursor();
    return cursor;
  }

  remove(id: string) {
    const tagId = NCSRegister.tags.idPalette.getNumberId(id);
    const tags = this.tags;
    const tempCursor = TagCursor.Get();
    for (let i = 0; i < tags.length; i++) {
      if (tags[i] == tagId) {
        tempCursor.setTag(this.node, tagId, tags[i]);
        tempCursor.dispose();
        this.tags.splice(i, 2);
        this.node.hasObservers &&
          this.node.observers.isTagsRemovedSet &&
          this.node.observers.tagsRemoved.notify(tempCursor);
        this.node.hasObservers &&
          this.node.observers.isTagsUpdatedSet &&
          this.node.observers.tagsUpdated.notify(0);
        {
          tempCursor.returnCursor();
          return true;
        }
      }
    }
    tempCursor.returnCursor();
    return false;
  }

  get(type: string, cursor = TagCursor.Get()): TagCursor | null {
    const tagId = NCSRegister.tags.idPalette.getNumberId(type);
    const tags = this.tags;
    for (let i = 0; i < tags.length; i += 2) {
      if (tags[i] == tagId) {
        cursor.setTag(this.node, tags[i], tags[i + 1]);
        return cursor;
      }
    }
    return null;
  }

  getChild(type: string, cursor = TagCursor.Get()): TagCursor | null {
    for (const child of this.node.traverseChildren()) {
      const found = child.tags.get(type, cursor);
      if (found) return found;
    }
    return null;
  }
  getAllChildlren(type: string): TagCursor[] {
    const tags: TagCursor[] = [];
    for (const child of this.node.traverseChildren()) {
      const found = child.tags.get(type);
      if (found) {
        tags.push(TagCursor.Get().setTag(this.node, found.typeId, found.index));
      }
    }
    return tags;
  }
  getParent(type: string, cursor = TagCursor.Get()): TagCursor | null {
    for (const parent of this.node.traverseParents()) {
      const found = parent.tags.get(type, cursor);
      if (found) return found;
    }
    return null;
  }
  getAllParents(type: string): TagCursor[] {
    const tags: TagCursor[] = [];
    const temp = TagCursor.Get();
    for (const child of this.node.traverseParents()) {
      const found = child.tags.get(type, temp);
      if (found) {
        tags.push(TagCursor.Get().setTag(this.node, found.typeId, found.index));
      }
    }
    temp.returnCursor();
    return tags;
  }
}
