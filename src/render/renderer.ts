import Camera from './camera';

class Renderer {
  private readonly camera: Camera;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: GPUCanvasContext;
  private readonly descriptor: GPURenderPassDescriptor;
  private readonly format: GPUTextureFormat;
  private readonly scene: { render: (pass: GPURenderPassEncoder) => void }[];

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
    this.scene = [];
  }

  add(object: { render: (pass: GPURenderPassEncoder) => void }) {
    this.scene.push(object);
  }

  getCanvas() {
    return this.canvas;
  }

  getFormat() {
    return this.format;
  }

  setSize(width: number, height: number) {
    const {
      camera,
      canvas,
    } = this;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    camera.setAspect(width / height);
  }

  render(command: GPUCommandEncoder) {
    const {
      context,
      descriptor,
      scene,
    } = this;
    const { colorAttachments: [color] } = descriptor;
    if (color) {
      color.view = context.getCurrentTexture().createView();
    }
    const pass = command.beginRenderPass(descriptor);
    scene.forEach((object) => object.render(pass));
    pass.end();
  }
}

export default Renderer;
