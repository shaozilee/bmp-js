/**
 * @author shaozilee
 *
 * BMP format encoder,encode 24bit or 32 bit BMP
 * Not support quality compression
 *
 */

function BmpEncoder(imgData){
	this.buffer = imgData.data;
	this.width = imgData.width;
	this.height = imgData.height;
	this.bitPP = 24;	// Bits per pixel
	this.bytesPP = this.bitPP / 8;
	this.headerInfoSize = 40;
	this.extraBytes = this.calculatePadding(this.width * this.bytesPP, 4);	// Each row must be a multiple of 4 bytes in length.
	this.rgbSize = this.height * (this.bytesPP * this.width + this.extraBytes);

	this.data = [];
	/******************header***********************/
	this.flag = "BM";
	this.reserved = 0;
	this.offset = 54;
	this.fileSize = this.rgbSize + this.offset;
	this.planes = 1;
	this.compress = 0;	// 0 = BI_RGB = no compression
	this.hr = 0;
	this.vr = 0;
	this.colors = 0;
	this.importantColors = 0;
}

BmpEncoder.prototype.calculatePadding = function BmpEncoder_calculatePadding(contentSize, alignment) {
	var modulus = contentSize % alignment;
	if (modulus > 0) return alignment - modulus;
	return 0;
};

BmpEncoder.prototype.encode = function() {
	var filePadding = this.calculatePadding(this.fileSize, 4);
	var tempBuffer = new Buffer(this.fileSize + filePadding);


	this.pos = 0;
	tempBuffer.write(this.flag,this.pos,2);this.pos+=2;		// BM (Windows BMP)
	tempBuffer.writeUInt32LE(this.fileSize + filePadding,this.pos);this.pos+=4;	// Size of BMP file in bytes
	tempBuffer.writeUInt32LE(this.reserved,this.pos);this.pos+=4;	// Reserved
	tempBuffer.writeUInt32LE(this.offset,this.pos);this.pos+=4;	// Offset to start of pixel array

	// DIB Header
	tempBuffer.writeUInt32LE(this.headerInfoSize,this.pos);this.pos+=4;	// Header size, 40 = BITMAPINFOHEADER
	tempBuffer.writeUInt32LE(this.width,this.pos);this.pos+=4;			// width (signed int, 32 bits)
	tempBuffer.writeInt32LE(this.height,this.pos);this.pos+=4			// height (signed int, 32 bits);
	tempBuffer.writeUInt16LE(this.planes,this.pos);this.pos+=2;			// Color planes = 1 (unsigned 16 bits)
	tempBuffer.writeUInt16LE(this.bitPP,this.pos);this.pos+=2;			// Bits per pixel (unsigned 16 bits)
	tempBuffer.writeUInt32LE(this.compress,this.pos);this.pos+=4;		// BI_RGB
	tempBuffer.writeUInt32LE(this.rgbSize,this.pos);this.pos+=4;		// Image (pixel array) size
	tempBuffer.writeUInt32LE(this.hr,this.pos);this.pos+=4;				// Horizontal resolution, pixels per metre (signed in, 32 bits)
	tempBuffer.writeUInt32LE(this.vr,this.pos);this.pos+=4;				// Verticalal resolution, pixels per metre (signed in, 32 bits)
	tempBuffer.writeUInt32LE(this.colors,this.pos);this.pos+=4;			// Colors in the color palette, default 0
	tempBuffer.writeUInt32LE(this.importantColors,this.pos);this.pos+=4;	// 0 = every color important

	// No colour table but it would go here.

	// Pixel data
	var i=0;
	var rowBytes = this.bytesPP * this.width + this.extraBytes;

	for (var y = this.height - 1; y >= 0; y--){
		for (var x = 0; x < this.width; x++){
			var p = this.pos + y * rowBytes + x * this.bytesPP;
			i++;//a
			tempBuffer[p]= this.buffer[i++];//b
			tempBuffer[p+1] = this.buffer[i++];//g
			tempBuffer[p+2]  = this.buffer[i++];//r
			if (this.bytesPP > 3) tempBuffer[p+3] = 0;
		}
		if (this.extraBytes > 0) {
			var fillOffset = this.pos + y * rowBytes + this.width * this.bytesPP;
			tempBuffer.fill(0, fillOffset, fillOffset + this.extraBytes);
		}
	}

	if (filePadding > 0) tempBuffer.fill(0, this.fileSize, this.fileSize + filePadding);
	return tempBuffer;
};

module.exports = function(imgData, quality) {
  if (typeof quality === 'undefined') quality = 100;
 	var encoder = new BmpEncoder(imgData);
	var data = encoder.encode();
  return {
    data: data,
    width: imgData.width,
    height: imgData.height
  };
};
