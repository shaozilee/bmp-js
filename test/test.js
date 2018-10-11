var fs = require('fs');

var coder = require('../dist/index').default;
var bmps = [
  './bit1'
  // './bit4',
  // './bit4_RLE',
  // './bit8',
  // './bit8_RLE',
  // './bit16_565',
  // './bit16_a444',
  // './bit16_a555',
  // './bit16_x444',
  // './bit16_x555',
  // './bit24',
  // './bit32',
  // './bit32_alpha'
];

console.log('test bmp decoding and encoding...');

for (let b = 0; b < bmps.length; b++) {
  const src = bmps[b];
  console.log('----------------' + src + '.bmp');

  const bufferData = fs.readFileSync(src + '.bmp');
  const decoder = coder.decode(bufferData);
  console.log('bit:', decoder.bitPP);
  console.log('width:', decoder.width);
  console.log('height', decoder.height);
  console.log('fileSize:', decoder.fileSize);

  //encode with 24bit
  decoder.bitPP = 24;
  const encodeData = coder.encode(decoder);
  fs.writeFileSync(src + '_out.bmp', encodeData.data);
}

console.log('test bmp success!');
