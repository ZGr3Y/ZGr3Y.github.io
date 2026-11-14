import * as THREE from 'three';

export function foilStudio({ cinematic = false } = {}) {
  const room = new THREE.Scene(); room.background = new THREE.Color(.065, .08, .095);
  const card = (position, size, intensity) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity), side: THREE.DoubleSide, toneMapped: false }));
    mesh.position.set(...position); mesh.lookAt(0, .5, 0); room.add(mesh);
  };
  if (cinematic) {
    room.background.setRGB(.018, .022, .028);
    card([-3.5, 3, 5], [3.2, 5.8], 3.2);
    card([4, 1, 3], [.65, 5], 4.8);
    card([1.5, 3, -4], [1.1, 5], 5.2);
    card([0, 6, .5], [5, 2], 2.0);
    card([-2, -3, 2], [4, 1], .7);
    card([.5, 1, 6], [3, 4], .9);
    return room;
  }
  card([-2.2, 1.5, 5], [2.4, 6], 3.5); card([4, 1, 3], [.8, 5.5], 6);
  card([0, 6, 1], [5, 2.5], 2.5); card([-2, 1, -5], [4, 1.8], 3);
  card([6, 1, .5], [1.2, 6], 1.2);
  card([-6, 1, 1], [2, 6], 1);
  card([0, -4.5, 3], [8, 4], 2);
  card([1, .2, 5.5], [3, 5], 1.4);
  card([1.1, -.5, 4.5], [.22, 5], .004);
  return room;
}

export function paperGrain() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'); let seed = 34;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 512, 512);
  // Fine connected crease ridges, rather than independent television noise.
  for (let i = 0; i < 155; i++) {
    const x = random() * 512, y = random() * 512, length = 8 + random() * 48, angle = random() * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.strokeStyle = i % 2 ? '#8c8c8c' : '#737373'; ctx.lineWidth = .6 + random() * .6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + Math.cos(angle) * length + 1, y + Math.sin(angle) * length + 1);
    ctx.strokeStyle = i % 2 ? '#777777' : '#888888'; ctx.lineWidth = .65; ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1.7,2.3);return texture;
}

export async function referenceFoilMaps() {
  const image=new Image();image.src='./textures/unicorn-reference.png';await image.decode();
  const w=image.naturalWidth,h=image.naturalHeight,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,w,h).data;
  const gray=new Float32Array(w*h),integral=new Float64Array((w+1)*(h+1)),detail=new Float32Array(w*h);
  for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){const i=y*w+x,k=i*4;gray[i]=data[k]*.2126+data[k+1]*.7152+data[k+2]*.0722;row+=gray[i];integral[(y+1)*(w+1)+x+1]=integral[y*(w+1)+x+1]+row;}}
  // Only fine spatial variation guides the micro-relief. Broad volumes remain
  // authored geometry, and the photo is never used as a visible color map.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const x0=Math.max(0,x-3),x1=Math.min(w,x+4),y0=Math.max(0,y-3),y1=Math.min(h,y+4);
    const sum=integral[y1*(w+1)+x1]-integral[y0*(w+1)+x1]-integral[y1*(w+1)+x0]+integral[y0*(w+1)+x0];
    detail[y*w+x]=gray[y*w+x]-sum/((x1-x0)*(y1-y0));
  }
  const normalCanvas=document.createElement('canvas'),roughCanvas=document.createElement('canvas');normalCanvas.width=roughCanvas.width=w;normalCanvas.height=roughCanvas.height=h;
  const nctx=normalCanvas.getContext('2d'),rctx=roughCanvas.getContext('2d'),normals=nctx.createImageData(w,h),rough=rctx.createImageData(w,h);
  const at=(x,y)=>detail[Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x))];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const nx=-(at(x+1,y)-at(x-1,y))*.016,ny=(at(x,y+1)-at(x,y-1))*.016,length=Math.hypot(nx,ny,1),i=y*w+x,k=i*4;
    normals.data.set([128+127*nx/length,128+127*ny/length,128+127/length,255],k);
    const value=46+(1-gray[i]/255)*35;rough.data.set([value,value,value,255],k);
  }
  nctx.putImageData(normals,0,0);rctx.putImageData(rough,0,0);
  return {normal:new THREE.CanvasTexture(normalCanvas),roughness:new THREE.CanvasTexture(roughCanvas)};
}

/** Precomputed data maps keep expensive relief generation off the startup thread. */
export async function metalSheetMaps(variant = 0) {
  const loader = new THREE.TextureLoader();
  const [normal, roughness] = await Promise.all([
    loader.loadAsync(`./textures/project-sheets/${variant}-normal.webp`),
    loader.loadAsync(`./textures/project-sheets/${variant}-roughness.webp`),
  ]);
  for (const texture of [normal, roughness]) texture.channel = 1;
  return { normal, roughness };
}

export function disposeTree(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m)); if (object.shadow) object.shadow.dispose(); });
  materials.forEach(m => { Object.values(m).forEach(value => { if (value?.isTexture) textures.add(value); }); m.dispose(); }); geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose());
}
