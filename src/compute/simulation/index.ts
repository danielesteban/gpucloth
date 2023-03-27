import ConstrainSimulation from './constrain';
import ComputeLines from './lines';
import StepSimulation from './step';
import { LineBuffer, UniformsBuffer } from './types';

class Simulation {
  private buffers?: {
    data: GPUBuffer;
    joints: GPUBuffer;
    lines: GPUBuffer;
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
    lines: ComputeLines,
    step: StepSimulation,
  };
  private step: number = 0;
  private readonly uniforms: UniformsBuffer;

  constructor(device: GPUDevice) {
    this.device = device;
    this.uniforms = new UniformsBuffer(device);
  }

  compute(
    command: GPUCommandEncoder,
    delta: number,
    pointer: { button: number; position: [number, number] | Float32Array; },
    radius: number
  ) {
    const { buffers, pipelines, step, uniforms } = this;

    if (!buffers || !pipelines) {
      return;
    }

    uniforms.delta = delta;
    uniforms.button = pointer.button;
    uniforms.pointer = pointer.position;
    uniforms.radius = radius;
    uniforms.update();

    const pass = command.beginComputePass();
    pipelines.step.compute(pass, step);
    this.step = (this.step + 1) % 2;
    pipelines.constraint.compute(pass, this.step);
    pipelines.lines.compute(pass, this.step);
    pass.end();
  }

  getBuffers() {
    const { buffers, count, step } = this;
    if (!buffers) {
      throw new Error("Simulation is not loaded");
    }
    return {
      count,
      data: buffers.data,
      lines: buffers.lines,
      points: buffers.points[step],
    };
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
      this.buffers.lines.destroy();
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
      lines: LineBuffer(device, numJoints),
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
        this.buffers.lines,
        this.buffers.points,
        numPoints
      ),
      lines: new ComputeLines(
        device,
        this.buffers.joints,
        numJoints,
        this.buffers.lines,
        this.buffers.points,
        numPoints,
        this.uniforms.getBuffer()
      ),
      step: new StepSimulation(
        device,
        this.buffers.data,
        this.buffers.points,
        numPoints,
        this.uniforms.getBuffer()
      ),
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
