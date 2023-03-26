import './main.css';
import Camera from './render/camera';
import Input from './compute/input';
import Renderer from './render/renderer';
import Points from './render/points';
import Simulation from './compute/simulation';

const Main = (device: GPUDevice) => {
  const camera = new Camera(device);
  const renderer = new Renderer(camera, device);
  const simulation = new Simulation(device);
  const dom = document.getElementById('app');
  if (!dom) {
    throw new Error("Couldn't get app DOM node");
  }
  dom.appendChild(renderer.getCanvas());
  renderer.setSize(window.innerWidth, window.innerHeight);
  window.addEventListener('keydown', ({ key, repeat }) => (
    !repeat && key === 'Escape' && simulation.reset()
  ));
  window.addEventListener('resize', () => (
    renderer.setSize(window.innerWidth, window.innerHeight)
  ));
  window.addEventListener('wheel', ({ deltaY }) => (
    camera.setZoom(Math.min(Math.max(camera.getZoom() * (1 + deltaY * 0.001), 200), 400))
  ));

  let animation: number;
  let clock = performance.now() / 1000;
  const input = new Input(renderer.getCanvas());
  const animate = () => {
    animation = requestAnimationFrame(animate);
    const time = performance.now() / 1000;
    const delta = Math.min(time - clock, 0.1);
    clock = time;

    const command = device.createCommandEncoder();
    simulation.compute(command, delta, input.getPointer(camera));
    renderer.render(command);
    device.queue.submit([command.finish()]);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      clock = performance.now() / 1000;
      animation = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animation);
    }
  });
  animation = requestAnimationFrame(animate);

  const points = new Points(camera, device, renderer.getFormat(), simulation);
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!e.dataTransfer) {
      return;
    }
    const [file] = e.dataTransfer.files;
    if (!file || file.type.indexOf('image/') !== 0) {
      return;
    }
    points.setTexture(file);
  });
  renderer.add(points);
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
