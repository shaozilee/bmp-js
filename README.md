# bmp-js

A pure javascript `bmp` encoder and decoder for node.js.

Supports all bits decoding (1, 4, 8, 16, 24, 32) and encoding only in 24bit.

## Install

```sh
npm install bmp-js
```

## How to use

### Decode BMP

```js
const bmp = require('bmp-js');
const bmpBuffer = fs.readFileSync('bit24.bmp');
const bmpData = bmp.decode(bmpBuffer);
```

`bmpData` has all header properties of the `bmp` image file, including:

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
const bmp = require('bmp-js');
const fs = require('fs');
const bmpData = {
  data, // Buffer
  width, // Number
  height // Number
};

const rawData = bmp.encode(bmpData); // defaults to no compression
fs.writeFileSync('./image.bmp', rawData.data);
```
