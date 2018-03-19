import {WatershedCode} from "./WatershedCode";
export class WatershedCodeRange {
  public readonly localMin: WatershedCode;
  public readonly localMax: WatershedCode;
  constructor(
    public readonly code: WatershedCode,
    localMin: WatershedCode,
    localMax: WatershedCode
  ) {
    if (localMin === localMax) {
      this.localMin = localMin;
      this.localMax = localMin;
    } else {
      this.localMin = localMin;
      this.localMax = localMax;
    }
  }

  toStringLocal(): string {
    const min = this.localMin;
    const max = this.localMax;
    if (min.equals(max)) {
      return min.code.replace(/-000000$/, '');
    } else {
      const base = min.base(max);
      if (base == null) {
        return min + '\n' + max;
      } else {
        const minSuffix = base.suffix(min);
        const maxSuffix = base.suffix(max);
        return `${base}-(${minSuffix}:${maxSuffix})`;
      }
    }
  }

  /*
    * 0 On stream
    * -1 Downstream
    * 1 Upstream 
    */
  getLocation(range: WatershedCodeRange): number {
    const watershedCode = this.code;
    const watershedCodeLocalMin = this.localMin;
    const watershedCodeLocalMax = this.localMax;
    const riverWatershedCode = range.code;
    const riverWatershedCodeLocalMin = range.localMin;
    let riverWatershedCodeLocalMax = range.localMax;

    if (watershedCode.equalsMajor(riverWatershedCode)) {
      if (watershedCode.equals(riverWatershedCode)) {
        if (riverWatershedCodeLocalMax.code < watershedCodeLocalMin.code) {
          if (!riverWatershedCode.equals(riverWatershedCodeLocalMax)) {
            return -1;
          }
        } else if (riverWatershedCodeLocalMin.code > watershedCodeLocalMax.code) {
          return 1;
        } else {
          return 0;
        }
      } else if (watershedCode.parentOf(riverWatershedCode)) {
        if (watershedCodeLocalMin.equals(watershedCodeLocalMax)) {
          if (watershedCodeLocalMin.code < riverWatershedCode.code) {
            return 1;
          }
        } else if (watershedCodeLocalMin.code < riverWatershedCode.code) {
          return 1;
        }
      } else if (watershedCode.ascestorOf(riverWatershedCode)) {
        if (watershedCodeLocalMax < riverWatershedCodeLocalMin) {
          return 1;
        }
      } else if (watershedCode.descendentOf(riverWatershedCode)) {
        // TODO case where sub stream comes in lower down than main stream
        if (watershedCode.greaterThan(riverWatershedCode, riverWatershedCodeLocalMax)) {
          return -1;
        }
      }
    }
    return null;
  }
}