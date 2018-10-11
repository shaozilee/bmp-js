"use strict";
// TODO: support 1, 4, 8, 16, and 32 bit encoding
exports.__esModule = true;
var BmpEncoder = /** @class */ (function () {
    function BmpEncoder(imgData) {
        this.buffer = imgData.data;
        this.width = imgData.width;
        this.height = imgData.height;
        this.headerInfoSize = 40;
        this.extraBytes = this.width % 4;
        // Header
        switch (imgData.bitPP) {
            case 32:
                this.rowModifier = 4;
                this.offset = 54;
                this.bitPP = 32;
                break;
            case 16:
                this.rowModifier = 2;
                this.offset = 54;
                this.bitPP = 16;
                break;
            case 1:
                this.rowModifier = 1 / 8;
                this.offset = 54;
                this.bitPP = 1;
                break;
            default:
                this.rowModifier = 3;
                this.offset = 54;
                this.bitPP = 24;
        }
        this.rgbSize =
            this.height * (this.width * this.rowModifier + this.extraBytes);
        this.flag = 'BM';
        this.reserved = 0;
        this.fileSize = this.rgbSize + this.offset;
        this.planes = 1;
        this.compress = 0;
        this.hr = 0;
        this.vr = 0;
        this.colors = 0;
        this.importantColors = 0;
        this.data = Buffer.alloc(this.fileSize);
        this.pos = 0;
        console.log(this.fileSize);
    }
    BmpEncoder.prototype.encode = function () {
        this.pos = 0;
        this.writeHeader();
        switch (this.bitPP) {
            case 1:
                this.write1();
                break;
            case 16:
                this.write16();
                break;
            case 32:
                this.write32();
                break;
            default:
                this.write24();
        }
        return this.data;
    };
    BmpEncoder.prototype.writeHeader = function () {
        this.data.write(this.flag, this.pos, 2);
        this.pos += 2;
        this.writeUInt32LE(this.fileSize);
        this.writeUInt32LE(this.reserved);
        this.writeUInt32LE(this.offset);
        this.writeUInt32LE(this.headerInfoSize);
        this.writeUInt32LE(this.width);
        this.data.writeInt32LE(-this.height, this.pos);
        this.pos += 4;
        this.data.writeUInt16LE(this.planes, this.pos);
        this.pos += 2;
        this.data.writeUInt16LE(this.bitPP, this.pos);
        this.pos += 2;
        this.writeUInt32LE(this.compress);
        this.writeUInt32LE(this.rgbSize);
        this.writeUInt32LE(this.hr);
        this.writeUInt32LE(this.vr);
        this.writeUInt32LE(this.colors);
        this.writeUInt32LE(this.importantColors);
    };
    BmpEncoder.prototype.write1 = function () {
        var _this = this;
        this.writeImage(function (p, index) {
            var i = index;
            var a = _this.buffer[i++];
            var b = _this.buffer[i++];
            var g = _this.buffer[i++];
            var r = _this.buffer[i++];
            var brightness = r * 0.2126 + g * 0.7152 + b * 0.0722;
            var newPixel = brightness >= 127 ? 0 : 1;
            _this.data[p] = (_this.data[p] << 1) | newPixel;
            console.log(_this.data[p]);
            return i;
        });
        // for (let y = 0; y < this.height; y++) {
        //   for (let x = 0; x < this.width; x++) {
        //     let i = this.pos + y * this.width + x;
        //     console.log(i);
        //     const b = this.buffer[i++];
        //     const g = this.buffer[i++];
        //     const r = this.buffer[i++];
        //     const a = this.buffer[i++];
        //     console.log({ r, g, b, a });
        //     // const brightness = r * 0.2126 + g * 0.7152 + b * 0.0722;
        //   }
        // }
    };
    BmpEncoder.prototype.write16 = function () {
        var _this = this;
        this.writeImage(function (p, index) {
            var i = index + 1;
            var b = _this.buffer[i++] / 8; // b
            var g = _this.buffer[i++] / 8; // g
            var r = _this.buffer[i++] / 8; // r
            console.log({ r: r, g: g, b: b });
            var color = (r << 10) | (g << 5) | b;
            _this.data[p + 1] = (color & 0xff00) >> 8;
            _this.data[p] = color & 0x00ff;
            return i;
        });
    };
    BmpEncoder.prototype.write24 = function () {
        var _this = this;
        this.writeImage(function (p, index) {
            var i = index + 1;
            _this.data[p] = _this.buffer[i++]; //b
            _this.data[p + 1] = _this.buffer[i++]; //g
            _this.data[p + 2] = _this.buffer[i++]; //r
            return i;
        });
    };
    BmpEncoder.prototype.write32 = function () {
        var _this = this;
        this.writeImage(function (p, index) {
            var i = index;
            _this.data[p + 3] = _this.buffer[i++]; // a
            _this.data[p] = _this.buffer[i++]; // b
            _this.data[p + 1] = _this.buffer[i++]; // g
            _this.data[p + 2] = _this.buffer[i++]; // r
            return i;
        });
    };
    BmpEncoder.prototype.writeImage = function (writePixel) {
        var rowBytes = this.extraBytes + this.width * this.rowModifier;
        var i = 0;
        for (var y = 0; y < this.height; y++) {
            var line = '';
            for (var x = 0; x < this.width; x++) {
                var p = Math.floor(this.pos + y * rowBytes + x * this.rowModifier);
                i = writePixel.call(this, p, i);
                // console.log(this.data[p]);
                if (x % 7 === 0) {
                    line += this.data[p].toString(2).padStart(8, '0'); // writes 0-25
                }
                // 5 so wont work for 1 bit. 8 pixels stored in 0-255
            }
            console.log(line);
            if (this.extraBytes > 0) {
                var fillOffset = this.pos + y * rowBytes + this.width * 3;
                this.data.fill(0, fillOffset, fillOffset + this.extraBytes);
            }
        }
    };
    BmpEncoder.prototype.writeUInt32LE = function (value) {
        this.data.writeUInt32LE(value, this.pos);
        this.pos += 4;
    };
    return BmpEncoder;
}());
exports["default"] = (function (imgData) {
    var encoder = new BmpEncoder(imgData);
    var data = encoder.encode();
    return {
        data: data,
        width: imgData.width,
        height: imgData.height
    };
});
//# sourceMappingURL=encoder.js.map