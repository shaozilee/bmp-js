/**
 * @author shaozilee
 *
 * BMP format encoder,encode 24bit BMP
 * Not support quality compression
 *
 */

interface IImage {
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
  private pos: number;

  constructor(imgData: IImage) {
    this.buffer = imgData.data;
    this.width = imgData.width;
    this.height = imgData.height;
    this.extraBytes = this.width % 4;
    this.rgbSize = this.height * (this.width * 3 + this.extraBytes);
    this.headerInfoSize = 40;

    // Header

    this.flag = 'BM';
    this.reserved = 0;
    this.offset = 54;
    this.fileSize = this.rgbSize + this.offset;
    this.planes = 1;
    this.bitPP = 24;
    this.compress = 0;
    this.hr = 0;
    this.vr = 0;
    this.colors = 0;
    this.importantColors = 0;

    this.data = Buffer.alloc(this.offset + this.rgbSize);
    this.pos = 0;
  }

  public encode() {
    this.pos = 0;

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

    this.writeImage((p: number, index: number) => {
      let i = index + 1;

      this.data[p] = this.buffer[i++]; //b
      this.data[p + 1] = this.buffer[i++]; //g
      this.data[p + 2] = this.buffer[i++]; //r

      return i;
    });

    return this.data;
  }

  private writeImage(writePixel: IPixelProcessor) {
    const rowBytes = this.extraBytes + this.width * 3;
    let i = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const p = this.pos + y * rowBytes + x * 3;
        i = writePixel.call(this, p, i);
      }

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
