import * as THREE from 'three';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const captures=[];
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),putImageData(image){captures.push(image);}})})};
/** Dedicated full-sheet relief, independent of the small unicorn reference photo. */
export function metalSheetMaps(variant = 0) {
  const size = 2048, height = new Float32Array(size * size);
  let seed = 9127 + variant * 104729;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const creases = Array.from({ length: 15 + variant * 2 }, () => ({
    x: random(), y: random(), angle: random() * Math.PI,
    width: .001 + random() * .001, length: .12 + random() * .22,
  }));
  const brushed = Float32Array.from({ length: size }, () => (random() - .5) * .0015);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    let relief = brushed[y] + (random() - .5) * .001;
    for (const crease of creases) {
      const dx = u - crease.x, dy = v - crease.y;
      const across = dx * Math.cos(crease.angle) + dy * Math.sin(crease.angle);
      const along = -dx * Math.sin(crease.angle) + dy * Math.cos(crease.angle);
      relief += .021 * Math.exp(-across * across / (crease.width * crease.width) - along * along / (crease.length * crease.length));
    }
    height[y * size + x] = relief;
  }
  const normalCanvas = document.createElement('canvas'), roughCanvas = document.createElement('canvas');
  normalCanvas.width = normalCanvas.height = roughCanvas.width = roughCanvas.height = size;
  const nc = normalCanvas.getContext('2d'), rc = roughCanvas.getContext('2d');
  const normal = nc.createImageData(size, size), rough = rc.createImageData(size, size);
  const at = (x, y) => height[Math.max(0, Math.min(size - 1, y)) * size + Math.max(0, Math.min(size - 1, x))];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (at(x - 1, y) - at(x + 1, y)) * 40;
    const ny = (at(x, y + 1) - at(x, y - 1)) * 40;
    const length = Math.hypot(nx, ny, 1), k = (y * size + x) * 4;
    normal.data.set([128 + 127 * nx / length, 128 + 127 * ny / length, 128 + 127 / length, 255], k);
    const value = 170 + height[y * size + x] * 400;
    rough.data.set([value, value, value, 255], k);
  }
  nc.putImageData(normal, 0, 0); rc.putImageData(rough, 0, 0);
  const maps = { normal: new THREE.CanvasTexture(normalCanvas), roughness: new THREE.CanvasTexture(roughCanvas) };
  for (const texture of Object.values(maps)) texture.channel = 1;
  return maps;
}


const output=fileURLToPath(new URL('../public/textures/project-sheets/',import.meta.url));
await mkdir(output,{recursive:true});
for(let index=0;index<3;index++) {
  captures.length=0;
  const maps=metalSheetMaps(index);
  for(const [i,type] of ['normal','roughness'].entries()) {
    const image=captures[i];
    await sharp(image.data,{raw:{width:image.width,height:image.height,channels:4}}).webp({lossless:true}).toFile(`${output}${index}-${type}.webp`);
  }
  Object.values(maps).forEach(texture=>texture.dispose());
  console.log(`Generated sheet ${index}`);
}
