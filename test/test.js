var fs = require('fs');

var coder = require('../dist/index').default;
var bmps = [
  './test/bit1',
  './test/bit4',
  './test/bit4_RLE',
  './test/bit8',
  './test/bit8_RLE',
  './test/bit16_565',
  './test/bit16_a444',
  './test/bit16_a555',
  './test/bit16_x444',
  './test/bit16_x555',
  './test/bit24',
  './test/bit32',
  './test/bit32_alpha'
];

console.log('test bmp decoding and encoding...');

for (let b = 0; b < bmps.length; b++) {
  const src = bmps[b];
  console.log('----------------' + src + '.bmp');

  const bufferData = fs.readFileSync(src + '.bmp');
  const decoder = coder.decode(bufferData);
  console.log('width:', decoder.width);
  console.log('height', decoder.height);
  console.log('fileSize:', decoder.fileSize);

  //encode with 24bit
  const encodeData = coder.encode(decoder);
  fs.writeFileSync(src + '_out.bmp', encodeData.data);
}

console.log('test bmp success!');
