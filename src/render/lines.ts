import Camera from './camera';
import { Plane } from './geometry';
import Simulation from '../compute/simulation';

const Vertex = /* wgsl */`
struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) iposition: vec2<f32>,
  @location(3) irotation: f32,
  @location(4) isize: f32,
}
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
}

@group(0) @binding(0) var<uniform> camera: mat4x4<f32>;

fn rotate(rad: f32) -> mat2x2<f32> {
  var c: f32 = cos(rad);
  var s: f32 = sin(rad);
  return mat2x2<f32>(c, s, -s, c);
}

@vertex
fn main(vertex: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.position = camera * vec4<f32>(vertex.position * vec2<f32>(1, vertex.isize) * rotate(vertex.irotation) + vertex.iposition, 0, 1);
  return out;
}
`;

const Fragment = /* wgsl */`
@fragment
fn main() -> @location(0) vec4<f32> {
  return vec4<f32>(vec3(0.125), 1);
}
`;

class Lines {
  private readonly bindings: GPUBindGroup;
  private readonly geometry: GPUBuffer;
  private readonly pipeline: GPURenderPipeline;
  private readonly simulation: Simulation;

  constructor(
    camera: Camera,
    device: GPUDevice,
    format: GPUTextureFormat,
    samples: number,
    simulation: Simulation,
  ) {
    this.geometry = Plane(device);
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
                offset: 0,
                format: 'float32x2',
              },
              {
                shaderLocation: 3,
                offset: 2 * Float32Array.BYTES_PER_ELEMENT,
                format: 'float32',
              },
              {
                shaderLocation: 4,
                offset: 3 * Float32Array.BYTES_PER_ELEMENT,
                format: 'float32',
              },
            ],
          },
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
        targets: [{ format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
      multisample: {
        count: samples,
      },
    });
    this.bindings = device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: camera.getBuffer() },
        },
      ],
    });
    this.simulation = simulation;
  }

  render(pass: GPURenderPassEncoder) {
    const { bindings, geometry, pipeline, simulation } = this;
    const { lines } = simulation.getBuffers();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindings);
    pass.setVertexBuffer(0, geometry);
    pass.setVertexBuffer(1, lines, 16);
    pass.drawIndirect(lines, 0);
  }
}

export default Lines;
