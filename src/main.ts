// Inspiration: https://threejsfundamentals.org/threejs/lessons/threejs-shadertoy.html
import * as Three from 'three';
import imageShaderCode from './imageshader.glsl';
import previewShaderCode from './shader.glsl';

interface ISettings {
  width: number;
  height: number;
}

interface IRenderContext {
  iRenderer: Three.WebGLRenderer;
  iMaterial: Three.ShaderMaterial;
  iScene: Three.Scene;
  pRenderer: Three.WebGLRenderer;
  pMaterial: Three.ShaderMaterial;
  pScene: Three.Scene;
  camera: Three.Camera;
  texture: Three.CubeTexture;
}

const settings = {} as ISettings;
const context = {} as IRenderContext;

// Sleep lambda :)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

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
    }
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
  if (!settingsObj)
    return;

  settingsObj.addEventListener('submit', (ev) => {
    const s: HTMLFormElement | null = ev.currentTarget as HTMLFormElement;
    if (s) fetchSettings(s)
  });
  // Run the submit button once on init
  await fetchSettings(settingsObj);

  // Mouse input
  canvas.addEventListener('mousemove', (e) => {
    context.pMaterial.uniforms.iMouse.value = getMousePosition(e, canvas);
  });

  requestAnimationFrame(render);
};

const renderCubeMap = async (): Promise<string[]> => {
  const image = document.querySelector<HTMLImageElement>("#output");
  if (!image) return Promise.reject();
  // context.iMaterial.uniforms
  const sides = new Array<string>(6);
  for (let i = 0; i < 6; ++i) {
    context.iMaterial.uniforms.side.value = i;
    context.iRenderer.render(context.iScene, context.camera);
    const data = context.iRenderer.domElement.toDataURL();
    sides[i] = data;
    image.src = data;
  }
  return Promise.resolve(sides);
}

const updateSettings = async (settings: ISettings = { width: 256, height: 256 }) => {
  context.iRenderer.setSize(settings.width, settings.height);
  context.iMaterial.uniforms.iResolution.value.set(settings.width, settings.height, 1);
  const cubeMapSides = await renderCubeMap();
  context.texture = await loadTexture(cubeMapSides);
  context.pMaterial.uniforms.iChannel0.value = context.texture;
};

const fetchSettings = async (settingsObj: HTMLFormElement) => {
  const imgwidth = settingsObj.querySelector<HTMLInputElement>('#swidth');
  const imgheight = settingsObj.querySelector<HTMLInputElement>('#sheight');
  if (!imgwidth || !imgheight) return;

  settings.width = imgwidth.valueAsNumber;
  settings.height = imgheight.valueAsNumber;

  await updateSettings(settings);
}

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
    const tex = new Three.CubeTextureLoader().load(path, (t) => {
      t.wrapS = Three.RepeatWrapping;
      t.wrapT = Three.RepeatWrapping;
      t.repeat.set(4, 4);
      resolve(t);
    }, undefined, () => { reject(); });
    tex.generateMipmaps = true;
  });
};

// Rendering
const render = (time: number) => {
  resizeRendererToDisplaySize(context.pRenderer);

  const canvas = context.pRenderer.domElement;
  context.pMaterial.uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
  context.pMaterial.uniforms.iTime.value = time * 0.001; // Time is in milliseconds
  context.iMaterial.uniforms.iTime.value = time * 0.001; // Time is in milliseconds

  context.pRenderer.render(context.pScene, context.camera);

  requestAnimationFrame(render);
};

main();