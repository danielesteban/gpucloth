import './main.css';
import Camera from './render/camera';
import Input from './compute/input';
import Lines from './render/lines';
import Points from './render/points';
import Renderer from './render/renderer';
import Simulation from './compute/simulation';
import { Cloth, Rope } from './compute/generation';

const Main = (device: GPUDevice) => {
  const camera = new Camera(device);
  const renderer = new Renderer(camera, device);
  const input = new Input(renderer.getCanvas());
  const simulation = new Simulation(device);
  const dom = document.getElementById('app');
  if (!dom) {
    throw new Error("Couldn't get app DOM node");
  }
  dom.appendChild(renderer.getCanvas());
  renderer.setAnimationLoop((command, delta) => (
    simulation.compute(command, delta, input.getPointer(camera))
  ));
  renderer.setSize(window.innerWidth, window.innerHeight);
  simulation.load(Cloth());

  const lines = new Lines(camera, device, renderer.getFormat(), simulation);
  renderer.add(lines);

  const points = new Points(camera, device, renderer.getFormat(), simulation);
  renderer.add(points);

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const [file] = e.dataTransfer?.files || [];
    if (file && file.type.indexOf('image/') === 0) {
      points.setTexture(file);
    }
  });
  window.addEventListener('keydown', ({ key, repeat }) => {
    if (repeat) {
      return;
    }
    switch (key) {
      case 'Escape':
        simulation.reset()
        break;
      case '1':
        simulation.load(Cloth());
        break;
      case '2':
        simulation.load(Rope());
        break;
    }
  });
  window.addEventListener('resize', () => (
    renderer.setSize(window.innerWidth, window.innerHeight)
  ));
  window.addEventListener('wheel', ({ deltaY }) => (
    camera.setZoom(Math.min(Math.max(camera.getZoom() * (1 + deltaY * 0.001), 200), 400))
  ));
};

const GPU = async () => {
  if (!navigator.gpu) {
    throw new Error('WebGPU support');
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("Couldn't get WebGPU adapter");
  }
  const device = await adapter.requestDevice();
  if (!device) {
    throw new Error("Couldn't get WebGPU device");
  }
  return device;
};

const prevent = (e: DragEvent | MouseEvent | TouchEvent) => e.preventDefault();
window.addEventListener('contextmenu', prevent);
window.addEventListener('dragenter', prevent);
window.addEventListener('dragover', prevent);
window.addEventListener('touchstart', prevent);

GPU().then(Main);
