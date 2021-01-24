// Inspiration: https://threejsfundamentals.org/threejs/lessons/threejs-shadertoy.html
import * as Three from 'three';
import imageShaderCode from './imageshader.glsl';
import previewShaderCode from './shader.glsl';
import JSZip from 'jszip';
import FileSaver from 'file-saver';

interface ISettings {
  width: number;
  height: number;
  seed: number;
  octaves: number;
  lacunarity: number;
  gain: number;
}

interface IRenderContext {
  iRenderer: Three.WebGLRenderer;
  iMaterial: Three.ShaderMaterial;
  iScene: Three.Scene;
  pRenderer: Three.WebGLRenderer;
  pMaterial: Three.ShaderMaterial;
  pScene: Three.Scene;
  camera: Three.Camera;
  renderedImages: string[];
  texture: Three.CubeTexture;
}

const settings: ISettings = {
  width: 256,
  height: 256,
  seed: 1,
  lacunarity: 2.0,
  gain: 0.5,
  octaves: 6,
};
const context = {
  renderedImages: new Array<string>(6),
} as IRenderContext;

// Sleep lambda :)
// const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  const canvas = document.querySelector<HTMLCanvasElement>('#c');
  if (canvas == null) {
    return;
  }

  context.camera = new Three.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  const plane = new Three.PlaneBufferGeometry(2, 2);

  // Image renderer:
  context.iRenderer = new Three.WebGLRenderer({ preserveDrawingBuffer: true });
  context.iRenderer.autoClear = false;
  context.texture = {} as Three.CubeTexture;

  context.iMaterial = new Three.ShaderMaterial({
    fragmentShader: imageShaderCode,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new Three.Vector3() },
      side: { value: 0 },
      seed: { value: 0 },
      lacunarity: { value: 2.0 },
      gain: { value: 0.5 },
      octaves: { value: 0 },
    },
  });

  context.iScene = new Three.Scene();
  context.iScene.add(new Three.Mesh(plane, context.iMaterial));

  // Preview renderer:
  context.pRenderer = new Three.WebGLRenderer({ canvas: canvas });
  context.pRenderer.autoClear = false;

  context.pMaterial = new Three.ShaderMaterial({
    fragmentShader: previewShaderCode,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new Three.Vector3() },
      iMouse: { value: new Three.Vector4() },
      iChannel0: { value: context.texture },
    },
  });

  context.pScene = new Three.Scene();
  context.pScene.add(new Three.Mesh(plane, context.pMaterial));

  // Settings interface
  const settingsObj = document.querySelector<HTMLFormElement>('#settings');
  if (!settingsObj) return;

  settingsObj.addEventListener('change', (ev) => {
    const s: HTMLFormElement | null = ev.currentTarget as HTMLFormElement;
    if (s) fetchSettings(s);
  });

  // Run the submit button once on init
  await fetchSettings(settingsObj);

  // Mouse input
  canvas.addEventListener('mousemove', (e) => {
    context.pMaterial.uniforms.iMouse.value = getMousePosition(e, canvas);
  });

  const downloadBtn = document.querySelector<HTMLButtonElement>('#download');
  if (downloadBtn)
    downloadBtn.addEventListener('click', () => {
      download();
    });

  const randomizeBtn = document.querySelector<HTMLButtonElement>('#randomize');
  if (randomizeBtn) {
    randomizeBtn.addEventListener('click', randomizeSeed);
    randomizeSeed(); // Randomize once
  }

  requestAnimationFrame(render);
};

const renderCubeMap = async (): Promise<string[]> => {
  const sides = new Array<string>(6);
  for (let i = 0; i < 6; ++i) {
    context.iMaterial.uniforms.side.value = i;
    context.iRenderer.render(context.iScene, context.camera);
    context.renderedImages[i] = sides[i] = context.iRenderer.domElement.toDataURL();
  }
  return Promise.resolve(sides);
};

const updateSettings = async (settings: ISettings) => {
  context.iRenderer.setSize(settings.width, settings.height);
  context.iMaterial.uniforms.iResolution.value.set(settings.width, settings.height, 1);
  context.iMaterial.uniforms.seed.value = settings.seed;
  context.iMaterial.uniforms.octaves.value = settings.octaves;
  context.iMaterial.uniforms.lacunarity.value = settings.lacunarity;
  context.iMaterial.uniforms.gain.value = settings.gain;
  const cubeMapSides = await renderCubeMap();
  context.texture = await loadTexture(cubeMapSides);
  context.pMaterial.uniforms.iChannel0.value = context.texture;
};

const fetchSettings = async (settingsObj: HTMLFormElement) => {
  const imgsize = settingsObj.querySelector<HTMLInputElement>('#texturesize');
  const imgseed = settingsObj.querySelector<HTMLInputElement>('#textureseed');
  const imglacunarity = settingsObj.querySelector<HTMLInputElement>('#texturelacunarity');
  const imggain = settingsObj.querySelector<HTMLInputElement>('#texturegain');
  const imgoctaves = settingsObj.querySelector<HTMLInputElement>('#textureoctaves');

  if (!imgsize || !imgseed || !imglacunarity || !imggain || !imgoctaves) return;

  settings.width = settings.height = imgsize.valueAsNumber;
  settings.seed = imgseed.valueAsNumber;
  settings.lacunarity = imglacunarity.valueAsNumber;
  settings.gain = imggain.valueAsNumber;
  settings.octaves = imgoctaves.valueAsNumber;

  await updateSettings(settings);
};

const resizeRendererToDisplaySize = (renderer: Three.WebGLRenderer): boolean => {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
};

const getMousePosition = (event: MouseEvent, element: Element): Three.Vector4 => {
  return new Three.Vector4(
    event.clientX - element.getBoundingClientRect().left,
    element.getBoundingClientRect().bottom - event.clientY,
    0,
    0
  );
};

const loadTexture = (path: string[]): Promise<Three.CubeTexture> => {
  return new Promise((resolve, reject) => {
    const tex = new Three.CubeTextureLoader().load(
      path,
      (t) => {
        t.wrapS = Three.RepeatWrapping;
        t.wrapT = Three.RepeatWrapping;
        t.repeat.set(4, 4);
        resolve(t);
      },
      undefined,
      () => {
        reject();
      }
    );
    tex.generateMipmaps = true;
  });
};

// Rendering
const render = (time: number) => {
  resizeRendererToDisplaySize(context.pRenderer);

  const canvas = context.pRenderer.domElement;
  context.pMaterial.uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
  context.pMaterial.uniforms.iTime.value = context.iMaterial.uniforms.iTime.value = time * 0.001; // Time is in milliseconds

  context.pRenderer.render(context.pScene, context.camera);

  requestAnimationFrame(render);
};

const fileextensions = ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'];

const download = () => {
  // New zip object
  const zip = new JSZip();

  if (!context.renderedImages) return;

  for (let i = 0; i < 6; ++i) {
    // Data is stored in data uri taken from canvas.toDataURL()
    const dataUri = context.renderedImages[i];
    const idx = dataUri.indexOf('base64,') + 'base64,'.length;
    const content = dataUri.substring(idx);
    zip.file(fileextensions[i], content, { base64: true });
  }

  zip.generateAsync({ type: 'blob' }).then((content) => {
    FileSaver.saveAs(content, 'cubemap.zip');
  });
};

const randomizeSeed = () => {
  const el = document.querySelector<HTMLInputElement>('#textureseed');
  if (!el) return;
  el.value = Math.floor(Math.random() * 10000).toString();
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

main();
