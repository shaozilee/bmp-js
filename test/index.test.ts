import * as fs from 'fs';
import * as path from 'path';

import { toMatchImageSnapshot } from 'jest-image-snapshot';

import bmp from '../lib/';

expect.extend({ toMatchImageSnapshot });

const createPath = (p: string) => path.join(process.cwd(), p);

describe('BMP', () => {
  describe('decode', () => {
    test('errors for non bmp files', () => {
      const buff = fs.readFileSync(createPath('package.json'));
      expect(() => bmp.decode(buff)).toThrow();
    });

    test('1-bit', () => {
      const buff = fs.readFileSync(createPath('old-tests/bit1.bmp'));
      expect(bmp.decode(buff).data).toMatchSnapshot();
    });

    describe('4-bit', () => {
      test('normal', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit4.bmp'));
        expect(bmp.decode(buff).data).toMatchSnapshot();
      });

      test('RLE', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit4_RLE.bmp'));
        expect(bmp.decode(buff).data).toMatchSnapshot();
      });
    });

    describe('8-bit', () => {
      test('normal', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit8.bmp'));
        expect(bmp.decode(buff).data).toMatchSnapshot();
      });

      test('RLE', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit8_RLE.bmp'));
        expect(bmp.decode(buff).data).toMatchSnapshot();
      });
    });

    describe('16-bit', () => {
      test('555', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit16_x555.bmp'));
        expect(bmp.decode(buff).data).toMatchSnapshot();
      });

      test('444', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit16_x444.bmp'));
        expect(bmp.decode(buff).data).toMatchSnapshot();
      });

      test('555', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit16_x555.bmp'));
        expect(bmp.decode(buff).data).toMatchSnapshot();
      });

      test('444', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit16_a444.bmp'));
        expect(bmp.decode(buff).data).toMatchSnapshot();
      });

      test('555', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit16_a555.bmp'));
        expect(bmp.decode(buff).data).toMatchSnapshot();
      });

      test('565', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit16_565.bmp'));
        expect(bmp.decode(buff).data).toMatchSnapshot();
      });
    });

    test('24-bit', () => {
      const buff = fs.readFileSync(createPath('old-tests/bit24.bmp'));
      expect(bmp.decode(buff).data).toMatchSnapshot();
    });

    describe('32-bit', () => {
      test('normal', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit32.bmp'));
        expect(bmp.decode(buff).data).toMatchSnapshot();
      });

      test('alpha', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit32_alpha.bmp'));
        expect(bmp.decode(buff).data).toMatchSnapshot();
      });

      test('alpha - toRGBA', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit32_alpha.bmp'));
        expect(bmp.decode(buff, { toRGBA: true }).data).toMatchSnapshot();
      });
    });
  });
});
