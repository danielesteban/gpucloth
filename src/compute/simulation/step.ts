const Compute = (numPoints: number) => /* wgsl */`
struct Data {
  locked: f32,
  rest: array<f32, 3>,
}

struct Uniforms {
  pointer: vec2<f32>,
  delta: f32,
}

@group(0) @binding(0) var<storage, read> data: array<Data, ${numPoints}>;
@group(1) @binding(0) var<storage, read> input: array<vec2<f32>, ${numPoints}>;
@group(1) @binding(1) var<storage, read_write> output: array<vec2<f32>, ${numPoints}>;
@group(2) @binding(0) var<uniform> uniforms: Uniforms;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let index : u32 = id.x;
  if (index >= ${numPoints}) {
    return;
  }
  var point = input[index];
  if (data[index].locked == 0) {
    point += point - output[index];
    point += vec2<f32>(0, -8) * uniforms.delta;

    var d = point - uniforms.pointer;
    if (length(d) < 16) {
      point += d * 4 * uniforms.delta;
    }
  }
  output[index] = point;
}
`;

class StepSimulation {
  private readonly bindings: {
    data: GPUBindGroup,
    points: GPUBindGroup[],
    uniforms: GPUBindGroup,
  };
  private readonly pipeline: GPUComputePipeline;
  private readonly workgroups: number;

  constructor(
    device: GPUDevice,
    data: GPUBuffer,
    points: GPUBuffer[],
    numPoints: number,
    uniforms: GPUBuffer
  ) {
    this.pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        entryPoint: 'main',
        module: device.createShaderModule({
          code: Compute(numPoints),
        }),
      },
    });
    this.bindings = {
      data: device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: data },
          },
        ],
      }),
      points: points.map((buffer, i) => device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(1),
        entries: [
          {
            binding: 0,
            resource: { buffer },
          },
          {
            binding: 1,
            resource: { buffer: points[(i + 1) % 2] },
          },
        ],
      })),
      uniforms: device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(2),
        entries: [
          {
            binding: 0,
            resource: { buffer: uniforms },
          },
        ],
      }),
    };
    this.workgroups = Math.ceil(numPoints / 256);
  }

  compute(pass: GPUComputePassEncoder, step: number) {
    const { bindings, pipeline, workgroups } = this;
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindings.data);
    pass.setBindGroup(1, bindings.points[step]);
    pass.setBindGroup(2, bindings.uniforms);
    pass.dispatchWorkgroups(workgroups);
  }
}

export default StepSimulation;
