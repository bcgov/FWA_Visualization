export class WatershedCode {
  readonly parts: number[] = [];

  constructor(public code: string) {
    for (let part of code.split('-')) {
      this.parts.push(parseInt(part));
    }
  }

  append(suffix: string): WatershedCode {
    return new WatershedCode(this.code + '-' + suffix);
  }
  equals(watershedCode: WatershedCode) {
    return this.code === watershedCode.code;
  }

  base(watershedCode: WatershedCode): WatershedCode {
    const minLength = Math.min(this.parts.length, watershedCode.parts.length);
    for (let i = 0; i < minLength; i++) {
      const part1 = this.parts[i];
      const part2 = watershedCode.parts[i];
      if (part1 !== part2) {
        if (i == 0) {
          return null;
        } else {
          return this.subCode(i);
        }
      }
    }
    return this.subCode(minLength);
  }

  suffix(watershedCode: WatershedCode): string {
    if (watershedCode.code.startsWith(this.code + '-')) {
      return watershedCode.code.substring(this.code.length + 1);
    } else {
      return null;
    }
  }

  subCode(length: number): WatershedCode {
    let endIndex;
    if (length > 0) {
      endIndex = 3 + (length - 1) * 7;
    }
    const newCode = this.code.substring(0, endIndex);
    return new WatershedCode(newCode);
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

  parentOf(watershedCode: WatershedCode) {
    const partCountThis = this.parts.length;
    const partCountOther = watershedCode.parts.length;
    if (partCountThis + 1 == partCountOther) {
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

  get length(): number {
    let length = 0;
    for (let i = 1; i < this.parts.length; i++) {
      length += this.parts[i];
    }
    return length;
  }

  toString(): string {
    return this.code;
  }
}