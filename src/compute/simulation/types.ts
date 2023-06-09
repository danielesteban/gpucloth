export const Data = /* wgsl */`
struct Data {
  locked: u32,
  size: f32,
  uv: vec2<f32>,
}
`;

export type Point = {
  locked: boolean;
  position: { x: number; y: number; };
  size: number;
  uv: { x: number, y: number };
};

export const PointBuffers = (values: Point[]) => {
  const data = new ArrayBuffer(values.length * 16);
  const points = new ArrayBuffer(values.length * 8);
  values.forEach(({ locked, position, size, uv }, i) => {
    const o = i * 16;
    new Uint32Array(data, o, 1)[0] = locked ? 1 : 0;
    new Float32Array(data, o + 4, 1)[0] = size;
    new Float32Array(data, o + 8, 2).set([uv.x, uv.y]);
    new Float32Array(points, i * 8, 2).set([position.x, position.y]);
  });
  return { data, points };
};

export const Joint = /* wgsl */`
struct Joint {
  enabled: u32,
  a: u32,
  b: u32,
  length: f32,
}
`;

export type Joint = {
  enabled: boolean;
  a: number;
  b: number;
  length: number;
};

export const JointBuffer = (data: Joint[]) => {
  const buffer = new ArrayBuffer(data.length * 16);
  data.forEach(({ enabled, a, b, length }, i) => {
    const o = i * 16;
    new Uint32Array(buffer, o, 1)[0] = enabled ? 1 : 0;
    new Uint32Array(buffer, o + 4, 1)[0] = a;
    new Uint32Array(buffer, o + 8, 1)[0] = b;
    new Float32Array(buffer, o + 12, 1)[0] = length;
  });
  return buffer;
};

export const Line = (atomicCount: boolean = false) => /* wgsl */`
struct Line {
  position: vec2<f32>,
  rotation: f32,
  size: f32,
}
struct Lines {
  vertexCount: u32,
  instanceCount: ${atomicCount ? 'atomic<u32>' : 'u32'},
  firstVertex: u32,
  firstInstance: u32,
  data: array<Line>,
}
`;

export const LineBuffer = (device: GPUDevice, numJoints: number) => {
  const buffer = device.createBuffer({
    mappedAtCreation: true,
    size: 16 + numJoints * 16,
    usage: (
      GPUBufferUsage.COPY_DST
      | GPUBufferUsage.INDIRECT
      | GPUBufferUsage.STORAGE
      | GPUBufferUsage.VERTEX
    ),
  });
  new Uint32Array(buffer.getMappedRange(0, 4)).set(new Uint32Array([6]));
  buffer.unmap();
  return buffer;
};

export const Uniforms = /* wgsl */`
struct Uniforms {
  button: u32,
  delta: f32,
  pointer: vec2<f32>,
  radius: f32,
}
`;

export class UniformsBuffer {
  private readonly buffers: {
    cpu: ArrayBuffer,
    gpu: GPUBuffer,
  };
  private readonly device: GPUDevice;

  constructor(device: GPUDevice) {
    const buffer = new ArrayBuffer(24);
    this.buffers = {
      cpu: buffer,
      gpu: device.createBuffer({
        size: buffer.byteLength,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
      }),
    };
    this.device = device;
  }

  getBuffer() {
    return this.buffers.gpu;
  }

  set button(value: number) {
    new Uint32Array(this.buffers.cpu, 0, 1)[0] = value;
  }

  set delta(value: number) {
    new Float32Array(this.buffers.cpu, 4, 1)[0] = value;
  }

  set pointer(value: [number, number] | Float32Array) {
    new Float32Array(this.buffers.cpu, 8, 2).set(value);
  }

  set radius(value: number) {
    new Float32Array(this.buffers.cpu, 16, 1)[0] = value;
  }

  update() {
    this.device.queue.writeBuffer(this.buffers.gpu, 0, this.buffers.cpu);
  }
}
