export const Plane = (device: GPUDevice, width: number = 1, height: number = 1) => {
  const buffer = device.createBuffer({
    mappedAtCreation: true,
    size: 24 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.VERTEX,
  });
  new Float32Array(buffer.getMappedRange()).set([
    width * -0.5, height *  0.5,     0, 1,
    width *  0.5, height *  0.5,     1, 1,
    width *  0.5, height * -0.5,     1, 0,
    width *  0.5, height * -0.5,     1, 0,
    width * -0.5, height * -0.5,     0, 0,
    width * -0.5, height *  0.5,     0, 1,
  ]);
  buffer.unmap();
  return buffer;
};
