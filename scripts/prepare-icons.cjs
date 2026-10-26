// Optional regeneration with sharp installed; the generated icons are committed.
const fs=require('node:fs');
const sharp=require('sharp');
(async()=>{
 const source=fs.readFileSync('dist/favicon.svg');
 const images=[];
 for(const size of [16,32,48]){
  const png=await sharp(source,{density:768}).resize(size,size).png().toBuffer();
  fs.writeFileSync(`dist/favicon-${size}.png`,png);images.push({size,png});
 }
 const header=Buffer.alloc(6+images.length*16);header.writeUInt16LE(1,2);header.writeUInt16LE(images.length,4);
 let offset=header.length;
 images.forEach(({size,png},i)=>{const entry=6+i*16;header[entry]=size;header[entry+1]=size;header.writeUInt16LE(1,entry+4);header.writeUInt16LE(32,entry+6);header.writeUInt32LE(png.length,entry+8);header.writeUInt32LE(offset,entry+12);offset+=png.length;});
 fs.writeFileSync('dist/favicon.ico',Buffer.concat([header,...images.map(image=>image.png)]));
 await sharp(source,{density:768}).resize(180,180).png().toFile('dist/apple-touch-icon.png');
 await sharp(source,{density:768}).resize(512,512).png().toFile('dist/onesight-icon.png');
 fs.copyFileSync('dist/favicon.svg','dist/onesight-favicon.svg');
})();
