import HeaderTypes from './header-types';
import maskColor from './mask-color';

type IColorProcessor = (x: number, line: number) => void;

export default class BmpDecoder implements IImage {
  // Header
  public flag: string;
  public fileSize!: number;
  public reserved1!: number;
  public reserved2!: number;
  public offset!: number;
  public headerSize!: number;
  public width!: number;
  public height!: number;
  public planes!: number;
  public bitPP!: number;
  public compression?: Compression;
  public rawSize!: number;
  public hr!: number;
  public vr!: number;
  public colors!: number;
  public importantColors!: number;
  public palette!: IColor[];
  public data!: Buffer;

  private maskRed!: number;
  private maskGreen!: number;
  private maskBlue!: number;
  private maskAlpha!: number;

  private readonly toRGBA: boolean;

  private pos: number;
  private bottomUp: boolean;
  private readonly buffer: Buffer;

  private readonly locRed: number;
  private readonly locGreen: number;
  private readonly locBlue: number;
  private readonly locAlpha: number;

  private shiftRed!: (x: number) => number;
  private shiftGreen!: (x: number) => number;
  private shiftBlue!: (x: number) => number;
  private shiftAlpha!: (x: number) => number;

  constructor(buffer: Buffer, { toRGBA }: IDecoderOptions = { toRGBA: false }) {
    this.buffer = buffer;
    this.toRGBA = !!toRGBA;
    this.pos = 0;
    this.bottomUp = true;
    this.flag = this.buffer.toString('utf-8', 0, (this.pos += 2));

    if (this.flag !== 'BM') {
      throw new Error('Invalid BMP File');
    }

    this.locRed = this.toRGBA ? 0 : 3;
    this.locGreen = this.toRGBA ? 1 : 2;
    this.locBlue = this.toRGBA ? 2 : 1;
    this.locAlpha = this.toRGBA ? 3 : 0;

    this.parseHeader();
    this.parseRGBA();
  }

  private parseHeader() {
    this.fileSize = this.readUInt32LE();

    this.reserved1 = this.buffer.readUInt16LE(this.pos);
    this.pos += 2;
    this.reserved2 = this.buffer.readUInt16LE(this.pos);
    this.pos += 2;

    this.offset = this.readUInt32LE();

    // End of BITMAP_FILE_HEADER
    this.headerSize = this.readUInt32LE();

    if (!(this.headerSize in HeaderTypes)) {
      throw new Error(`Unsupported BMP header size ${this.headerSize}`);
    }

    this.width = this.readUInt32LE();
    this.height = this.readUInt32LE();

    this.planes = this.buffer.readUInt16LE(this.pos);
    this.pos += 2;
    this.bitPP = this.buffer.readUInt16LE(this.pos);
    this.pos += 2;

    this.compression = this.readUInt32LE();
    this.rawSize = this.readUInt32LE();
    this.hr = this.readUInt32LE();
    this.vr = this.readUInt32LE();
    this.colors = this.readUInt32LE();
    this.importantColors = this.readUInt32LE();

    // De facto defaults

    if (this.bitPP === 32) {
      this.maskAlpha = 0;
      this.maskRed = 0x00ff0000;
      this.maskGreen = 0x0000ff00;
      this.maskBlue = 0x000000ff;
    } else if (this.bitPP === 16) {
      this.maskAlpha = 0;
      this.maskRed = 0x7c00;
      this.maskGreen = 0x03e0;
      this.maskBlue = 0x001f;
    }

    // End of BITMAP_INFO_HEADER

    if (
      this.headerSize > HeaderTypes.BITMAP_INFO_HEADER ||
      this.compression === Compression.BI_BIT_FIELDS ||
      this.compression === Compression.BI_ALPHA_BIT_FIELDS
    ) {
      this.maskRed = this.readUInt32LE();
      this.maskGreen = this.readUInt32LE();
      this.maskBlue = this.readUInt32LE();
    }

    // End of BITMAP_V2_INFO_HEADER

    if (
      this.headerSize > HeaderTypes.BITMAP_V2_INFO_HEADER ||
      this.compression === Compression.BI_ALPHA_BIT_FIELDS
    ) {
      this.maskAlpha = this.readUInt32LE();
    }

    // End of BITMAP_V3_INFO_HEADER

    if (this.headerSize > HeaderTypes.BITMAP_V3_INFO_HEADER) {
      this.pos +=
        HeaderTypes.BITMAP_V4_HEADER - HeaderTypes.BITMAP_V3_INFO_HEADER;
    }

    // End of BITMAP_V4_HEADER

    if (this.headerSize > HeaderTypes.BITMAP_V4_HEADER) {
      this.pos += HeaderTypes.BITMAP_V5_HEADER - HeaderTypes.BITMAP_V4_HEADER;
    }

    // End of BITMAP_V5_HEADER

    if (this.bitPP <= 8 || this.colors > 0) {
      const len = this.colors === 0 ? 1 << this.bitPP : this.colors;
      this.palette = new Array(len);

      for (let i = 0; i < len; i++) {
        const blue = this.buffer.readUInt8(this.pos++);
        const green = this.buffer.readUInt8(this.pos++);
        const red = this.buffer.readUInt8(this.pos++);
        const quad = this.buffer.readUInt8(this.pos++);

        this.palette[i] = {
          red,
          green,
          blue,
          quad
        };
      }
    }

    // End of color table

    // Can the height ever be negative?
    if (this.height < 0) {
      this.height *= -1;
      this.bottomUp = false;
    }

    const coloShift = maskColor(
      this.maskRed,
      this.maskGreen,
      this.maskBlue,
      this.maskAlpha
    );

    this.shiftRed = coloShift.shiftRed;
    this.shiftGreen = coloShift.shiftGreen;
    this.shiftBlue = coloShift.shiftBlue;
    this.shiftAlpha = coloShift.shiftAlpha;
  }

  private parseRGBA() {
    this.data = Buffer.alloc(this.width * this.height * 4);

    switch (this.bitPP) {
      case 1:
        this.bit1();
        break;
      case 4:
        this.bit4();
        break;
      case 8:
        this.bit8();
        break;
      case 16:
        this.bit16();
        break;
      case 24:
        this.bit24();
        break;
      default:
        this.bit32();
    }
  }

  private bit1() {
    const xLen = Math.ceil(this.width / 8);
    const mode = xLen % 4;
    const padding = mode !== 0 ? 4 - mode : 0;

    let lastLine: number | undefined;

    this.scanImage(padding, xLen, (x, line) => {
      if (line !== lastLine) {
        lastLine = line;
      }

      const b = this.buffer.readUInt8(this.pos++);
      const location = line * this.width * 4 + x * 8 * 4;

      for (let i = 0; i < 8; i++) {
        if (x * 8 + i < this.width) {
          const rgb = this.palette[(b >> (7 - i)) & 0x1];

          this.data[location + i * this.locAlpha] = 0;
          this.data[location + i * 4 + this.locBlue] = rgb.blue;
          this.data[location + i * 4 + this.locGreen] = rgb.green;
          this.data[location + i * 4 + this.locRed] = rgb.red;
        } else {
          break;
        }
      }
    });
  }

  private bit4() {
    if (this.compression === Compression.BI_RLE4) {
      this.data.fill(0);

      let lowNibble = false; //for all count of pixel
      let lines = this.bottomUp ? this.height - 1 : 0;
      let location = 0;

      while (location < this.data.length) {
        const a = this.buffer.readUInt8(this.pos++);
        const b = this.buffer.readUInt8(this.pos++);

        //absolute mode
        if (a === 0) {
          if (b === 0) {
            //line end
            lines += this.bottomUp ? -1 : 1;
            location = lines * this.width * 4;
            lowNibble = false;

            continue;
          }

          if (b === 1) {
            // image end
            break;
          }

          if (b === 2) {
            // offset x, y
            const x = this.buffer.readUInt8(this.pos++);
            const y = this.buffer.readUInt8(this.pos++);

            lines += this.bottomUp ? -y : y;
            location += y * this.width * 4 + x * 4;
          } else {
            let c = this.buffer.readUInt8(this.pos++);

            for (let i = 0; i < b; i++) {
              location = this.setPixelData(
                location,
                lowNibble ? c & 0x0f : (c & 0xf0) >> 4
              );

              if (i & 1 && i + 1 < b) {
                c = this.buffer.readUInt8(this.pos++);
              }

              lowNibble = !lowNibble;
            }

            if ((((b + 1) >> 1) & 1) === 1) {
              this.pos++;
            }
          }
        } else {
          //encoded mode
          for (let i = 0; i < a; i++) {
            location = this.setPixelData(
              location,
              lowNibble ? b & 0x0f : (b & 0xf0) >> 4
            );
            lowNibble = !lowNibble;
          }
        }
      }
    } else {
      const xLen = Math.ceil(this.width / 2);
      const mode = xLen % 4;
      const padding = mode !== 0 ? 4 - mode : 0;

      this.scanImage(padding, xLen, (x, line) => {
        const b = this.buffer.readUInt8(this.pos++);
        const location = line * this.width * 4 + x * 2 * 4;

        const first4 = b >> 4;
        let rgb = this.palette[first4];

        this.data[location] = 0;
        this.data[location + 1] = rgb.blue;
        this.data[location + 2] = rgb.green;
        this.data[location + 3] = rgb.red;

        if (x * 2 + 1 >= this.width) {
          // throw new Error('Something');
          return false;
        }

        const last4 = b & 0x0f;
        rgb = this.palette[last4];

        this.data[location + 4] = 0;
        this.data[location + 4 + 1] = rgb.blue;
        this.data[location + 4 + 2] = rgb.green;
        this.data[location + 4 + 3] = rgb.red;
      });
    }
  }

  private bit8() {
    if (this.compression === Compression.BI_RLE8) {
      this.data.fill(0);

      let lines = this.bottomUp ? this.height - 1 : 0;
      let location = 0;

      while (location < this.data.length) {
        const a = this.buffer.readUInt8(this.pos++);
        const b = this.buffer.readUInt8(this.pos++);

        //absolute mode
        if (a === 0) {
          if (b === 0) {
            //line end
            lines += this.bottomUp ? -1 : 1;
            location = lines * this.width * 4;
            continue;
          }

          if (b === 1) {
            //image end
            break;
          }

          if (b === 2) {
            //offset x,y
            const x = this.buffer.readUInt8(this.pos++);
            const y = this.buffer.readUInt8(this.pos++);

            lines += this.bottomUp ? -y : y;
            location += y * this.width * 4 + x * 4;
          } else {
            for (let i = 0; i < b; i++) {
              const c = this.buffer.readUInt8(this.pos++);
              location = this.setPixelData(location, c);
            }

            // @ts-ignore
            const shouldIncrement = b & (1 === 1);
            if (shouldIncrement) {
              this.pos++;
            }
          }
        } else {
          //encoded mode
          for (let i = 0; i < a; i++) {
            location = this.setPixelData(location, b);
          }
        }
      }
    } else {
      const mode = this.width % 4;
      const padding = mode !== 0 ? 4 - mode : 0;

      this.scanImage(padding, this.width, (x, line) => {
        const b = this.buffer.readUInt8(this.pos++);
        const location = line * this.width * 4 + x * 4;

        if (b < this.palette.length) {
          const rgb = this.palette[b];

          this.data[location] = 0;
          this.data[location + 1] = rgb.blue;
          this.data[location + 2] = rgb.green;
          this.data[location + 3] = rgb.red;
        } else {
          this.data[location] = 0;
          this.data[location + 1] = 0xff;
          this.data[location + 2] = 0xff;
          this.data[location + 3] = 0xff;
        }
      });
    }
  }

  private bit16() {
    const padding = (this.width % 2) * 2;

    this.scanImage(padding, this.width, (x, line) => {
      const loc = line * this.width * 4 + x * 4;
      const px = this.buffer.readUInt16LE(this.pos);
      this.pos += 2;

      this.data[loc + this.locRed] = this.shiftRed(px);
      this.data[loc + this.locGreen] = this.shiftGreen(px);
      this.data[loc + this.locBlue] = this.shiftBlue(px);
      this.data[loc + this.locAlpha] = this.shiftAlpha(px);
    });
  }

  private bit24() {
    const padding = this.width % 4;

    this.scanImage(padding, this.width, (x, line) => {
      const loc = line * this.width * 4 + x * 4;
      const blue = this.buffer.readUInt8(this.pos++);
      const green = this.buffer.readUInt8(this.pos++);
      const red = this.buffer.readUInt8(this.pos++);

      this.data[loc + this.locRed] = red;
      this.data[loc + this.locGreen] = green;
      this.data[loc + this.locBlue] = blue;
      this.data[loc + this.locAlpha] = 0;
    });
  }

  private bit32() {
    this.scanImage(0, this.width, (x, line) => {
      const loc = line * this.width * 4 + x * 4;
      const px = this.readUInt32LE();

      this.data[loc + this.locRed] = this.shiftRed(px);
      this.data[loc + this.locGreen] = this.shiftGreen(px);
      this.data[loc + this.locBlue] = this.shiftBlue(px);
      this.data[loc + this.locAlpha] = this.shiftAlpha(px);
    });
  }

  private scanImage(
    padding = 0,
    width = this.width,
    processPixel: IColorProcessor
  ) {
    for (let y = this.height - 1; y >= 0; y--) {
      const line = this.bottomUp ? y : this.height - 1 - y;

      for (let x = 0; x < width; x++) {
        const result = processPixel.call(this, x, line);

        if (result === false) {
          return;
        }
      }

      this.pos += padding;
    }
  }

  private readUInt32LE() {
    const value = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    return value;
  }

  private setPixelData(location: number, rgbIndex: number) {
    const { blue, green, red } = this.palette[rgbIndex];

    this.data[location + this.locAlpha] = 0;
    this.data[location + 1 + this.locBlue] = blue;
    this.data[location + 2 + this.locGreen] = green;
    this.data[location + 3 + this.locRed] = red;

    return location + 4;
  }
}
