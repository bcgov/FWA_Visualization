import {WatershedCode} from './WatershedCode';
import {WatershedCodeRange} from './WatershedCodeRange';

describe('WatershedCodeRangeSpec', () => {
  const code100 = new WatershedCode('100');
  const code100_000000 = new WatershedCode('100-000000');
  const code100_076435 = new WatershedCode('100-076435');
  const code100_077501 = new WatershedCode('100-077501');
  it('test1', () => {
    const a = new WatershedCodeRange(code100, code100_000000, code100_000000);
    expect(a.getLocation(a)).toBe(0);
  });

  it('test2', () => {
    const a = new WatershedCodeRange(code100, code100_000000, code100_076435);
    const b = new WatershedCodeRange(code100_077501, code100_077501.append('000000'), code100_076435.append('951307'));
    expect(b.getLocation(a)).toBe(-1);
    expect(a.getLocation(b)).toBe(1);
  });

});