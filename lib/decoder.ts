/**
 * @author shaozilee
 *
 * Bmp format decoder,support 1bit 4bit 8bit 24bit bmp
 *
 */

interface IPixel {
  red: number;
  green: number;
  blue: number;
  quad: number;
}

type IPixelProcessor = (x: number, line: number) => void;

class BmpDecoder {
  // Header
  public fileSize!: number;
  public reserved!: number;
  public offset!: number;
  public headerSize!: number;
  public width!: number;
  public height!: number;
  public planes!: number;
  public bitPP!: number;
  public compress!: number;
  public rawSize!: number;
  public hr!: number;
  public vr!: number;
  public colors!: number;
  public importantColors!: number;
  public palette!: IPixel[];

  public maskRed!: number;
  public maskGreen!: number;
  public maskBlue!: number;
  public mask0!: number;

  public isWithAlpha: boolean;

  private data!: Buffer;
  private pos: number;
  private buffer: Buffer;
  private bottomUp: boolean;
  private flag: string;

  constructor(buffer: Buffer, isWithAlpha = false) {
    this.pos = 0;
    this.buffer = buffer;
    this.isWithAlpha = !!isWithAlpha;
    this.bottomUp = true;
    this.flag = this.buffer.toString('utf-8', 0, (this.pos += 2));

    if (this.flag != 'BM') {
      throw new Error('Invalid BMP File');
    }

    this.parseHeader();
    this.parseRGBA();
  }

  public parseHeader() {
    this.fileSize = this.readUInt32LE();
    this.reserved = this.readUInt32LE();
    this.offset = this.readUInt32LE();
    this.headerSize = this.readUInt32LE();
    this.width = this.readUInt32LE();
    this.height = this.buffer.readInt32LE(this.pos);
    this.pos += 4;
    this.planes = this.buffer.readUInt16LE(this.pos);
    this.pos += 2;
    this.bitPP = this.buffer.readUInt16LE(this.pos);
    this.pos += 2;
    this.compress = this.readUInt32LE();
    this.rawSize = this.readUInt32LE();
    this.hr = this.readUInt32LE();
    this.vr = this.readUInt32LE();
    this.colors = this.readUInt32LE();
    this.importantColors = this.readUInt32LE();

    if (this.bitPP === 16 && this.isWithAlpha) {
      this.bitPP = 15;
    }

    if (this.bitPP < 15) {
      const len = this.colors === 0 ? 1 << this.bitPP : this.colors;
      this.palette = new Array(len);

      for (let i = 0; i < len; i++) {
        const blue = this.buffer.readUInt8(this.pos++);
        const green = this.buffer.readUInt8(this.pos++);
        const red = this.buffer.readUInt8(this.pos++);
        const quad = this.buffer.readUInt8(this.pos++);

        this.palette[i] = {
          red: red,
          green: green,
          blue: blue,
          quad: quad
        };
      }
    }

    if (this.height < 0) {
      this.height *= -1;
      this.bottomUp = false;
    }
  }

  public parseRGBA() {
    this.data = new Buffer(this.width * this.height * 4);

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
      case 15:
        this.bit15();
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

  public bit1() {
    const xLen = Math.ceil(this.width / 8);
    const mode = xLen % 4;

    // is this line even used?
    const padding = mode != 0 ? 4 - mode : 0;

    this.scanImage(padding, (x, line) => {
      const b = this.buffer.readUInt8(this.pos++);
      const location = line * this.width * 4 + x * 8 * 4;

      for (let i = 0; i < 8; i++) {
        if (x * 8 + i < this.width) {
          const rgb = this.palette[(b >> (7 - i)) & 0x1];

          this.data[location + i * 4] = 0;
          this.data[location + i * 4 + 1] = rgb.blue;
          this.data[location + i * 4 + 2] = rgb.green;
          this.data[location + i * 4 + 3] = rgb.red;
        } else {
          // Throw error?
          break;
        }
      }
    });
  }

  public bit4() {
    //RLE-4
    if (this.compress == 2) {
      this.data.fill(0xff);

      let low_nibble = false; //for all count of pixel
      let lines = this.bottomUp ? this.height - 1 : 0;
      let location = 0;

      while (location < this.data.length) {
        const a = this.buffer.readUInt8(this.pos++);
        const b = this.buffer.readUInt8(this.pos++);

        //absolute mode
        if (a == 0) {
          if (b == 0) {
            //line end
            lines += this.bottomUp ? -1 : 1;
            location = lines * this.width * 4;
            low_nibble = false;

            continue;
          } else if (b == 1) {
            // image end
            break;
          } else if (b == 2) {
            // offset x,y
            const x = this.buffer.readUInt8(this.pos++);
            const y = this.buffer.readUInt8(this.pos++);

            lines += this.bottomUp ? -y : y;
            location += y * this.width * 4 + x * 4;
          } else {
            let c = this.buffer.readUInt8(this.pos++);

            for (let i = 0; i < b; i++) {
              location = this.setPixelData(
                location,
                low_nibble ? c & 0x0f : (c & 0xf0) >> 4
              );

              if (i & 1 && i + 1 < b) {
                c = this.buffer.readUInt8(this.pos++);
              }

              low_nibble = !low_nibble;
            }

            if ((((b + 1) >> 1) & 1) == 1) {
              this.pos++;
            }
          }
        } else {
          //encoded mode
          for (let i = 0; i < a; i++) {
            location = this.setPixelData(
              location,
              low_nibble ? b & 0x0f : (b & 0xf0) >> 4
            );
            low_nibble = !low_nibble;
          }
        }
      }
    } else {
      const xlen = Math.ceil(this.width / 2);
      const mode = xlen % 4;
      const padding = mode != 0 ? 4 - mode : 0;

      this.scanImage(padding, (x, line) => {
        const b = this.buffer.readUInt8(this.pos++);
        const location = line * this.width * 4 + x * 2 * 4;

        const before = b >> 4;
        const after = b & 0x0f;

        let rgb = this.palette[before];

        this.data[location] = 0;
        this.data[location + 1] = rgb.blue;
        this.data[location + 2] = rgb.green;
        this.data[location + 3] = rgb.red;

        if (x * 2 + 1 >= this.width) {
          throw new Error('Something');
        }

        rgb = this.palette[after];

        this.data[location + 4] = 0;
        this.data[location + 4 + 1] = rgb.blue;
        this.data[location + 4 + 2] = rgb.green;
        this.data[location + 4 + 3] = rgb.red;
      });
    }
  }

  public bit8() {
    //RLE-8
    if (this.compress == 1) {
      this.data.fill(0xff);

      let lines = this.bottomUp ? this.height - 1 : 0;
      let location = 0;

      while (location < this.data.length) {
        const a = this.buffer.readUInt8(this.pos++);
        const b = this.buffer.readUInt8(this.pos++);

        //absolute mode
        if (a == 0) {
          if (b == 0) {
            //line end
            lines += this.bottomUp ? -1 : 1;
            location = lines * this.width * 4;
            continue;
          } else if (b == 1) {
            //image end
            break;
          } else if (b == 2) {
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
            const shouldIncrement = b & (1 == 1);
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
      const padding = mode != 0 ? 4 - mode : 0;

      this.scanImage(padding, (x, line) => {
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

  public bit15() {
    const padding = this.width % 3;
    const _11111 = parseInt('11111', 2);
    const _1_5 = _11111;

    this.scanImage(padding, (x, line) => {
      const B = this.buffer.readUInt16LE(this.pos);
      this.pos += 2;

      const blue = (((B & _1_5) / _1_5) * 255) | 0;
      const green = ((((B >> 5) & _1_5) / _1_5) * 255) | 0;
      const red = ((((B >> 10) & _1_5) / _1_5) * 255) | 0;
      const alpha = B >> 15 ? 0xff : 0x00;

      const location = line * this.width * 4 + x * 4;

      this.data[location] = alpha;
      this.data[location + 1] = blue;
      this.data[location + 2] = green;
      this.data[location + 3] = red;
    });
  }

  public bit16() {
    const padding = (this.width % 2) * 2;
    //default xrgb555
    this.maskRed = 0x7c00;
    this.maskGreen = 0x3e0;
    this.maskBlue = 0x1f;
    this.mask0 = 0;

    if (this.compress == 3) {
      this.maskRed = this.readUInt32LE();
      this.maskGreen = this.readUInt32LE();
      this.maskBlue = this.readUInt32LE();
      this.mask0 = this.readUInt32LE();
    }

    const ns = [0, 0, 0];

    for (let i = 0; i < 16; i++) {
      if ((this.maskRed >> i) & 0x01) ns[0]++;
      if ((this.maskGreen >> i) & 0x01) ns[1]++;
      if ((this.maskBlue >> i) & 0x01) ns[2]++;
    }

    ns[1] += ns[0];
    ns[2] += ns[1];
    ns[0] = 8 - ns[0];
    ns[1] -= 8;
    ns[2] -= 8;

    this.scanImage(padding, (x, line) => {
      const B = this.buffer.readUInt16LE(this.pos);
      this.pos += 2;

      const blue = (B & this.maskBlue) << ns[0];
      const green = (B & this.maskGreen) >> ns[1];
      const red = (B & this.maskRed) >> ns[2];

      const location = line * this.width * 4 + x * 4;

      this.data[location] = 0;
      this.data[location + 1] = blue;
      this.data[location + 2] = green;
      this.data[location + 3] = red;
    });
  }

  public bit24() {
    const padding = this.width % 4;

    this.scanImage(padding, (x, line) => {
      const blue = this.buffer.readUInt8(this.pos++);
      const green = this.buffer.readUInt8(this.pos++);
      const red = this.buffer.readUInt8(this.pos++);

      const location = line * this.width * 4 + x * 4;

      this.data[location] = 0;
      this.data[location + 1] = blue;
      this.data[location + 2] = green;
      this.data[location + 3] = red;
    });
  }

  public bit32() {
    // BI_BITFIELDS
    if (this.compress == 3) {
      this.maskRed = this.readUInt32LE();
      this.maskGreen = this.readUInt32LE();
      this.maskBlue = this.readUInt32LE();
      this.mask0 = this.readUInt32LE();

      this.scanImage(0, (x: number, line: number) => {
        const alpha = this.buffer.readUInt8(this.pos++);
        const blue = this.buffer.readUInt8(this.pos++);
        const green = this.buffer.readUInt8(this.pos++);
        const red = this.buffer.readUInt8(this.pos++);

        const location = line * this.width * 4 + x * 4;

        this.data[location] = alpha;
        this.data[location + 1] = blue;
        this.data[location + 2] = green;
        this.data[location + 3] = red;
      });
    } else {
      this.scanImage(0, (x, line) => {
        const blue = this.buffer.readUInt8(this.pos++);
        const green = this.buffer.readUInt8(this.pos++);
        const red = this.buffer.readUInt8(this.pos++);
        const alpha = this.buffer.readUInt8(this.pos++);

        const location = line * this.width * 4 + x * 4;

        this.data[location] = alpha;
        this.data[location + 1] = blue;
        this.data[location + 2] = green;
        this.data[location + 3] = red;
      });
    }
  }

  public getData() {
    return this.data;
  }

  private scanImage(padding = 0, processPixel: IPixelProcessor) {
    for (let y = this.height - 1; y >= 0; y--) {
      const line = this.bottomUp ? y : this.height - 1 - y;

      for (let x = 0; x < this.width; x++) {
        processPixel.call(this, x, line);
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
    const rgb = this.palette[rgbIndex];
    this.data[location] = 0;
    this.data[location + 1] = rgb.blue;
    this.data[location + 2] = rgb.green;
    this.data[location + 3] = rgb.red;
    location += 4;

    return location;
  }
}

export default function(bmpData: Buffer) {
  const decoder = new BmpDecoder(bmpData);
  return decoder;
}
