// Inspiration: https://threejsfundamentals.org/threejs/lessons/threejs-shadertoy.html
import * as Three from 'three';
import imageShaderCode from './imageshader.glsl';
import previewShaderCode from './shader.glsl';

interface ISettings {
  width: number;
  height: number;
}

const main = () => {
  const canvas = document.querySelector<HTMLCanvasElement>('#c');
  if (canvas == null) {
    return;
  }

  const camera = new Three.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  const plane = new Three.PlaneBufferGeometry(2, 2);
  
  // Image renderer:
  const iRenderer = new Three.WebGLRenderer();
  iRenderer.autoClear = false;
  const texturePath = iRenderer.domElement.toDataURL();
  
  const iMaterial = new Three.ShaderMaterial({
    fragmentShader: imageShaderCode,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new Three.Vector3() },
    }
  });

  const iScene = new Three.Scene();
  iScene.add(new Three.Mesh(plane, iMaterial));
  
  // Preview renderer:
  const pRenderer = new Three.WebGLRenderer({ canvas: canvas });
  pRenderer.autoClear = false;
  
  
  const pMaterial = new Three.ShaderMaterial({
    fragmentShader: previewShaderCode,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new Three.Vector3() },
      iMouse: { value: new Three.Vector4() },
      iChannel0: { value: texturePath },
    },
  });
  
  const pScene = new Three.Scene();
  pScene.add(new Three.Mesh(plane, pMaterial));

  // Settings interface
  const updateSettings = (settings: ISettings = { width: 256, height: 256}) => {
      iRenderer.setSize(settings.width, settings.height);
      iRenderer.render(iScene, camera);
  };

  const settingsObj = document.querySelector<HTMLFormElement>('#settings');
  const settings = {} as ISettings;
  if (settingsObj) {
    const submitEvent = () => {
      console.log("Submit!");
      const imgwidth = settingsObj.querySelector<HTMLInputElement>('#swidth');
      const imgheight = settingsObj.querySelector<HTMLInputElement>('#sheight');
      if (!imgwidth || !imgheight)
        return;
      
      settings.width = imgwidth.valueAsNumber;
      settings.height = imgheight.valueAsNumber;

      updateSettings(settings);
    }
    settingsObj.addEventListener('submit', submitEvent);
    // Run the submit button once on init
    submitEvent();
  }

  // Mouse input
  canvas.addEventListener('mousemove', (e) => {
    pMaterial.uniforms.iMouse.value = getMousePosition(e, canvas);
  });

  // Rendering
  const render = (time: number) => {
    resizeRendererToDisplaySize(pRenderer);

    const canvas = pRenderer.domElement;
    pMaterial.uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
    pMaterial.uniforms.iTime.value = time * 0.001; // Time is in milliseconds
    iMaterial.uniforms.iResolution.value.set(settings.width, settings.height, 1);
    iMaterial.uniforms.iTime.value = time * 0.001; // Time is in milliseconds

    pRenderer.render(pScene, camera);

    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);
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

main();
