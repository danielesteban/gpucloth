import { vec2 } from 'gl-matrix';
import Generate from './generate';
import ConstrainSimulation from './constrain';
import StepSimulation from './step';

class Simulation {
  private device: GPUDevice;
  private readonly count: number;
  private readonly data: GPUBuffer;
  private readonly points: GPUBuffer[];
  private readonly joints: GPUBuffer;
  private readonly pipelines: {
    constraint: ConstrainSimulation,
    step: StepSimulation,
  };
  private step: number = 0;
  private readonly uniforms: {
    buffer: GPUBuffer,
    data: Float32Array,
    delta: Float32Array,
    pointer: Float32Array,
  };

  constructor(device: GPUDevice) {
    this.device = device;
    const { data, points, joints } = Generate();
    const numPoints = points.length / 2;
    const numJoints = joints.length / 3;
    this.count = numPoints;

    this.data = device.createBuffer({
      mappedAtCreation: true,
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
    });
    new Float32Array(this.data.getMappedRange()).set(data);
    this.data.unmap();

    this.points = Array.from({ length: 2 }, () => {
      const buffer = device.createBuffer({
        mappedAtCreation: true,
        size: points.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
      });
      new Float32Array(buffer.getMappedRange()).set(points);
      buffer.unmap();
      return buffer;
    });
   
    this.joints = device.createBuffer({
      mappedAtCreation: true,
      size: joints.byteLength,
      usage: GPUBufferUsage.STORAGE,
    });
    new Uint32Array(this.joints.getMappedRange()).set(joints);
    this.joints.unmap();

    {
      const data = new Float32Array(4);
      this.uniforms = {
        buffer: device.createBuffer({
          size: data.byteLength,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        }),
        data,
        pointer: data.subarray(0, 2),
        delta: data.subarray(2, 3),
      };
    }
  
    this.pipelines = {
      constraint: new ConstrainSimulation(device, this.data, this.joints, numJoints, this.points, numPoints),
      step: new StepSimulation(device, this.data, this.points, numPoints, this.uniforms.buffer),
    };
  }

  getInstances() {
    return { data: this.data, points: this.points[this.step], count: this.count };
  }

  compute(command: GPUCommandEncoder, delta: number, pointer: vec2) {
    const { device, pipelines, step, uniforms } = this;

    uniforms.delta[0] = delta;
    uniforms.pointer.set(pointer);
    device.queue.writeBuffer(uniforms.buffer, 0, uniforms.data);

    const pass = command.beginComputePass();
    pipelines.step.compute(pass, step);
    this.step = (this.step + 1) % 2;
    pipelines.constraint.compute(pass, this.step);
    pass.end();
  }
}

export default Simulation;
