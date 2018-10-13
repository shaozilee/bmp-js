import BmpDecoder from './decoder';
import BmpEncoder from './encoder';
import { IImage } from './types';

export default {
  decode: (bmpData: Buffer) => new BmpDecoder(bmpData),
  encode: (imgData: IImage) => new BmpEncoder(imgData)
};
