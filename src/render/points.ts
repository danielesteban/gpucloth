import Camera from './camera';
import Plane from './plane';
import Simulation from '../compute/simulation';

const Vertex = /* wgsl */`
struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) isize: f32,
  @location(3) iuv: vec2<f32>,
  @location(4) iposition: vec2<f32>,
}
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>,
  @location(1) uv2 : vec2<f32>,
  @location(2) size : f32,
}

@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;

@vertex
fn main(vertex: VertexInput) -> VertexOutput {
  var out : VertexOutput;
  out.position = camera * vec4<f32>(vertex.position * vertex.isize + vertex.iposition, 0, 1);
  out.uv = (vertex.uv - 0.5) * 2;
  out.uv2 = vertex.iuv;
  out.size = vertex.isize;
  return out;
}
`;

const Fragment = /* wgsl */`
struct FragmentInput {
  @location(0) uv: vec2<f32>,
  @location(1) uv2: vec2<f32>,
  @location(2) size: f32,
}

@group(0) @binding(1) var texture: texture_2d<f32>;
@group(0) @binding(2) var textureSampler: sampler;

fn linearTosRGB(linear: vec3<f32>) -> vec3<f32> {
  if (all(linear <= vec3<f32>(0.0031308))) {
    return linear * 12.92;
  }
  return (pow(abs(linear), vec3<f32>(1.0/2.4)) * 1.055) - vec3<f32>(0.055);
}

@fragment
fn main(fragment: FragmentInput) -> @location(0) vec4<f32> {
  let l = min(length(fragment.uv), 1);
  var uv = fragment.uv2 + (fragment.uv / fragment.size / 33);
  return vec4<f32>(linearTosRGB(
    textureSample(texture, textureSampler, uv).xyz + smoothstep(0.5, 1, l) * 0.1
  ), smoothstep(1, 0.8, l));
}
`;

class Points {
  private readonly bindings: GPUBindGroup;
  private readonly device: GPUDevice;
  private readonly geometry: GPUBuffer;
  private readonly pipeline: GPURenderPipeline;
  private readonly simulation: Simulation;
  private readonly texture: GPUTexture;

  constructor(
    camera: Camera,
    device: GPUDevice,
    format: GPUTextureFormat,
    simulation: Simulation,
  ) {
    this.device = device;
    this.geometry = Plane(device, 2, 2);
    this.pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        buffers: [
          {
            arrayStride: 4 * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: 'float32x2',
              },
              {
                shaderLocation: 1,
                offset: 2 * Float32Array.BYTES_PER_ELEMENT,
                format: 'float32x2',
              },
            ],
          },
          {
            arrayStride: 4 * Float32Array.BYTES_PER_ELEMENT,
            stepMode: 'instance',
            attributes: [
              {
                shaderLocation: 2,
                offset: 1 * Float32Array.BYTES_PER_ELEMENT,
                format: 'float32',
              },
              {
                shaderLocation: 3,
                offset: 2 * Float32Array.BYTES_PER_ELEMENT,
                format: 'float32x2',
              },
            ],
          },
          {
            arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
            stepMode: 'instance',
            attributes: [
              {
                shaderLocation: 4,
                offset: 0,
                format: 'float32x2',
              },
            ],
          }
        ],
        entryPoint: 'main',
        module: device.createShaderModule({
          code: Vertex,
        }),
      },
      fragment: {
        entryPoint: 'main',
        module: device.createShaderModule({
          code: Fragment,
        }),
        targets: [{
          format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
    this.texture = device.createTexture({
      dimension: '2d',
      format: 'rgba8unorm-srgb',
      size: [512, 512],
      usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.bindings = device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: camera.getBuffer() },
        },
        {
          binding: 1,
          resource: this.texture.createView(),
        },
        {
          binding: 2,
          resource: device.createSampler({ minFilter: 'linear', magFilter: 'linear' }),
        },
      ],
    });
    this.simulation = simulation;
    this.generateDefaultTexture();
  }

  render(pass: GPURenderPassEncoder) {
    const { bindings, geometry, pipeline, simulation } = this;
    const { count, data, points } = simulation.getBuffers();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindings);
    pass.setVertexBuffer(0, geometry);
    pass.setVertexBuffer(1, data);
    pass.setVertexBuffer(2, points);
    pass.draw(6, count, 0, 0);
  }

  setTexture(file: Blob) {
    const image = new Image();
    image.addEventListener('load', () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Couldn't get 2d context");
      }
      let x = 0;
      let y = 0;
      let w = canvas.width = 512;
      let h = canvas.height = 512;
      if (image.width / image.height > w / h) {
        w = image.width * canvas.height / image.height;
        x = (canvas.width - w) * 0.5;
      } else {
        h = image.height * canvas.width / image.width;
        y = (canvas.height - h) * 0.5;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, 0, 0, image.width, image.height, x, y, w, h);
      this.updateTexture(canvas);
    });
    image.src = URL.createObjectURL(file);
  }

  private generateDefaultTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error("Couldn't get 2d context");
    }
    canvas.width = canvas.height = 512;
    for (let i = 0; i < 256; i++) {
      ctx.fillStyle = `hsl(${360 * Math.random()},${20 + 40 * Math.random()}%,${20 + 40 * Math.random()}%)`;
      ctx.beginPath();
      ctx.arc(canvas.width * Math.random(), canvas.height * Math.random(), 16 + Math.random() * 64, 0, Math.PI * 2);
      ctx.fill();
    }
    this.updateTexture(canvas);
  }

  private async updateTexture(canvas: HTMLCanvasElement) {
    const { device, texture } = this;
    const source = await createImageBitmap(canvas)
    device.queue.copyExternalImageToTexture({ source, flipY: true }, { texture }, [512, 512]);
  }
}

export default Points;
