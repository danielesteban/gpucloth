import Camera from './camera';

class Renderer {
  private readonly animation: {
    clock: number;
    loop: (command: GPUCommandEncoder, delta: number, time: number) => void;
    request: number;
  };
  private readonly camera: Camera;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: GPUCanvasContext;
  private readonly descriptor: GPURenderPassDescriptor;
  private readonly device: GPUDevice;
  private readonly format: GPUTextureFormat;
  private readonly objects: { render: (pass: GPURenderPassEncoder) => void }[];
  private readonly samples: number = 4;
  private target: GPUTexture = undefined as unknown as GPUTexture;

  constructor(camera: Camera, device: GPUDevice) {
    this.camera = camera;
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('webgpu');
    if (!context) {
      throw new Error("Couldn't get GPUCanvasContext");
    }
    this.context = context;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ alphaMode: 'opaque', device, format: this.format });
    this.descriptor = {
      colorAttachments: [
        {
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
          view: undefined as unknown as GPUTextureView,
        },
      ],
    };
    this.device = device;
    this.objects = [];

    this.animate = this.animate.bind(this);
    this.animation = {
      clock: performance.now() / 1000,
      loop: () => {},
      request: requestAnimationFrame(this.animate),
    };
    this.visibilitychange = this.visibilitychange.bind(this);
    document.addEventListener('visibilitychange', this.visibilitychange);
  }

  add(object: { render: (pass: GPURenderPassEncoder) => void }) {
    this.objects.push(object);
  }

  getCanvas() {
    return this.canvas;
  }

  getFormat() {
    return this.format;
  }

  getSamples() {
    return this.samples;
  }

  setAnimationLoop(loop: (command: GPUCommandEncoder, delta: number, time: number) => void) {
    this.animation.loop = loop;
  }

  setSize(width: number, height: number) {
    const {
      camera,
      canvas,
      descriptor: { colorAttachments: [color] },
      device,
      format,
      samples,
      target,
    } = this;
    const pixelRatio = window.devicePixelRatio || 1;
    const size = [Math.floor(width * pixelRatio), Math.floor(height * pixelRatio)];
    canvas.width = size[0];
    canvas.height = size[1];
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    camera.setAspect(width / height);
    if (target) {
      target.destroy();
    }
    this.target = device.createTexture({
      format,
      sampleCount: samples,
      size,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    color!.view = this.target.createView();
  }

  private animate() {
    const { animation, device } = this;
    const time = performance.now() / 1000;
    const delta = Math.min(time - animation.clock, 0.1);
    animation.clock = time;
    animation.request = requestAnimationFrame(this.animate);

    const command = device.createCommandEncoder();
    animation.loop(command, delta, time);
    this.render(command);
    device.queue.submit([command.finish()]);
  }

  private render(command: GPUCommandEncoder) {
    const {
      context,
      descriptor,
      objects,
    } = this;
    const { colorAttachments: [color] } = descriptor;
    color!.resolveTarget = context.getCurrentTexture().createView();
    const pass = command.beginRenderPass(descriptor);
    objects.forEach((object) => object.render(pass));
    pass.end();
  }

  private visibilitychange() {
    const { animation } = this;
    cancelAnimationFrame(animation.request);
    if (document.visibilityState === 'visible') {
      animation.clock = performance.now() / 1000;
      animation.request = requestAnimationFrame(this.animate);
    }
  }
}

export default Renderer;
