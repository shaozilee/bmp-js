# bmp-js

A pure javascript Bmp encoder and decoder for node.js

Supports all bits decoding(1,4,8,16,24,32) and encoding with 24bit.

## Install

    npm install bmp-js

## How to use

### Decode BMP

```js
var bmp = require("bmp-js");
var bmpBuffer = fs.readFileSync('bit24.bmp');
var bmpData = bmp.decode(bmpBuffer);
```

`bmpData` has all properties, including:

1. fileSize
2. reserved
3. offset
4. headerSize
5. width
6. height
7. planes
8. bitPP
9. compress
10. rawSize
11. hr
12. vr
13. colors
14. importantColors
15. palette
16. data
    a. This is a byte array
    b. The bytes are ordered as follows: ABGR (alpha, blue, green, red)
    c. 4 bytes represent 1 pixel

### Encode RGB

```js
var bmp = require("bmp-js");
var fs = require("fs");
var bmpData = {
    data, //Buffer
    width, //Number
    height //Number
};
var rawData = bmp.encode(bmpData); //defaults to no compression
fs.WriteFileSync('./image.bmp', rawData.data);
```

### License

You can use for free with [MIT License](https://github.com/shaozilee/bmp-js/blob/master/LICENSE)