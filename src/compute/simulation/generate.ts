export default () => {
  const width = 33;
  const height = 33;
  const gap = 4;
  const locked = new Float32Array(new Uint32Array([1]).buffer)[0];
  const d: number[] = [];
  const p: number[] = [];
  const j: number[] = [];
  for (let i = 0, y = 0; y < height; y++) {
    for (let x = 0; x < width; x++, i++) {
      d.push(
        y === height - 1 && (x % 8 === 0) ? locked : 0,
        1.5 + Math.random() * 0.5,
        (x + 0.5) / width,
        (y + 0.5) / height
      );
      p.push(
        (x - width * 0.5 + 0.5) * gap * 1.125 + gap * (Math.random() - 0.25) * 0.125,
        (y - height * 0.5 + 0.5) * gap + gap * (Math.random() - 0.5) * 0.125
      );
      if (x < width - 1) {
        j.push(
          1, i, i + 1, 0
        );
      }
      if (y > 0) {
        j.push(
          1, i, i - width, 0
        );
      }
    }
  }
  for (let i = 0, l = j.length; i < l; i += 4) {
    const ax = p[j[i + 1] * 2];
    const ay = p[j[i + 1] * 2 + 1];
    const bx = p[j[i + 2] * 2];
    const by = p[j[i + 2] * 2 + 1];
    j[i + 3] = new Uint32Array(new Float32Array([Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)]).buffer)[0];
  }
  return {
    data: new Float32Array(d),
    joints: new Uint32Array(j),
    numJoints: j.length / 4,
    points: new Float32Array(p),
    numPoints: p.length / 2,
  };
}
