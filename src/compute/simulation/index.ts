import { vec2 } from 'gl-matrix';
import Generate from './generate';
import ConstrainSimulation from './constrain';
import StepSimulation from './step';

class Simulation {
  private device: GPUDevice;
  private readonly count: number;
  private readonly initial: {
    joints: Uint32Array;
    points: Float32Array;
  };
  private readonly data: GPUBuffer;
  private readonly joints: GPUBuffer;
  private readonly points: GPUBuffer[];
  private readonly pipelines: {
    constraint: ConstrainSimulation,
    step: StepSimulation,
  };
  private step: number = 0;
  private readonly uniforms: {
    buffer: GPUBuffer,
    data: Float32Array,
    button: Uint32Array,
    delta: Float32Array,
    pointer: Float32Array,
  };

  constructor(device: GPUDevice) {
    const { data, joints, numJoints, points, numPoints } = Generate();
    this.count = numPoints;
    this.device = device;
    this.initial = { joints, points };

    this.data = device.createBuffer({
      mappedAtCreation: true,
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
    });
    new Float32Array(this.data.getMappedRange()).set(data);
    this.data.unmap();
   
    this.joints = device.createBuffer({
      mappedAtCreation: true,
      size: joints.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
    });
    new Uint32Array(this.joints.getMappedRange()).set(joints);
    this.joints.unmap();

    this.points = Array.from({ length: 2 }, () => {
      const buffer = device.createBuffer({
        mappedAtCreation: true,
        size: points.byteLength,
        usage: (
          GPUBufferUsage.COPY_DST
          | GPUBufferUsage.STORAGE
          | GPUBufferUsage.VERTEX
        ),
      });
      new Float32Array(buffer.getMappedRange()).set(points);
      buffer.unmap();
      return buffer;
    });

    {
      const data = new Float32Array(4);
      this.uniforms = {
        buffer: device.createBuffer({
          size: data.byteLength,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        }),
        data,
        button: new Uint32Array(data.buffer, 0, 1),
        delta: data.subarray(1, 2),
        pointer: data.subarray(2, 4),
      };
    }
  
    this.pipelines = {
      constraint: new ConstrainSimulation(
        device, this.data, this.joints, numJoints, this.points, numPoints, this.uniforms.buffer
      ),
      step: new StepSimulation(
        device, this.data, this.points, numPoints, this.uniforms.buffer
      ),
    };
  }

  getInstances() {
    return {
      count: this.count,
      data: this.data,
      points: this.points[this.step],
    };
  }

  compute(
    command: GPUCommandEncoder,
    delta: number,
    pointer: { button: number; position: vec2; }
  ) {
    const { device, pipelines, step, uniforms } = this;

    uniforms.delta[0] = delta;
    uniforms.button[0] = pointer.button;
    uniforms.pointer.set(pointer.position);
    device.queue.writeBuffer(uniforms.buffer, 0, uniforms.data);

    const pass = command.beginComputePass();
    pipelines.step.compute(pass, step);
    this.step = (this.step + 1) % 2;
    pipelines.constraint.compute(pass, this.step);
    pass.end();
  }
  
  reset() {
    const { device, initial, joints, points } = this;
    device.queue.writeBuffer(joints, 0, initial.joints);
    points.forEach((buffer) => (
      device.queue.writeBuffer(buffer, 0, initial.points)
    ));
  }
}

export default Simulation;
