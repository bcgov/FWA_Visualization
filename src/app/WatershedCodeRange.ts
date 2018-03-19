import {WatershedCode} from "./WatershedCode";
export class WatershedCodeRange {
  public readonly localMin: WatershedCode;
  public readonly localMax: WatershedCode;

  static newRange(base: string, min: string, max?: string) {
    const code = new WatershedCode(base);
    const minCode = code.append(min);
    let maxCode;
    if (max) {
      maxCode = code.append(max);
    } else {
      maxCode = minCode;
    }
    return new WatershedCodeRange(code, minCode, maxCode);
  }

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
    const watershedCode1 = this.code;
    const watershedCodeLocalMin1 = this.localMin;
    const watershedCodeLocalMax1 = this.localMax;
    const watershedCode2 = range.code;
    const watershedCodeLocalMin2 = range.localMin;
    let watershedCodeLocalMax2 = range.localMax;

    if (watershedCode1.equalsMajor(watershedCode2)) {
      if (watershedCode1.equals(watershedCode2)) {
        if (watershedCodeLocalMax2.code < watershedCodeLocalMin1.code) {
          if (!watershedCode2.equals(watershedCodeLocalMax2)) {
            return -1;
          }
        } else if (watershedCodeLocalMin2.code > watershedCodeLocalMax1.code) {
          return 1;
        } else {
          return 0;
        }
      } else if (watershedCode1.parentOf(watershedCode2)) {
        if (watershedCodeLocalMin1.equals(watershedCodeLocalMax1)) {
          if (watershedCodeLocalMin1.code < watershedCode2.code) {
            return 1;
          }
        } else if (watershedCodeLocalMin1.code < watershedCode2.code) {
          return 1;
        }
      } else if (watershedCode1.ascestorOf(watershedCode2)) {
        if (!watershedCodeLocalMin1.ascestorOf(watershedCode2)) {
          if (watershedCodeLocalMin1.equals(watershedCodeLocalMax1)) {
            if (watershedCodeLocalMin1.code < watershedCode2.code) {
              return 1;
            }
          } else {
            if (watershedCodeLocalMin1.code < watershedCode2.code) {
              return 1;
            }
          }
        }
      } else if (watershedCode1.descendentOf(watershedCode2)) {
        // TODO case where sub stream comes in lower down than main stream
        if (watershedCode1.greaterThan(watershedCode2, watershedCodeLocalMax2)) {
          return -1;
        }
      }
    }
    return null;
  }
}