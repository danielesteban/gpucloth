import { Joint, Line, Uniforms } from './types';

const Compute = (numPoints: number, numJoints: number) => /* wgsl */`
${Joint}
${Line(true)}
${Uniforms}

@group(0) @binding(0) var<storage, read_write> joints: array<Joint, ${numJoints}>;
@group(0) @binding(1) var<storage, read_write> lines: Lines;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;
@group(1) @binding(0) var<storage, read> points: array<vec2<f32>, ${numPoints}>;

fn sdSegment(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
  var pa: vec2<f32> = p-a;
  var ba: vec2<f32> = b-a;
  var h: f32 = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
  return length(pa - ba*h);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let index: u32 = id.x;
  if (index >= ${numJoints}) {
    return;
  }
  var joint = joints[index];
  if (joint.enabled == 0) {
    return;
  }
  if (uniforms.button == 2) {
    if (
      sdSegment(uniforms.pointer, points[joint.a], points[joint.b]) <= uniforms.radius * 0.25
    ) {
      joints[index].enabled = 0;
      return;
    }
  }

  var origin = (points[joint.a] + points[joint.b]) * 0.5;
  var line = points[joint.a] - points[joint.b];
  var direction = normalize(line);
  var rotation = atan2(direction.x, direction.y);
  var size = length(line);
  
  var instance = atomicAdd(&lines.instanceCount, 1);
  lines.data[instance].position = origin;
  lines.data[instance].rotation = rotation;
  lines.data[instance].size = size;
}
`;

class ComputeLines {
  private readonly bindings: {
    data: GPUBindGroup,
    points: GPUBindGroup[],
  };
  private readonly pipeline: GPUComputePipeline;
  private readonly workgroups: number;

  constructor(
    device: GPUDevice,
    joints: GPUBuffer,
    numJoints: number,
    lines: GPUBuffer,
    points: GPUBuffer[],
    numPoints: number,
    uniforms: GPUBuffer
  ) {
    this.pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        entryPoint: 'main',
        module: device.createShaderModule({
          code: Compute(numPoints, numJoints),
        }),
      },
    });
    this.bindings = {
      data: device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: joints },
          },
          {
            binding: 1,
            resource: { buffer: lines },
          },
          {
            binding: 2,
            resource: { buffer: uniforms },
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
    this.workgroups = Math.ceil(numJoints / 256);
  }

  compute(pass: GPUComputePassEncoder, step: number) {
    const { bindings, pipeline, workgroups } = this;
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindings.data);
    pass.setBindGroup(1, bindings.points[step]);
    pass.dispatchWorkgroups(workgroups);
  }
}

export default ComputeLines;
