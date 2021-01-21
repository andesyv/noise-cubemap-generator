// Inspiration: https://threejsfundamentals.org/threejs/lessons/threejs-shadertoy.html
import * as Three from 'three';
import shaderCode from './shader.glsl';

const main = () => {
  const canvas = document.querySelector<HTMLCanvasElement>('#c');
  if (canvas == null) {
    return;
  }
  const renderer = new Three.WebGLRenderer({ canvas: canvas });
  renderer.autoClear = false;

  const camera = new Three.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  const scene = new Three.Scene();
  const plane = new Three.PlaneBufferGeometry(2, 2);
  const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: new Three.Vector3() },
  };
  const material = new Three.ShaderMaterial({
    fragmentShader: shaderCode,
    uniforms: uniforms,
  });
  scene.add(new Three.Mesh(plane, material));

  const render = (time: number) => {
    resizeRendererToDisplaySize(renderer);

    const canvas = renderer.domElement;
    uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
    uniforms.iTime.value = time * 0.001; // Time is in milliseconds

    renderer.render(scene, camera);

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

main();

const settings = document.querySelector<HTMLFormElement>('#settings');
if (settings)
  settings.addEventListener('submit', (e) => {
    console.log("Submit!");
  });
