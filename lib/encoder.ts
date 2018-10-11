// TODO: support 1, 4, 8, 16, and 32 bit encoding

export interface IImage {
  bitPP: number;
  height: number;
  width: number;
  data: Buffer;
}

type IPixelProcessor = (p: number, i: number) => number;

class BmpEncoder {
  private readonly fileSize: number;
  private readonly reserved: number;
  private readonly offset: number;
  private readonly width: number;
  private readonly flag: string;
  private readonly height: number;
  private readonly planes: number;
  private readonly bitPP: number;
  private readonly compress: number;
  private readonly hr: number;
  private readonly vr: number;
  private readonly colors: number;
  private readonly importantColors: number;

  private readonly headerInfoSize: number;
  private readonly extraBytes: number;
  private readonly rgbSize: number;
  private readonly data: Buffer;
  private readonly buffer: Buffer;
  private rowModifier: number;
  private pos: number;

  constructor(imgData: IImage) {
    this.buffer = imgData.data;
    this.width = imgData.width;
    this.height = imgData.height;
    this.headerInfoSize = 40;

    this.extraBytes = this.width % 4;

    // Header

    switch (imgData.bitPP) {
      case 32:
        this.rowModifier = 4;
        this.offset = 54;
        this.bitPP = 32;
        break;
      case 16:
        this.rowModifier = 2;
        this.offset = 54;
        this.bitPP = 16;
        break;
      default:
        this.rowModifier = 3;
        this.offset = 54;
        this.bitPP = 24;
    }

    this.rgbSize =
      this.height * (this.width * this.rowModifier + this.extraBytes);

    this.flag = 'BM';
    this.reserved = 0;
    this.fileSize = this.rgbSize + this.offset;
    this.planes = 1;
    this.compress = 0;
    this.hr = 0;
    this.vr = 0;
    this.colors = 0;
    this.importantColors = 0;

    this.data = Buffer.alloc(this.fileSize);
    this.pos = 0;
  }

  public encode() {
    this.pos = 0;

    this.writeHeader();

    switch (this.bitPP) {
      case 16:
        this.write16();
        break;
      case 32:
        this.write32();
        break;
      default:
        this.write24();
    }

    return this.data;
  }

  private writeHeader() {
    this.data.write(this.flag, this.pos, 2);
    this.pos += 2;

    this.writeUInt32LE(this.fileSize);
    this.writeUInt32LE(this.reserved);
    this.writeUInt32LE(this.offset);
    this.writeUInt32LE(this.headerInfoSize);
    this.writeUInt32LE(this.width);

    this.data.writeInt32LE(-this.height, this.pos);
    this.pos += 4;

    this.data.writeUInt16LE(this.planes, this.pos);
    this.pos += 2;

    this.data.writeUInt16LE(this.bitPP, this.pos);
    this.pos += 2;

    this.writeUInt32LE(this.compress);
    this.writeUInt32LE(this.rgbSize);
    this.writeUInt32LE(this.hr);
    this.writeUInt32LE(this.vr);
    this.writeUInt32LE(this.colors);
    this.writeUInt32LE(this.importantColors);
  }

  private write1() {
    this.writeImage((p, index) => {
      let i = index + 1;

      const b = this.buffer[i++];
      const g = this.buffer[i++];
      const r = this.buffer[i++];
      const brightness = r * 0.2126 + g * 0.7152 + b * 0.0722;

      if (brightness > 127) {
        this.data[p] = 0;
      } else {
        this.data[p] = 1;
      }

      return i;
    });
  }

  private write16() {
    this.writeImage((p, index) => {
      let i = index + 1;

      const b = this.buffer[i++] / 8; // b
      const g = this.buffer[i++] / 8; // g
      const r = this.buffer[i++] / 8; // r

      const color = (r << 10) | (g << 5) | b;

      this.data[p + 1] = (color & 0xff00) >> 8;
      this.data[p] = color & 0x00ff;

      return i;
    });
  }

  private write24() {
    this.writeImage((p, index) => {
      let i = index + 1;

      this.data[p] = this.buffer[i++]; //b
      this.data[p + 1] = this.buffer[i++]; //g
      this.data[p + 2] = this.buffer[i++]; //r

      return i;
    });
  }

  private write32() {
    this.writeImage((p, index) => {
      let i = index;

      this.data[p + 3] = this.buffer[i++]; // a
      this.data[p] = this.buffer[i++]; // b
      this.data[p + 1] = this.buffer[i++]; // g
      this.data[p + 2] = this.buffer[i++]; // r

      return i;
    });
  }

  private writeImage(writePixel: IPixelProcessor) {
    const rowBytes = this.extraBytes + this.width * this.rowModifier;

    let i = 0;

    for (let y = 0; y < this.height; y++) {
      let line = '';

      for (let x = 0; x < this.width; x++) {
        const p = this.pos + y * rowBytes + x * this.rowModifier;

        i = writePixel.call(this, p, i);
        // console.log(this.data[p]);
        line += this.data[p]; // writes 0-25

        // 5 so wont work for 1 bit. 8 pixels stored in 0-255
      }

      // console.log(line);

      if (this.extraBytes > 0) {
        const fillOffset = this.pos + y * rowBytes + this.width * 3;
        this.data.fill(0, fillOffset, fillOffset + this.extraBytes);
      }
    }
  }

  private writeUInt32LE(value: number) {
    this.data.writeUInt32LE(value, this.pos);
    this.pos += 4;
  }
}

export default (imgData: IImage) => {
  const encoder = new BmpEncoder(imgData);
  const data = encoder.encode();

  return {
    data,
    width: imgData.width,
    height: imgData.height
  };
};
