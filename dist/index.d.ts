/**
 * @author shaozilee
 *
 * support 1bit 4bit 8bit 24bit decode
 * encode with 24bit
 *
 */
/// <reference types="node" />
declare const _default: {
    decode: (bmpData: Buffer) => import("./decoder").BmpDecoder;
    encode: (imgData: import("./encoder").IImage) => {
        data: Buffer;
        width: number;
        height: number;
    };
};
export default _default;
