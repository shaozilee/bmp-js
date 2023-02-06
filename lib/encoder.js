/**
 * @author shaozilee
 *
 * BMP format encoder,encode 24bit BMP
 * Not support quality compression
 *
 */

function BmpEncoder(imgData){
	this.buffer = imgData.data;
	this.width = imgData.width;
	this.height = imgData.height;
	this.extraBytes = this.width%4;
	this.rgbSize = this.height*(3*this.width+this.extraBytes);
	this.headerInfoSize = 40;

	this.data = [];
	/******************header***********************/
	this.flag = "BM";
	this.reserved = 0;
	this.offset = 54;
	this.fileSize = this.rgbSize+this.offset;
	this.planes = 1;
	this.bitPP = 24;
	this.compress = 0;
	this.hr = 0;
	this.vr = 0;
	this.colors = 0;
	this.importantColors = 0;
}

BmpEncoder.prototype.encode = function() {
	var tempBuffer = new DataView(new ArrayBuffer(this.offset+this.rgbSize));
	this.pos = 0;
	tempBuffer.setUint8(this.pos,this.flag);this.pos+=2;
	tempBuffer.setUint32(this.pos,this.fileSize, false);this.pos+=4;
	tempBuffer.setUint32(this.pos,this.reserved, true);this.pos+=4;
	tempBuffer.setUint32(this.pos,this.offset, true);this.pos+=4;

	tempBuffer.setUint32(this.pos,this.headerInfoSize, true);this.pos+=4;
	tempBuffer.setUint32(this.pos,this.width, true);this.pos+=4;
	tempBuffer.setInt32(this.pos,-this.height, true);this.pos+=4;
	tempBuffer.setUint16(this.pos,this.planes, true);this.pos+=2;
	tempBuffer.setUint16(this.pos,this.bitPP, true);this.pos+=2;
	tempBuffer.setUint32(this.pos,this.compress, true);this.pos+=4;
	tempBuffer.setUint32(this.pos,this.rgbSize, true);this.pos+=4;
	tempBuffer.setUint32(this.pos,this.hr, true);this.pos+=4;
	tempBuffer.setUint32(this.pos,this.vr, true);this.pos+=4;
	tempBuffer.setUint32(this.pos,this.colors, true);this.pos+=4;
	tempBuffer.setUint32(this.pos,this.importantColors, true);this.pos+=4;

	var i=0;
	var rowBytes = 3*this.width+this.extraBytes;

	for (var y = 0; y <this.height; y++){
		for (var x = 0; x < this.width; x++){
			var p = this.pos+y*rowBytes+x*3;
			i++;//a
			tempBuffer[p]= this.buffer[i++];//b
			tempBuffer[p+1] = this.buffer[i++];//g
			tempBuffer[p+2]  = this.buffer[i++];//r
		}
		if(this.extraBytes>0){
			var fillOffset = this.pos+y*rowBytes+this.width*3;
			tempBuffer.fill(0,fillOffset,fillOffset+this.extraBytes);
		}
	}

	return new Uint8Array(tempBuffer.buffer);
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
