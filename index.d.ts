declare module "@vingle/bmp-js" {
  export interface Bitmap {
    pos: number;
    buffer: Buffer;
    is_with_alpha: boolean;
    bottom_up: boolean;
    flag: string;
    fileSize: number;
    reserved: number;
    offset: number;
    headerSize: number;
    width: number;
    height: number;
    planes: number;
    bitPP: number;
    compress: number;
    rawSize: number;
    hr: number;
    vr: number;
    colors: number;
    importantColors: number;
    data: Buffer;
  }

  export function encode(input: {
    data: Buffer;
    width: number;
    height: number;
  }): Buffer;

  export function decode(buf: Buffer, toRGBA?: boolean): Bitmap;
}
