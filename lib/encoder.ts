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

class BmpEncoder {
  private fileSize: number;
  private reserved: number;
  private offset: number;
  private width: number;
  private flag: string;
  private height: number;
  private planes: number;
  private bitPP: number;
  private compress: number;
  private hr: number;
  private vr: number;
  private colors: number;
  private importantColors: number;

  private headerInfoSize: number;
  private extraBytes: number;
  private rgbSize: number;
  private data: Buffer;
  private buffer: Buffer;
  private pos: number;

  constructor(imgData: IImage) {
    this.buffer = imgData.data;
    this.width = imgData.width;
    this.height = imgData.height;
    this.extraBytes = this.width % 4;
    this.rgbSize = this.height * (3 * this.width + this.extraBytes);
    this.headerInfoSize = 40;

    /******************header***********************/
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

    this.data = new Buffer(this.offset + this.rgbSize);
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

    const rowBytes = 3 * this.width + this.extraBytes;
    let i = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const p = this.pos + y * rowBytes + x * 3;

        i++; //a
        this.data[p] = this.buffer[i++]; //b
        this.data[p + 1] = this.buffer[i++]; //g
        this.data[p + 2] = this.buffer[i++]; //r
      }

      if (this.extraBytes > 0) {
        const fillOffset = this.pos + y * rowBytes + this.width * 3;
        this.data.fill(0, fillOffset, fillOffset + this.extraBytes);
      }
    }

    return this.data;
  }

  private writeUInt32LE(value: number) {
    this.data.writeUInt32LE(value, this.pos);
    this.pos += 4;
  }
}

export default function(imgData: IImage) {
  const encoder = new BmpEncoder(imgData);
  const data = encoder.encode();

  return {
    data,
    width: imgData.width,
    height: imgData.height
  };
}
