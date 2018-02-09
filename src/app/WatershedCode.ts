export class WatershedCode {
  parts: number[] = [];

  constructor(public code: string) {
    for (let part of code.split('-')) {
      this.parts.push(parseInt(part));
    }
  }

  equals(watershedCode: WatershedCode) {
    return this.code === watershedCode.code;
  }

  ascestorOf(watershedCode: WatershedCode) {
    const partCountThis = this.parts.length;
    const partCountOther = watershedCode.parts.length;
    if (partCountOther > partCountThis) {
      for (let i = 0; i < partCountThis; i++) {
        const partThis = this.parts[i];
        const partOther = watershedCode.parts[i];
        if (partThis != partOther) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  descendentOf(watershedCode: WatershedCode) {
    const partCountThis = this.parts.length;
    const partCountOther = watershedCode.parts.length;
    if (partCountOther < partCountThis) {
      for (let i = 0; i < partCountOther; i++) {
        const partThis = this.parts[i];
        const partOther = watershedCode.parts[i];
        if (partThis != partOther) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  greaterThan(watershedCode: WatershedCode, localWatershedCode: WatershedCode) {
    if (watershedCode.ascestorOf(localWatershedCode)) {
      if (this.code > localWatershedCode.code) {
        return true;
      }
    }
  }

  equalsMajor(watershedCode: WatershedCode) {
    return this.parts[0] === watershedCode.parts[0];
  }

  toString(): string {
    return this.code;
  }
}