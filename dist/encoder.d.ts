/// <reference types="node" />
export interface IImage {
    bitPP: number;
    height: number;
    width: number;
    data: Buffer;
}
declare const _default: (imgData: IImage) => {
    data: Buffer;
    width: number;
    height: number;
};
export default _default;
