// ساخت public/favicon.ico (سه اندازهٔ ۴۸، ۹۶، ۱۹۲؛ مضرب ۴۸ برای گوگل) از لوگوی برند. اجرا: node scripts/build-favicon.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SOURCE = path.join(__dirname, "../public/images/brand/logo-mark-512.png");
const OUTPUT = path.join(__dirname, "../public/favicon.ico");
const SIZES = [48, 96, 192];

(async () => {
  const images = await Promise.all(SIZES.map((size) => sharp(SOURCE).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map((data, index) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(SIZES[index] >= 256 ? 0 : SIZES[index], 0); entry.writeUInt8(SIZES[index] >= 256 ? 0 : SIZES[index], 1);
    entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6); entry.writeUInt32LE(data.length, 8); entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  fs.writeFileSync(OUTPUT, Buffer.concat([header, ...entries, ...images]));
  console.log("favicon.ico written:", fs.statSync(OUTPUT).size, "bytes");
})();
