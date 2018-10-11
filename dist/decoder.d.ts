/// <reference types="node" />
interface IPixel {
    red: number;
    green: number;
    blue: number;
    quad: number;
}
export declare class BmpDecoder {
    fileSize: number;
    reserved1: number;
    reserved2: number;
    offset: number;
    headerSize: number;
    width: number;
    height: number;
    planes: number;
    bitPP: number;
    compression: number;
    rawSize: number;
    hr: number;
    vr: number;
    colors: number;
    importantColors: number;
    palette: IPixel[];
    maskRed: number;
    maskGreen: number;
    maskBlue: number;
    maskAlpha: number;
    toRGBA: boolean;
    private data;
    private pos;
    private bottomUp;
    private readonly buffer;
    private readonly flag;
    private readonly locRed;
    private readonly locGreen;
    private readonly locBlue;
    private readonly locAlpha;
    private shiftRed;
    private shiftGreen;
    private shiftBlue;
    private shiftAlpha;
    constructor(buffer: Buffer, toRGBA?: boolean);
    parseHeader(): void;
    parseRGBA(): void;
    bit1(): void;
    bit4(): void;
    bit8(): void;
    bit16(): void;
    bit24(): void;
    bit32(): void;
    getData(): Buffer;
    private scanImage;
    private readUInt32LE;
    private setPixelData;
}
declare const _default: (bmpData: Buffer) => BmpDecoder;
export default _default;
