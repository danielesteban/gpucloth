import { mat4, vec2 } from 'gl-matrix';

class Camera {
  private readonly device: GPUDevice;
  private readonly buffer: GPUBuffer;
  private aspect: number;
  private near: number;
  private far: number;
  private zoom: number;
  private readonly matrix: mat4;
  private readonly matrixInverse: mat4;
  private readonly position: vec2;

  constructor(device: GPUDevice) {
    this.aspect = 1;
    this.near = -100;
    this.far = 100;
    this.zoom = 200;
    this.position = vec2.fromValues(0, -16);

    this.matrix = mat4.create();
    this.matrixInverse = mat4.create();

    this.device = device;
    this.buffer = device.createBuffer({
      size: (this.matrix as Float32Array).byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
  }

  getBuffer() {
    return this.buffer;
  }

  getMatrixInverse() {
    return this.matrixInverse;
  }

  setAspect(aspect: number) {
    this.aspect = aspect;
    this.update();
  }

  private update() {
    const {
      device, buffer,
      matrix, matrixInverse,
      aspect, near, far, zoom, position,
    } = this;
    const x = zoom * aspect * 0.5;
    const y = zoom * 0.5;
    mat4.ortho(
      matrix,
      position[0] - x, position[0] + x,
      position[1] - y, position[1] + y,
      near, far
    );
    mat4.invert(matrixInverse, matrix);
    device.queue.writeBuffer(buffer, 0, matrix as Float32Array);
  }
}

export default Camera;
