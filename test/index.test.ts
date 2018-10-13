import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import bmp from '../lib/';

const createPath = (p: string) => path.join(process.cwd(), p);

function checksum(str: string, algorithm = 'md5', encoding = 'hex') {
  return (
    crypto
      .createHash(algorithm)
      .update(str, 'utf8')
      // @ts-ignore
      .digest(encoding)
  );
}

describe('BMP', () => {
  describe('decode', () => {
    test('errors for non bmp files', () => {
      const buff = fs.readFileSync(createPath('package.json'));
      expect(() => bmp.decode(buff)).toThrow();
    });

    test('1-bit', () => {
      const buff = fs.readFileSync(createPath('old-tests/bit1.bmp'));
      const res = checksum(bmp.decode(buff).data.toString());
      expect(res).toMatchSnapshot();
    });

    describe('4-bit', () => {
      test('normal', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit4.bmp'));
        const res = checksum(bmp.decode(buff).data.toString());
        expect(res).toMatchSnapshot();
      });

      test('RLE', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit4_RLE.bmp'));
        const res = checksum(bmp.decode(buff).data.toString());
        expect(res).toMatchSnapshot();
      });
    });

    describe('8-bit', () => {
      test('normal', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit8.bmp'));
        const res = checksum(bmp.decode(buff).data.toString());
        expect(res).toMatchSnapshot();
      });

      test('RLE', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit8_RLE.bmp'));
        const res = checksum(bmp.decode(buff).data.toString());
        expect(res).toMatchSnapshot();
      });
    });

    describe('16-bit', () => {
      test('555', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit16_x555.bmp'));
        const res = checksum(bmp.decode(buff).data.toString());
        expect(res).toMatchSnapshot();
      });

      test('444', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit16_x444.bmp'));
        const res = checksum(bmp.decode(buff).data.toString());
        expect(res).toMatchSnapshot();
      });

      test('555', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit16_x555.bmp'));
        const res = checksum(bmp.decode(buff).data.toString());
        expect(res).toMatchSnapshot();
      });

      test('444', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit16_a444.bmp'));
        const res = checksum(bmp.decode(buff).data.toString());
        expect(res).toMatchSnapshot();
      });

      test('555', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit16_a555.bmp'));
        const res = checksum(bmp.decode(buff).data.toString());
        expect(res).toMatchSnapshot();
      });

      test('565', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit16_565.bmp'));
        const res = checksum(bmp.decode(buff).data.toString());
        expect(res).toMatchSnapshot();
      });
    });

    test('24-bit', () => {
      const buff = fs.readFileSync(createPath('old-tests/bit24.bmp'));
      const res = checksum(bmp.decode(buff).data.toString());
      expect(res).toMatchSnapshot();
    });

    describe('32-bit', () => {
      test('normal', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit32.bmp'));
        const res = checksum(bmp.decode(buff).data.toString());
        expect(res).toMatchSnapshot();
      });

      test('alpha', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit32_alpha.bmp'));
        const res = checksum(bmp.decode(buff).data.toString());
        expect(res).toMatchSnapshot();
      });

      test('alpha - toRGBA', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit32_alpha.bmp'));
        const res = checksum(
          bmp.decode(buff, { toRGBA: true }).data.toString()
        );
        expect(res).toMatchSnapshot();
      });
    });
  });

  describe('encode', () => {
    test('1-bit', () => {
      const buff = fs.readFileSync(createPath('old-tests/bit32.bmp'));
      const bitmap = bmp.decode(buff);

      bitmap.bitPP = 1;

      const res = checksum(bmp.encode(bitmap).data.toString());
      expect(res).toMatchSnapshot();
    });

    describe('4-bit', () => {
      test('errors without color pallette', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit32.bmp'));
        const bitmap = bmp.decode(buff);

        bitmap.bitPP = 4;

        expect(() => bmp.encode(bitmap)).toThrow();
      });

      test('works when colors provided', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit4.bmp'));
        const bitmap = bmp.decode(buff);

        bitmap.bitPP = 4;

        const res = checksum(bmp.encode(bitmap).data.toString());
        expect(res).toMatchSnapshot();
      });
    });

    describe('8-bit', () => {
      test('errors without color pallette', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit32.bmp'));
        const bitmap = bmp.decode(buff);

        bitmap.bitPP = 8;

        expect(() => bmp.encode(bitmap)).toThrow();
      });

      test('works when colors provided', () => {
        const buff = fs.readFileSync(createPath('old-tests/bit8.bmp'));
        const bitmap = bmp.decode(buff);

        bitmap.bitPP = 8;

        const res = checksum(bmp.encode(bitmap).data.toString());
        expect(res).toMatchSnapshot();
      });
    });

    test('16-bit', () => {
      const buff = fs.readFileSync(createPath('old-tests/bit32.bmp'));
      const bitmap = bmp.decode(buff);

      bitmap.bitPP = 16;

      const res = checksum(bmp.encode(bitmap).data.toString());
      expect(res).toMatchSnapshot();
    });

    test('24-bit', () => {
      const buff = fs.readFileSync(createPath('old-tests/bit32.bmp'));
      const bitmap = bmp.decode(buff);

      bitmap.bitPP = 24;

      const res = checksum(bmp.encode(bitmap).data.toString());
      expect(res).toMatchSnapshot();
    });

    test('32-bit', () => {
      const buff = fs.readFileSync(createPath('old-tests/bit32.bmp'));
      const bitmap = bmp.decode(buff);

      bitmap.bitPP = 32;

      const res = checksum(bmp.encode(bitmap).data.toString());
      expect(res).toMatchSnapshot();
    });
  });
});
