const buffer = new ArrayBuffer(16);
const randomArray = new Uint8Array(buffer);
const view = new DataView(buffer);
const mask64 = 0xffff_ffff_ffff_ffffn;
export class NodeId {
  static Create(): bigint {
    crypto.getRandomValues(randomArray);
    const high = BigInt(view.getUint32(0)) << 96n;
    const midHigh = BigInt(view.getUint32(4)) << 64n;
    const midLow = BigInt(view.getUint32(8)) << 32n;
    const low = BigInt(view.getUint32(12));
    const bigIntId = high | midHigh | midLow | low;
    return bigIntId;
  }

  static GetHighPart(id: bigint): bigint {
    return (id >> 64n) & mask64;
  }

  static GetLowPart(id: bigint): bigint {
    return id & mask64;
  }

  static GetCombined(lower: bigint, upper: bigint): bigint {
    return ((upper & mask64) << 64n) | (lower & mask64);
  }
  
  static CreateString(): string {
    return this.ToHexString(this.Create());
  }

  static FromString(id: string): bigint {
    const bigIntId = BigInt("0x" + id);
    return bigIntId;
  }

  static ToHexString(id: BigInt): string {
    return id.toString(16).padStart(32, "0");
  }
}
