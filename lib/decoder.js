/**
 * @author shaozilee
 *
 * Bmp format decoder,support 1bit 4bit 8bit 24bit bmp
 *
 */

function BmpDecoder(buffer, toRGBA) {
  this.buffer = buffer;

  this.toRGBA = !!toRGBA;
  this.locRed = this.toRGBA ? 0 : 3;
  this.locGreen = this.toRGBA ? 1 : 2;
  this.locBlue = this.toRGBA ? 2 : 1;
  this.locAlpha = this.toRGBA ? 3 : 0;

  this.bottom_up = true;

  this.parseHeader();
  this.parseRGBA();
}

const BITMAPINFOHEADER = 40
const BITMAPV2INFOHEADER = 52;
const BITMAPV3INFOHEADER = 56;
const BITMAPV4HEADER = 108;
const BITMAPV5HEADER = 124;

const VALID_TYPES = [
  BITMAPINFOHEADER,
  BITMAPV2INFOHEADER,
  BITMAPV3INFOHEADER,
  BITMAPV4HEADER,
  BITMAPV5HEADER,
];

const BI_RLE8 = 1;
const BI_RLE4 = 2;
const BI_BITFIELDS = 3;
const BI_ALPHABITFIELDS = 6;

BmpDecoder.prototype.parseHeader = function() {
  this.flag = this.buffer.toString("utf-8", 0, 2);

  if (this.flag !== "BM") throw new Error("Invalid BMP File");

  this.pos = 2;
  this.fileSize = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.reserved1 = this.buffer.readUInt16LE(this.pos);
  this.pos += 2;
  this.reserved2 = this.buffer.readUInt16LE(this.pos);
  this.pos += 2;
  this.offset = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;

  // End of BITMAPFILEHEADER

  this.headerSize = this.buffer.readUInt32LE(this.pos);
  this.type = this.headerSize;
  this.pos += 4;

  if (VALID_TYPES.indexOf(this.type) === -1) {
    throw new Error("Unsupported BMP header size " + this.headerSize);
  }

  this.width = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.height = this.buffer.readInt32LE(this.pos);
  this.pos += 4;
  this.planes = this.buffer.readUInt16LE(this.pos);
  this.pos += 2;
  this.bitPP = this.buffer.readUInt16LE(this.pos);
  this.pos += 2;
  this.compression = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.rawSize = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.hr = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.vr = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.colors = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.importantColors = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;

  // De facto defaults
  if (this.bitPP === 32) {
    this.maskAlpha = 0;
    this.maskRed   = 0x00FF0000;
    this.maskGreen = 0x0000FF00;
    this.maskBlue  = 0x000000FF;
  } else if (this.bitPP === 16) {
    this.maskAlpha = 0;
    this.maskRed   = 0b0111110000000000;
    this.maskGreen = 0b0000001111100000;
    this.maskBlue  = 0b0000000000011111;
  }

  // End of BITMAPINFOHEADER

  if (
    this.headerSize > BITMAPINFOHEADER ||
    this.compression === BI_BITFIELDS ||
    this.compression === BI_ALPHABITFIELDS
  ) {
    this.maskRed = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    this.maskGreen = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    this.maskBlue = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
  }

  // End of BITMAPV2INFOHEADER

  if (
    this.headerSize > BITMAPV2INFOHEADER ||
    this.compression === BI_ALPHABITFIELDS
  ) {
    this.maskAlpha = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
  }

  // End of BITMAPV3INFOHEADER

  if (this.headerSize > BITMAPV3INFOHEADER) {
    this.pos += BITMAPV4HEADER - BITMAPV3INFOHEADER;
  }

  // End of BITMAPV4HEADER

  if (this.headerSize > BITMAPV4HEADER) {
    this.pos += BITMAPV5HEADER - BITMAPV4HEADER;
  }

  // End of BITMAPV5HEADER  

  if (this.bitPP <= 8 || this.colors > 0) {
    var len = this.colors === 0 ? 1 << this.bitPP : this.colors;
    this.palette = new Array(len);
    for (var i = 0; i < len; i++) {
      var blue = this.buffer.readUInt8(this.pos++);
      var green = this.buffer.readUInt8(this.pos++);
      var red = this.buffer.readUInt8(this.pos++);
      var quad = this.buffer.readUInt8(this.pos++);
      this.palette[i] = {
        red: red,
        green: green,
        blue: blue,
        quad: quad
      };
    }
  }

  // End of color table

  if(this.height < 0) {
    this.height *= -1;
    this.bottom_up = false;
  }

  // We have these:
  // 
  // const sample = 0101 0101 0101 0101
  // const mask   = 0111 1100 0000 0000
  // 256        === 0000 0001 0000 0000
  // 
  // We want to take the sample and turn it into an 8-bit value.
  // 
  // 1. We extract the last bit of the mask:
  // 
  // 0000 0100 0000 0000
  //       ^  
  // 
  // Like so:
  // 
  // const a = ~mask =    1000 0011 1111 1111
  // const b = a + 1 =    1000 0100 0000 0000
  // const c = b & mask = 0000 0100 0000 0000
  // 
  // 2. We shift it to the right and extract the bit before the first:
  // 
  // 0000 0000 0010 0000
  //             ^
  //              
  // Like so:
  // 
  // const d = mask / c = 0000 0000 0001 1111
  // const e = mask + 1 = 0000 0000 0010 0000
  // 
  // 3. We apply the mask and the two values above to a sample:
  // 
  // const f = sample & mask = 0101 0100 0000 0000
  // const g = f / c =         0000 0000 0001 0101
  // const h = 256 / e =       0000 0000 0000 0100
  // const i = g * h =         0000 0000 1010 1000
  //                                     ^^^^ ^
  //                                     
  // Voila, we have extracted a sample and "stretched" it to 8 bits. For samples
  // which are already 8-bit, h === 1 and g === i.

  const maskRedR   = (~this.maskRed   + 1) & this.maskRed;  
  const maskGreenR = (~this.maskGreen + 1) & this.maskGreen;
  const maskBlueR  = (~this.maskBlue  + 1) & this.maskBlue; 
  const maskAlphaR = (~this.maskAlpha + 1) & this.maskAlpha;

  const shiftedMaskRedL   = this.maskRed   / maskRedR   + 1;
  const shiftedMaskGreenL = this.maskGreen / maskGreenR + 1;
  const shiftedMaskBlueL  = this.maskBlue  / maskBlueR  + 1;
  const shiftedMaskAlphaL = this.maskAlpha / maskAlphaR + 1;

  this.shiftRed = function(x) {
    return (((x & this.maskRed)   / maskRedR)   * 0x100) / shiftedMaskRedL;
  };

  this.shiftGreen = function(x) {
    return (((x & this.maskGreen) / maskGreenR) * 0x100) / shiftedMaskGreenL;
  };

  this.shiftBlue = function(x) {
    return (((x & this.maskBlue)  / maskBlueR)  * 0x100) / shiftedMaskBlueL;
  };

  this.shiftAlpha = this.maskAlpha !== 0
    ? function(x) {
      return (((x & this.maskAlpha) / maskAlphaR) * 0x100) / shiftedMaskAlphaL;
    }
    : function(x) {
      return 255;
    };
}

BmpDecoder.prototype.parseRGBA = function() {
    var bitn = "bit" + this.bitPP;
    var len = this.width * this.height * 4;
    this.data = Buffer.alloc(len, 0xff);
    this[bitn]();
};

BmpDecoder.prototype.bit1 = function() {
  var xlen = Math.ceil(this.width / 8);
  var mode = xlen%4;
  var y = this.height >= 0 ? this.height - 1 : -this.height
  for (var y = this.height - 1; y >= 0; y--) {
    var line = this.bottom_up ? y : this.height - 1 - y
    for (var x = 0; x < xlen; x++) {
      var b = this.buffer.readUInt8(this.pos++);
      var location = line * this.width * 4 + x*8*4;
      for (var i = 0; i < 8; i++) {
        if(x*8+i<this.width){
          var rgb = this.palette[((b>>(7-i))&0x1)];

          this.data[location+i*4 + this.locAlpha] = 0xff;
          this.data[location+i*4 + this.locBlue] = rgb.blue;
          this.data[location+i*4 + this.locGreen] = rgb.green;
          this.data[location+i*4 + this.locRed] = rgb.red;

        }else{
          break;
        }
      }
    }

    if (mode != 0){
      this.pos+=(4 - mode);
    }
  }
};

BmpDecoder.prototype.bit4 = function() {
    if (this.compression === BI_RLE4){
        this.data.fill(0xff);

        var location = 0;
        var lines = this.bottom_up?this.height-1:0;
        var low_nibble = false;//for all count of pixel

        while(location<this.data.length){
            var a = this.buffer.readUInt8(this.pos++);
            var b = this.buffer.readUInt8(this.pos++);
            //absolute mode
            if(a == 0){
                if(b == 0){//line end
                    if(this.bottom_up){
                        lines--;
                    }else{
                        lines++;
                    }
                    location = lines*this.width*4;
                    low_nibble = false;
                    continue;
                }else if(b == 1){//image end
                    break;
                }else if(b ==2){
                    //offset x,y
                    var x = this.buffer.readUInt8(this.pos++);
                    var y = this.buffer.readUInt8(this.pos++);
                    if(this.bottom_up){
                        lines-=y;
                    }else{
                        lines+=y;
                    }

                    location +=(y*this.width*4+x*4);
                }else{
                    var c = this.buffer.readUInt8(this.pos++);
                    for(var i=0;i<b;i++){
                        if (low_nibble) {
                            setPixelData.call(this, (c & 0x0f));
                        } else {
                            setPixelData.call(this, (c & 0xf0)>>4);
                        }

                        if ((i & 1) && (i+1 < b)){
                            c = this.buffer.readUInt8(this.pos++);
                        }

                        low_nibble = !low_nibble;
                    }

                    if ((((b+1) >> 1) & 1 ) == 1){
                        this.pos++
                    }
                }

            }else{//encoded mode
                for (var i = 0; i < a; i++) {
                    if (low_nibble) {
                        setPixelData.call(this, (b & 0x0f));
                    } else {
                        setPixelData.call(this, (b & 0xf0)>>4);
                    }
                    low_nibble = !low_nibble;
                }
            }

        }




        function setPixelData(rgbIndex){
            var rgb = this.palette[rgbIndex];
            this.data[location + this.locAlpha] = 0xff;
            this.data[location + this.locBlue] = rgb.blue;
            this.data[location + this.locGreen] = rgb.green;
            this.data[location + this.locRed] = rgb.red;
            location+=4;
        }
    }else{

      var xlen = Math.ceil(this.width/2);
      var mode = xlen%4;
      for (var y = this.height - 1; y >= 0; y--) {
        var line = this.bottom_up ? y : this.height - 1 - y
        for (var x = 0; x < xlen; x++) {
          var b = this.buffer.readUInt8(this.pos++);
          var location = line * this.width * 4 + x*2*4;

          var before = b>>4;
          var after = b&0x0F;

          var rgb = this.palette[before];
          this.data[location] = 0xff;
          this.data[location + this.locBlue] = rgb.blue;
          this.data[location + this.locGreen] = rgb.green;
          this.data[location + this.locRed] = rgb.red;


          if(x*2+1>=this.width)break;

          rgb = this.palette[after];

          this.data[location+4 + this.locAlpha] = 0xff;
          this.data[location+4 + this.locBlue] = rgb.blue;
          this.data[location+4 + this.locGreen] = rgb.green;
          this.data[location+4 + this.locRed] = rgb.red;

        }

        if (mode != 0){
          this.pos+=(4 - mode);
        }
      }

    }

};

BmpDecoder.prototype.bit8 = function() {
    if (this.compression === BI_RLE8){
        this.data.fill(0xff);

        var location = 0;
        var lines = this.bottom_up?this.height-1:0;

        while(location<this.data.length){
            var a = this.buffer.readUInt8(this.pos++);
            var b = this.buffer.readUInt8(this.pos++);
            //absolute mode
            if(a == 0){
                if(b == 0){//line end
                    if(this.bottom_up){
                        lines--;
                    }else{
                        lines++;
                    }
                    location = lines*this.width*4;
                    continue;
                }else if(b == 1){//image end
                    break;
                }else if(b ==2){
                    //offset x,y
                    var x = this.buffer.readUInt8(this.pos++);
                    var y = this.buffer.readUInt8(this.pos++);
                    if(this.bottom_up){
                        lines-=y;
                    }else{
                        lines+=y;
                    }

                    location +=(y*this.width*4+x*4);
                }else{
                    for(var i=0;i<b;i++){
                        var c = this.buffer.readUInt8(this.pos++);
                        setPixelData.call(this, c);
                    }
                    if(b&1 == 1){
                        this.pos++;
                    }

                }

            }else{//encoded mode
                for (var i = 0; i < a; i++) {
                    setPixelData.call(this, b);
                }
            }

        }




        function setPixelData(rgbIndex){
            var rgb = this.palette[rgbIndex];
            this.data[location + this.locAlpha] = 0xff;
            this.data[location + this.locBlue] = rgb.blue;
            this.data[location + this.locGreen] = rgb.green;
            this.data[location + this.locRed] = rgb.red;
            location+=4;
        }
    }else {
        var mode = this.width % 4;
        for (var y = this.height - 1; y >= 0; y--) {
            var line = this.bottom_up ? y : this.height - 1 - y
            for (var x = 0; x < this.width; x++) {
                var b = this.buffer.readUInt8(this.pos++);
                var location = line * this.width * 4 + x * 4;
                if (b < this.palette.length) {
                    var rgb = this.palette[b];

                    this.data[location + this.locAlpha] = 0xff;
                    this.data[location + this.locBlue] = rgb.blue;
                    this.data[location + this.locGreen] = rgb.green;
                    this.data[location + this.locRed] = rgb.red;

                } else {
                    this.data[location + this.locAlpha] = 0xff;
                    this.data[location + this.locBlue] = 0xFF;
                    this.data[location + this.locGreen] = 0xFF;
                    this.data[location + this.locRed] = 0xFF;
                }
            }
            if (mode != 0) {
                this.pos += (4 - mode);
            }
        }
    }
};

BmpDecoder.prototype.bit16 = function() {
  const data = this.data;
  const dif_w = (this.width % 2) * 2;
  for (let y = this.height - 1; y >= 0; y--) {
    const line = this.bottom_up ? y : this.height - 1 - y;
    for (let x = 0; x < this.width; x++) {
      const loc = line * this.width * 4 + x * 4;
      const px = this.buffer.readUInt16LE(this.pos);
      this.pos += 2;

      data[loc + this.locRed] = this.shiftRed(px);
      data[loc + this.locGreen] = this.shiftGreen(px);
      data[loc + this.locBlue] = this.shiftBlue(px);
      data[loc + this.locAlpha] = this.shiftAlpha(px);
    }

    // Skip extra bytes
    this.pos += dif_w;
  }
};

BmpDecoder.prototype.bit24 = function() {
  const data = this.data;
  for (let y = this.height - 1; y >= 0; y--) {
    const line = this.bottom_up ? y : this.height - 1 - y
    for (let x = 0; x < this.width; x++) {
      const loc = line * this.width * 4 + x * 4;
      const blue = this.buffer.readUInt8(this.pos++);
      const green = this.buffer.readUInt8(this.pos++);
      const red = this.buffer.readUInt8(this.pos++);

      data[loc + this.locRed] = red;
      data[loc + this.locGreen] = green;
      data[loc + this.locBlue] = blue;
      data[loc + this.locAlpha] = 0xff; // extra padding
    }

    // Skip extra bytes
    this.pos += (this.width % 4);
  }
};

BmpDecoder.prototype.bit32 = function() {
  const data = this.data;
  for (let y = this.height - 1; y >= 0; y--) {
    const line = this.bottom_up ? y : this.height - 1 - y;
    for (let x = 0; x < this.width; x++) {
      const loc = line * this.width * 4 + x * 4;
      const px = this.buffer.readUInt32LE(this.pos);
      this.pos += 4;

      data[loc + this.locRed] = this.shiftRed(px);
      data[loc + this.locGreen] = this.shiftGreen(px);
      data[loc + this.locBlue] = this.shiftBlue(px);
      data[loc + this.locAlpha] = this.shiftAlpha(px);
    }
  }
};

BmpDecoder.prototype.getData = function() {
  return this.data;
};

module.exports = function(bmpData, toRGBA) {
  var decoder = new BmpDecoder(bmpData, toRGBA);
  return decoder;
};
