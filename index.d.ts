declare class BmpEncoder {
  constructor(imgData: Buffer);
  private buffer: Buffer;
  private width: number;
  private height: number;
  private extraBytes: number;
  private rgbSize: number;
  private headerInfoSize: number;
  private data: Buffer;
  private flag: string;
  private reserved: number;
  private offset: number;
  private fileSize: number;
  private planes: number;
  private bitPP: number;
  private compress: number;
  private hr: number;
  private vr: number;
  private colors: number;
  private importantColors: number;
  public encode(): Buffer;
}

declare class BmpDecoder {
  constructor(bmpData: Buffer, is_with_alpha?: boolean);
  public data: Buffer;
  private pos: number;
  private bottom_up: boolean;
  private is_with_alpha: boolean;
  private flag: string;
  private buffer: Buffer;
  public fileSize: number;
  public reserved: number;
  public offset: number;
  public headerSize: number;
  public width: number;
  public height: number;
  public compress: number;
  public rawSize: number;
  public planes: number;
  public bitPP: number;
  public hr: number;
  public vr: number;
  public colors: number;
  public importantColors: number;
  public palette: Array<{
    red: number;
    green: number;
    blue: number;
    quad: number;
  }>;
  private bit1(): void;
  private bit4(): void;
  private bit8(): void;
  private bit15(): void;
  private bit16(): void;
  private bit32(): void;
  private mask0: number;
  private maskGreen: number;
  private maskBlue: number;
  private maskRed: number;
  private parseHeader(): void;
  private parseRGBA(): void;
  private getData(): void;
}

interface IEncodeProps {
    data: Buffer;
    width: number;
    height: number;
}

interface IEncodeReturn {
    data: Buffer;
    width: number;
    height: number;
}

export declare function encode(props: IEncodeProps, quality?: number): IEncodeReturn;

export declare function decode(bmpData: Buffer): BmpDecoder;
