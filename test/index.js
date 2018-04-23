

var fs = require("fs");

var src = "./bit32_alpha.bmp";
var bufferData = fs.readFileSync(src);



console.log(bufferData instanceof Buffer);

var pos = 0;

console.log("=========================The File Header=======================");

console.log(pos,"bfType",bufferData.toString("utf-8",pos,2));pos+=2;
console.log(pos,"bfSize",bufferData.readInt32LE(pos));pos+=4;
console.log(pos,"bfReserved1",bufferData.readInt16LE(pos));pos+=2;//unuse,always zero
console.log(pos,"bfReserved2",bufferData.readInt16LE(pos));pos+=2;//unuse,always zero
console.log(pos,"bfOffBits",bufferData.readInt32LE(pos));pos+=4;//Offset to start of Pixel Data

console.log("=========================The Image Header=======================");
console.log(pos,"biSize",bufferData.readInt32LE(pos));pos+=4;//Header Size,Windows BMP(40+bytes),OS/2(12bytes) BMP but not supported in this
console.log(pos,"biWidth",width = bufferData.readInt32LE(pos));pos+=4;//Image width in pixels
console.log(pos,"biHeight",height=bufferData.readInt32LE(pos));pos+=4;//Image height in pixels maybe negative number means store from top to bottom line,otherwise reverse
console.log(pos,"biPlanes",bufferData.readInt16LE(pos));pos+=2;//Must be 1
console.log(pos,"biBitCount",bufferData.readInt16LE(pos));pos+=2;//Bits per pixel - 1, 4, 8, 16, 24, or 32
console.log(pos,"biCompression",bufferData.readInt32LE(pos));pos+=4;//Compression type (0 = uncompressed,1	RLE-8 (Usable only with 8-bit images),2	RLE-4 (Usable only with 4-bit images),3	Bitfields (Used - and required - only with 16- and 32-bit images))
console.log(pos,"biSizeImage",bufferData.readInt32LE(pos));pos+=4;//Image Size - may be zero for uncompressed images
console.log(pos,"biXPelsPerMeter",bufferData.readInt32LE(pos));pos+=4;//Preferred resolution in pixels per meter
console.log(pos,"biYPelsPerMeter",bufferData.readInt32LE(pos));pos+=4;//Preferred resolution in pixels per meter
console.log(pos,"biClrUsed",bufferData.readInt32LE(pos));pos+=4;//Number Color Map entries that are actually used
console.log(pos,"biClrImportant",bufferData.readInt32LE(pos));pos+=4;//Number of significant colors


console.log(pos,"=========================The Pixel Data=======================");










