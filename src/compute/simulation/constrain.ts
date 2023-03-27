import { Data, Joint, Lines } from './types';

const Compute = (numIterations: number, numPoints: number, numJoints: number) => /* wgsl */`
${Data}
${Joint}
${Lines()}

@group(0) @binding(0) var<storage, read> data: array<Data, ${numPoints}>;
@group(0) @binding(1) var<storage, read> joints: array<Joint, ${numJoints}>;
@group(0) @binding(2) var<storage, read_write> lines: Lines;
@group(1) @binding(0) var<storage, read_write> points: array<vec2<f32>, ${numPoints}>;

@compute @workgroup_size(1)
fn main() {
  lines.instanceCount = 0;
  for (var j: u32 = 0; j < ${numIterations}; j++) {
    for (var i: u32 = 0; i < ${numJoints}; i++) {
      var joint = joints[i];
      if (joint.enabled == 0) {
        continue;
      }
      var origin = (points[joint.a] + points[joint.b]) * 0.5;
      var edge = normalize(points[joint.a] - points[joint.b]) * joint.length * 0.5;
      if (data[joint.a].locked == 0) {
        points[joint.a] = origin + edge;
      }
      if (data[joint.b].locked == 0) {
        points[joint.b] = origin - edge;
      }
    }
  }
}
`;

class ConstrainSimulation {
  private readonly bindings: {
    data: GPUBindGroup,
    points: GPUBindGroup[],
  };
  private readonly pipeline: GPUComputePipeline;

  constructor(
    device: GPUDevice,
    data: GPUBuffer,
    joints: GPUBuffer,
    numJoints: number,
    lines: GPUBuffer,
    points: GPUBuffer[],
    numPoints: number
  ) {
    this.pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        entryPoint: 'main',
        module: device.createShaderModule({
          code: Compute(4, numPoints, numJoints),
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
          {
            binding: 1,
            resource: { buffer: joints },
          },
          {
            binding: 2,
            resource: { buffer: lines },
          },
        ],
      }),
      points: points.map((buffer) => device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(1),
        entries: [
          {
            binding: 0,
            resource: { buffer },
          },
        ],
      })),
    };
  }

  compute(pass: GPUComputePassEncoder, step: number) {
    const { bindings, pipeline } = this;
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindings.data);
    pass.setBindGroup(1, bindings.points[step]);
    pass.dispatchWorkgroups(1);
  }
}

export default ConstrainSimulation;
