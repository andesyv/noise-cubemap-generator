// Inspiration: https://threejsfundamentals.org/threejs/lessons/threejs-shadertoy.html
import * as Three from 'three';
import imageShaderCode from './imageshader.glsl';
import previewShaderCode from './shader.glsl';

const MAX_LAYERS = 16;

interface ITextureLayer {
  amplitude: number;
  frequency: number;
}

interface ISettings {
  width: number;
  height: number;
  seed: number;
  layers: ITextureLayer[];
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

const settings = {
  width: 256,
  height: 256,
  seed: 1,
  layers: [{ frequency: 1.0, amplitude: 0.5 }],
};
const context = {} as IRenderContext;

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

  const initLayerList = () => {
    const arr = new Array<ITextureLayer>(MAX_LAYERS);
    arr.fill({ amplitude: 0.5, frequency: 0.5 });
    Object.seal(arr);
    return arr;
  };

  context.iMaterial = new Three.ShaderMaterial({
    fragmentShader: imageShaderCode,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new Three.Vector3() },
      side: { value: 0 },
      seed: { value: 0 },
      layerCount: { value: 0 },
      layers: {
        value: initLayerList(),
      },
    },
    defines: {
      MAX_LAYERS: MAX_LAYERS,
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

  const addlayerBtn = document.querySelector<HTMLInputElement>('#addlayer');
  if (addlayerBtn)
    addlayerBtn.addEventListener('click', () => {
      addLayer(settingsObj);
    });
  // Run the submit button once on init
  await fetchSettings(settingsObj);
  // Also run add layer button to setup atleast one layer:
  addLayer(settingsObj);

  // Mouse input
  canvas.addEventListener('mousemove', (e) => {
    context.pMaterial.uniforms.iMouse.value = getMousePosition(e, canvas);
  });

  requestAnimationFrame(render);
};

const renderCubeMap = async (): Promise<string[]> => {
  const sides = new Array<string>(6);
  for (let i = 0; i < 6; ++i) {
    context.iMaterial.uniforms.side.value = i;
    context.iRenderer.render(context.iScene, context.camera);
    sides[i] = context.iRenderer.domElement.toDataURL();
  }
  return Promise.resolve(sides);
};

const updateSettings = async (settings: ISettings) => {
  context.iRenderer.setSize(settings.width, settings.height);
  context.iMaterial.uniforms.iResolution.value.set(settings.width, settings.height, 1);
  context.iMaterial.uniforms.seed.value = settings.seed;
  // Layers:
  context.iMaterial.uniforms.layerCount.value = settings.layers.length;
  settings.layers.forEach((v, i) => {
    if (i < context.iMaterial.uniforms.layers.value.length)
      context.iMaterial.uniforms.layers.value[i] = v;
  });
  const cubeMapSides = await renderCubeMap();
  context.texture = await loadTexture(cubeMapSides);
  context.pMaterial.uniforms.iChannel0.value = context.texture;
};

const getLayer = (listelement: HTMLDivElement): ITextureLayer | null => {
  const freqElement = listelement.querySelector<HTMLInputElement>('#frequency');
  const ampElement = listelement.querySelector<HTMLInputElement>('#amplitude');
  if (freqElement && ampElement)
    return {
      frequency: freqElement.valueAsNumber,
      amplitude: ampElement.valueAsNumber,
    };
  return null;
};

const fetchSettings = async (settingsObj: HTMLFormElement) => {
  const imgsize = settingsObj.querySelector<HTMLInputElement>('#texturesize');
  const imgseed = settingsObj.querySelector<HTMLInputElement>('#textureseed');
  const imglayers = settingsObj.querySelector<HTMLUListElement>('#texturelayers');
  if (!imgsize || !imgseed || !imglayers) return;

  settings.width = settings.height = imgsize.valueAsNumber;
  settings.seed = imgseed.valueAsNumber;
  const layers = imglayers.getElementsByTagName('div');
  settings.layers = new Array(layers.length);
  for (const item of layers) {
    const layer = getLayer(item);
    if (layer) settings.layers.push(layer);
  }

  await updateSettings(settings);
};

const addLayer = (settingsObj: HTMLFormElement) => {
  // If there are no elements in list, add 1
  if (settings.layers.length == 0) {
    settings.layers.push({ frequency: 1.0, amplitude: 0.5 });
  } else {
    const last = settings.layers[settings.layers.length - 1];
    settings.layers.push({ frequency: 2 * last.frequency, amplitude: last.amplitude / 2 });
  }

  const imglayers = settingsObj.querySelector<HTMLUListElement>('#texturelayers');
  if (!imglayers) return;

  /// Man, JSX for this exact part would've been nice...
  const layer = settings.layers[settings.layers.length - 1];
  const node = document.createElement('div');

  // Amplitude
  node.appendChild(document.createTextNode('Amplitude: '));
  const amp = node.appendChild(document.createElement('input'));
  amp.type = 'number';
  amp.step = 'any';
  amp.id = 'amplitude';
  amp.value = layer.amplitude.toString();

  // Frequency
  node.appendChild(document.createTextNode('Frequency: '));
  const freq = node.appendChild(document.createElement('input'));
  freq.type = 'number';
  freq.step = 'any';
  freq.id = 'frequency';
  freq.value = layer.frequency.toString();

  // Removal button
  const remove = node.appendChild(document.createElement('button'));
  remove.addEventListener('click', () => {
    imglayers.removeChild(node);
    imglayers.dispatchEvent(new Event('change', { bubbles: true })); // Manually dispatch event for other event handlers
  });
  remove.appendChild(document.createTextNode('Remove'));

  imglayers.appendChild(node);
  imglayers.dispatchEvent(new Event('change', { bubbles: true })); // Manually dispatch event for other event handlers
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

main();
