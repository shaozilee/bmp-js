var fs = require('fs');
var { hexy } = require('hexy');
var pixelmatch = require('pixelmatch');
var PNG = require('pngjs').PNG;

var coder = require('../../dist').default;
var bmps = [
  // './bit1'
  // './Anti-Cosmo_&_2d_Prof._Calamitous_(Jimmy_Timmy_Power_Hour_2)3'
  // './bit4'
  // './bit4_RLE',
  // './bit8'
  // './bit8_RLE',
  // './bit16_565',
  // './bit16_a444',
  // './bit16_a555',
  // './bit16_x444',
  // './bit16_x555'
  // './bit24'
  './bit32'
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
  decoder.bitPP = 32;
  const encodeData = coder.encode(decoder);

  // console.log(hexy(encodeData.data));
  console.log(decoder);

  fs.writeFileSync('test_out.bmp', encodeData.data);

  let bufferData2 = fs.readFileSync('test_out.bmp');
  let decoder2 = coder.decode(bufferData2);

  var diff = new PNG({ width: decoder.width, height: decoder.height });

  pixelmatch(
    decoder.data,
    decoder2.data,
    diff.data,
    decoder.width,
    decoder.height,
    {
      threshold: 0.001
    }
  );

  diff.pack().pipe(fs.createWriteStream('diff.png'));
}

console.log('test bmp success!');
