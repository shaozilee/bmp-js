"use strict";
exports.__esModule = true;
var mask_color_1 = require("./mask-color");
var BITMAP_INFO_HEADER = 40;
var BITMAP_V2_INFO_HEADER = 52;
var BITMAP_V3_INFO_HEADER = 56;
var BITMAP_V4_HEADER = 108;
var BITMAP_V5_HEADER = 124;
var VALID_TYPES = [
    BITMAP_INFO_HEADER,
    BITMAP_V2_INFO_HEADER,
    BITMAP_V3_INFO_HEADER,
    BITMAP_V4_HEADER,
    BITMAP_V5_HEADER
];
var BI_RLE8 = 1;
var BI_RLE4 = 2;
var BI_BIT_FIELDS = 3;
var BI_ALPHA_BIT_FIELDS = 6;
var BmpDecoder = /** @class */ (function () {
    function BmpDecoder(buffer, toRGBA) {
        if (toRGBA === void 0) { toRGBA = false; }
        this.buffer = buffer;
        this.toRGBA = !!toRGBA;
        this.pos = 0;
        this.bottomUp = true;
        this.flag = this.buffer.toString('utf-8', 0, (this.pos += 2));
        if (this.flag !== 'BM') {
            throw new Error('Invalid BMP File');
        }
        this.locRed = this.toRGBA ? 0 : 3;
        this.locGreen = this.toRGBA ? 1 : 2;
        this.locBlue = this.toRGBA ? 2 : 1;
        this.locAlpha = this.toRGBA ? 3 : 0;
        this.parseHeader();
        this.parseRGBA();
    }
    BmpDecoder.prototype.parseHeader = function () {
        this.fileSize = this.readUInt32LE();
        this.reserved1 = this.buffer.readUInt16LE(this.pos);
        this.pos += 2;
        this.reserved2 = this.buffer.readUInt16LE(this.pos);
        this.pos += 2;
        this.offset = this.readUInt32LE();
        // End of BITMAP_FILE_HEADER
        this.headerSize = this.readUInt32LE();
        if (VALID_TYPES.indexOf(this.headerSize) === -1) {
            throw new Error("Unsupported BMP header size " + this.headerSize);
        }
        this.width = this.readUInt32LE();
        this.height = this.buffer.readInt32LE(this.pos);
        this.pos += 4;
        this.planes = this.buffer.readUInt16LE(this.pos);
        this.pos += 2;
        this.bitPP = this.buffer.readUInt16LE(this.pos);
        this.pos += 2;
        this.compression = this.readUInt32LE();
        this.rawSize = this.readUInt32LE();
        this.hr = this.readUInt32LE();
        this.vr = this.readUInt32LE();
        this.colors = this.readUInt32LE();
        this.importantColors = this.readUInt32LE();
        // De facto defaults
        if (this.bitPP === 32) {
            this.maskAlpha = 0;
            this.maskRed = 0x00ff0000;
            this.maskGreen = 0x0000ff00;
            this.maskBlue = 0x000000ff;
        }
        else if (this.bitPP === 16) {
            this.maskAlpha = 0;
            this.maskRed = 0x7c00;
            this.maskGreen = 0x03e0;
            this.maskBlue = 0x001f;
        }
        // End of BITMAP_INFO_HEADER
        if (this.headerSize > BITMAP_INFO_HEADER ||
            this.compression === BI_BIT_FIELDS ||
            this.compression === BI_ALPHA_BIT_FIELDS) {
            this.maskRed = this.readUInt32LE();
            this.maskGreen = this.readUInt32LE();
            this.maskBlue = this.readUInt32LE();
        }
        // End of BITMAP_V2_INFO_HEADER
        if (this.headerSize > BITMAP_V2_INFO_HEADER ||
            this.compression === BI_ALPHA_BIT_FIELDS) {
            this.maskAlpha = this.readUInt32LE();
        }
        // End of BITMAP_V3_INFO_HEADER
        if (this.headerSize > BITMAP_V3_INFO_HEADER) {
            this.pos += BITMAP_V4_HEADER - BITMAP_V3_INFO_HEADER;
        }
        // End of BITMAP_V4_HEADER
        if (this.headerSize > BITMAP_V4_HEADER) {
            this.pos += BITMAP_V5_HEADER - BITMAP_V4_HEADER;
        }
        // End of BITMAP_V5_HEADER
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
        if (this.height < 0) {
            this.height *= -1;
            this.bottomUp = false;
        }
        var coloShift = mask_color_1["default"](this.maskRed, this.maskGreen, this.maskBlue, this.maskAlpha);
        this.shiftRed = coloShift.shiftRed;
        this.shiftGreen = coloShift.shiftGreen;
        this.shiftBlue = coloShift.shiftBlue;
        this.shiftAlpha = coloShift.shiftAlpha;
    };
    BmpDecoder.prototype.parseRGBA = function () {
        this.data = Buffer.alloc(this.width * this.height * 4);
        switch (this.bitPP) {
            case 1:
                this.bit1();
                break;
            case 4:
                this.bit4();
                break;
            case 8:
                this.bit8();
                break;
            case 16:
                this.bit16();
                break;
            case 24:
                this.bit24();
                break;
            default:
                this.bit32();
        }
    };
    BmpDecoder.prototype.bit1 = function () {
        var _this = this;
        var xLen = Math.ceil(this.width / 8);
        var mode = xLen % 4;
        var padding = mode !== 0 ? 4 - mode : 0;
        var lastLine;
        var lineStr = '';
        this.scanImage(padding, xLen, function (x, line) {
            if (line !== lastLine) {
                // console.log(lineStr);
                lineStr = '';
                lastLine = line;
            }
            var b = _this.buffer.readUInt8(_this.pos++);
            // console.log('\n', 'pixel value', b, x, line);
            var location = line * _this.width * 4 + x * 8 * 4;
            for (var i = 0; i < 8; i++) {
                if (x * 8 + i < _this.width) {
                    var rgb = _this.palette[(b >> (7 - i)) & 0x1];
                    lineStr = "" + lineStr + ((b >> (7 - i)) & 0x1);
                    _this.data[location + i * 4] = 0;
                    _this.data[location + i * 4 + 1] = rgb.blue;
                    _this.data[location + i * 4 + 2] = rgb.green;
                    _this.data[location + i * 4 + 3] = rgb.red;
                }
                else {
                    break;
                }
            }
        });
    };
    BmpDecoder.prototype.bit4 = function () {
        var _this = this;
        if (this.compression === BI_RLE4) {
            this.data.fill(0xff);
            var lowNibble = false; //for all count of pixel
            var lines = this.bottomUp ? this.height - 1 : 0;
            var location = 0;
            while (location < this.data.length) {
                var a = this.buffer.readUInt8(this.pos++);
                var b = this.buffer.readUInt8(this.pos++);
                //absolute mode
                if (a === 0) {
                    if (b === 0) {
                        //line end
                        lines += this.bottomUp ? -1 : 1;
                        location = lines * this.width * 4;
                        lowNibble = false;
                        continue;
                    }
                    if (b === 1) {
                        // image end
                        break;
                    }
                    if (b === 2) {
                        // offset x,y
                        var x = this.buffer.readUInt8(this.pos++);
                        var y = this.buffer.readUInt8(this.pos++);
                        lines += this.bottomUp ? -y : y;
                        location += y * this.width * 4 + x * 4;
                    }
                    else {
                        var c = this.buffer.readUInt8(this.pos++);
                        for (var i = 0; i < b; i++) {
                            location = this.setPixelData(location, lowNibble ? c & 0x0f : (c & 0xf0) >> 4);
                            if (i & 1 && i + 1 < b) {
                                c = this.buffer.readUInt8(this.pos++);
                            }
                            lowNibble = !lowNibble;
                        }
                        if ((((b + 1) >> 1) & 1) === 1) {
                            this.pos++;
                        }
                    }
                }
                else {
                    //encoded mode
                    for (var i = 0; i < a; i++) {
                        location = this.setPixelData(location, lowNibble ? b & 0x0f : (b & 0xf0) >> 4);
                        lowNibble = !lowNibble;
                    }
                }
            }
        }
        else {
            var xLen = Math.ceil(this.width / 2);
            var mode = xLen % 4;
            var padding = mode !== 0 ? 4 - mode : 0;
            this.scanImage(padding, this.width, function (x, line) {
                var b = _this.buffer.readUInt8(_this.pos++);
                var location = line * _this.width * 4 + x * 2 * 4;
                var before = b >> 4;
                var after = b & 0x0f;
                var rgb = _this.palette[before];
                _this.data[location] = 0;
                _this.data[location + 1] = rgb.blue;
                _this.data[location + 2] = rgb.green;
                _this.data[location + 3] = rgb.red;
                if (x * 2 + 1 >= _this.width) {
                    // throw new Error('Something');
                    return false;
                }
                rgb = _this.palette[after];
                _this.data[location + 4] = 0;
                _this.data[location + 4 + 1] = rgb.blue;
                _this.data[location + 4 + 2] = rgb.green;
                _this.data[location + 4 + 3] = rgb.red;
            });
        }
    };
    BmpDecoder.prototype.bit8 = function () {
        var _this = this;
        if (this.compression === BI_RLE8) {
            this.data.fill(0xff);
            var lines = this.bottomUp ? this.height - 1 : 0;
            var location = 0;
            while (location < this.data.length) {
                var a = this.buffer.readUInt8(this.pos++);
                var b = this.buffer.readUInt8(this.pos++);
                //absolute mode
                if (a === 0) {
                    if (b === 0) {
                        //line end
                        lines += this.bottomUp ? -1 : 1;
                        location = lines * this.width * 4;
                        continue;
                    }
                    if (b === 1) {
                        //image end
                        break;
                    }
                    if (b === 2) {
                        //offset x,y
                        var x = this.buffer.readUInt8(this.pos++);
                        var y = this.buffer.readUInt8(this.pos++);
                        lines += this.bottomUp ? -y : y;
                        location += y * this.width * 4 + x * 4;
                    }
                    else {
                        for (var i = 0; i < b; i++) {
                            var c = this.buffer.readUInt8(this.pos++);
                            location = this.setPixelData(location, c);
                        }
                        // @ts-ignore
                        var shouldIncrement = b & (1 === 1);
                        if (shouldIncrement) {
                            this.pos++;
                        }
                    }
                }
                else {
                    //encoded mode
                    for (var i = 0; i < a; i++) {
                        location = this.setPixelData(location, b);
                    }
                }
            }
        }
        else {
            var mode = this.width % 4;
            var padding = mode !== 0 ? 4 - mode : 0;
            this.scanImage(padding, this.width, function (x, line) {
                var b = _this.buffer.readUInt8(_this.pos++);
                var location = line * _this.width * 4 + x * 4;
                if (b < _this.palette.length) {
                    var rgb = _this.palette[b];
                    _this.data[location] = 0;
                    _this.data[location + 1] = rgb.blue;
                    _this.data[location + 2] = rgb.green;
                    _this.data[location + 3] = rgb.red;
                }
                else {
                    _this.data[location] = 0;
                    _this.data[location + 1] = 0xff;
                    _this.data[location + 2] = 0xff;
                    _this.data[location + 3] = 0xff;
                }
            });
        }
    };
    BmpDecoder.prototype.bit16 = function () {
        var _this = this;
        var padding = (this.width % 2) * 2;
        this.scanImage(padding, this.width, function (x, line) {
            var loc = line * _this.width * 4 + x * 4;
            var px = _this.buffer.readUInt16LE(_this.pos);
            _this.pos += 2;
            _this.data[loc + _this.locRed] = _this.shiftRed(px);
            _this.data[loc + _this.locGreen] = _this.shiftGreen(px);
            _this.data[loc + _this.locBlue] = _this.shiftBlue(px);
            _this.data[loc + _this.locAlpha] = _this.shiftAlpha(px);
        });
    };
    BmpDecoder.prototype.bit24 = function () {
        var _this = this;
        var padding = this.width % 4;
        this.scanImage(padding, this.width, function (x, line) {
            var loc = line * _this.width * 4 + x * 4;
            var blue = _this.buffer.readUInt8(_this.pos++);
            var green = _this.buffer.readUInt8(_this.pos++);
            var red = _this.buffer.readUInt8(_this.pos++);
            _this.data[loc + _this.locRed] = red;
            _this.data[loc + _this.locGreen] = green;
            _this.data[loc + _this.locBlue] = blue;
        });
    };
    BmpDecoder.prototype.bit32 = function () {
        var _this = this;
        this.scanImage(0, this.width, function (x, line) {
            var loc = line * _this.width * 4 + x * 4;
            var px = _this.buffer.readUInt32LE(_this.pos);
            _this.pos += 4;
            _this.data[loc + _this.locRed] = _this.shiftRed(px);
            _this.data[loc + _this.locGreen] = _this.shiftGreen(px);
            _this.data[loc + _this.locBlue] = _this.shiftBlue(px);
            _this.data[loc + _this.locAlpha] = _this.shiftAlpha(px);
        });
    };
    BmpDecoder.prototype.getData = function () {
        return this.data;
    };
    BmpDecoder.prototype.scanImage = function (padding, width, processPixel) {
        if (padding === void 0) { padding = 0; }
        if (width === void 0) { width = this.width; }
        for (var y = this.height - 1; y >= 0; y--) {
            var line = this.bottomUp ? y : this.height - 1 - y;
            for (var x = 0; x < width; x++) {
                var result = processPixel.call(this, x, line);
                if (result === false) {
                    return;
                }
            }
            this.pos += padding;
        }
    };
    BmpDecoder.prototype.readUInt32LE = function () {
        var value = this.buffer.readUInt32LE(this.pos);
        this.pos += 4;
        return value;
    };
    BmpDecoder.prototype.setPixelData = function (location, rgbIndex) {
        var _a = this.palette[rgbIndex], blue = _a.blue, green = _a.green, red = _a.red;
        this.data[location] = 0;
        this.data[location + 1] = blue;
        this.data[location + 2] = green;
        this.data[location + 3] = red;
        return location + 4;
    };
    return BmpDecoder;
}());
exports.BmpDecoder = BmpDecoder;
exports["default"] = (function (bmpData) { return new BmpDecoder(bmpData); });
//# sourceMappingURL=decoder.js.map