import { vec2 } from 'gl-matrix';
import Generate from './generate';
import ConstrainSimulation from './constrain';
import StepSimulation from './step';

class Simulation {
  private device: GPUDevice;
  private readonly count: number;
  private readonly initial: {
    joints: ArrayBuffer;
    points: ArrayBuffer;
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
    button: Uint32Array,
    delta: Float32Array,
    pointer: Float32Array,
    buffers: {
      cpu: ArrayBuffer,
      gpu: GPUBuffer,
    },
  };

  constructor(device: GPUDevice) {
    const { data, joints, numJoints, points, numPoints } = Generate();
    this.count = numPoints;
    this.device = device;
    this.initial = { joints, points };

    const buffer = (data: ArrayBuffer, usage: number) => {
      const buffer = device.createBuffer({
        mappedAtCreation: true,
        size: data.byteLength,
        usage,
      });
      new Uint32Array(buffer.getMappedRange()).set(new Uint32Array(data));
      buffer.unmap();
      return buffer;
    };

    this.data = buffer(
      data,
      GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX
    );
    this.joints = buffer(
      joints,
      GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
    );
    this.points = Array.from({ length: 2 }, () => buffer(
      points,
      GPUBufferUsage.COPY_DST
      | GPUBufferUsage.STORAGE
      | GPUBufferUsage.VERTEX
    ));

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
  
    this.pipelines = {
      constraint: new ConstrainSimulation(
        device,
        this.data,
        this.joints,
        numJoints,
        this.points,
        numPoints,
        this.uniforms.buffers.gpu
      ),
      step: new StepSimulation(
        device,
        this.data,
        this.points,
        numPoints,
        this.uniforms.buffers.gpu
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
    device.queue.writeBuffer(uniforms.buffers.gpu, 0, uniforms.buffers.cpu);

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
