import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import bmp from '../lib/';

const createPath = (p: string) => path.join(process.cwd(), p);
const readFile = (p: string) => fs.readFileSync(createPath(p));

const checksum = (str: Buffer, algorithm = 'md5', encoding = 'hex') =>
  crypto
    .createHash(algorithm)
    .update(str.toString(), 'utf8')
    // @ts-ignore
    .digest(encoding);

describe('decode', () => {
  const decodeTest = (bitPP: number | string, options = {}) => () => {
    const buff = readFile(`./test/images/bit${bitPP}.bmp`);
    const { data } = bmp.decode(buff, options);
    expect(checksum(data)).toMatchSnapshot();
  };

  test('errors for non bmp files', () => {
    const buff = readFile('package.json');
    expect(() => bmp.decode(buff)).toThrow();
  });

  test('1-bit', decodeTest(1));

  describe('4-bit', () => {
    test('normal', decodeTest(4));
    test('RLE', decodeTest('4_RLE'));
  });

  describe('8-bit', () => {
    test('normal', decodeTest(8));
    test('RLE', decodeTest('8_RLE'));
  });

  describe('16-bit', () => {
    test('565', decodeTest('16_565'));
    test('a444', decodeTest('16_a444'));
    test('a555', decodeTest('16_a555'));
    test('x444', decodeTest('16_x444'));
    test('x555', decodeTest('16_x555'));
  });

  test('24-bit', decodeTest(24));

  describe('32-bit', () => {
    test('normal', decodeTest(32));
    test('alpha', decodeTest('32_alpha'));
    test('alpha - toRGBA', decodeTest('32_alpha', { toRGBA: true }));
  });
});

describe('encode', () => {
  const encodeTest = (bitPP: number, file = 32) => () => {
    const buff = readFile(`./test/images/bit${file}.bmp`);
    const bitmap = bmp.decode(buff);

    bitmap.bitPP = bitPP;

    const { data } = bmp.encode(bitmap);
    expect(checksum(data)).toMatchSnapshot();
  };

  const errorTest = (bitPP: number) => () => {
    const buff = readFile('./test/images/bit32.bmp');
    const bitmap = bmp.decode(buff);

    bitmap.bitPP = bitPP;

    expect(() => bmp.encode(bitmap)).toThrow();
  };

  test('1-bit', encodeTest(1));

  describe('4-bit', () => {
    test('errors without color pallette', errorTest(4));
    test('works when colors provided', encodeTest(4, 4));
  });

  describe('8-bit', () => {
    test('errors without color pallette', errorTest(8));
    test('works when colors provided', encodeTest(8, 8));
  });

  test('16-bit', encodeTest(16));
  test('24-bit', encodeTest(24));
  test('32-bit', encodeTest(32));
});

describe('decode -> encode', () => {
  const compareDecodeEncode = (
    bitPP: number,
    file: number | string = bitPP
  ) => () => {
    const before = readFile(`./test/images/bit${file}.bmp`);
    const decoded = bmp.decode(before);

    decoded.bitPP = bitPP;

    const after = bmp.encode(decoded).data;

    expect(checksum(before)).toBe(checksum(after));
  };

  test('1-bit', compareDecodeEncode(1));
  test('4-bit', compareDecodeEncode(4));
  test('8-bit', compareDecodeEncode(8));
  test('16-bit', compareDecodeEncode(16, '16_x555'));
  test('24-bit', compareDecodeEncode(24));
  test('32-bit', compareDecodeEncode(32));
});
