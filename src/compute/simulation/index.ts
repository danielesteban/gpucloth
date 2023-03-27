import { vec2 } from 'gl-matrix';
import ConstrainSimulation from './constrain';
import StepSimulation from './step';

class Simulation {
  private buffers?: {
    data: GPUBuffer;
    joints: GPUBuffer;
    points: GPUBuffer[];
  };
  private count: number = 0;
  private device: GPUDevice;
  private initial?: {
    joints: ArrayBuffer;
    points: ArrayBuffer;
  };
  private pipelines?: {
    constraint: ConstrainSimulation,
    step: StepSimulation,
  };
  private step: number = 0;
  private readonly uniforms: {
    button: Uint32Array,
    delta: Float32Array,
    pointer: Float32Array,
    buffers: {
      cpu: ArrayBuffer,
      gpu: GPUBuffer,
    },
  };

  constructor(device: GPUDevice) {
    this.device = device;

    {
      const cpu = new ArrayBuffer(16);
      this.uniforms = {
        button: new Uint32Array(cpu, 0, 1),
        delta: new Float32Array(cpu, 4, 1),
        pointer: new Float32Array(cpu, 8, 2),
        buffers: {
          cpu,
          gpu: device.createBuffer({
            size: cpu.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
          }),
        },
      };
    }
  }

  compute(
    command: GPUCommandEncoder,
    delta: number,
    pointer: { button: number; position: vec2; }
  ) {
    const { device, pipelines, step, uniforms } = this;

    if (!pipelines) {
      return;
    }

    uniforms.delta[0] = delta;
    uniforms.button[0] = pointer.button;
    uniforms.pointer.set(pointer.position);
    device.queue.writeBuffer(uniforms.buffers.gpu, 0, uniforms.buffers.cpu);

    const pass = command.beginComputePass();
    pipelines.step.compute(pass, step);
    this.step = (this.step + 1) % 2;
    pipelines.constraint.compute(pass, this.step);
    pass.end();
  }

  load(
    { data, joints, numJoints, points, numPoints }: {
      data: ArrayBuffer;
      joints: ArrayBuffer;
      numJoints: number;
      points: ArrayBuffer;
      numPoints: number;
    }
  ) {
    const { device } = this;
    const createBuffer = (data: ArrayBuffer, usage: number) => {
      const buffer = device.createBuffer({
        mappedAtCreation: true,
        size: data.byteLength,
        usage,
      });
      new Uint32Array(buffer.getMappedRange()).set(new Uint32Array(data));
      buffer.unmap();
      return buffer;
    };

    if (this.buffers) {
      this.buffers.data.destroy();
      this.buffers.joints.destroy();
      this.buffers.points.forEach((buffer) => buffer.destroy());
    }
    this.buffers = {
      data: createBuffer(
        data,
        GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX
      ),
      joints: createBuffer(
        joints,
        GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
      ),
      points: Array.from({ length: 2 }, () => createBuffer(
        points,
        GPUBufferUsage.COPY_DST
        | GPUBufferUsage.STORAGE
        | GPUBufferUsage.VERTEX
      )),
    };
    this.count = numPoints;
    this.initial = { joints, points };
    this.pipelines = {
      constraint: new ConstrainSimulation(
        device,
        this.buffers.data,
        this.buffers.joints,
        numJoints,
        this.buffers.points,
        numPoints,
        this.uniforms.buffers.gpu
      ),
      step: new StepSimulation(
        device,
        this.buffers.data,
        this.buffers.points,
        numPoints,
        this.uniforms.buffers.gpu
      ),
    };
  }

  getInstances() {
    const { buffers, count, step } = this;
    if (!buffers) {
      throw new Error("Simulation is not loaded");
    }
    return {
      count,
      data: buffers.data,
      points: buffers.points[step],
    };
  }
  
  reset() {
    const { buffers, device, initial } = this;
    if (!buffers || !initial) {
      return;
    }
    device.queue.writeBuffer(buffers.joints, 0, initial.joints);
    buffers.points.forEach((buffer) => (
      device.queue.writeBuffer(buffer, 0, initial.points)
    ));
  }
}

export default Simulation;
