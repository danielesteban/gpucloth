import { Joint, JointBuffer, Point, PointBuffers } from '../simulation/types';

export default () => {
  const points: Point[] = [];
  const joints: Joint[] = [];
  const length = 33;
  for (let j = 0, i = 0; j < 2; j++) {
    let o = i;
    let x = 64 * (j === 0 ? -1 : 1);
    for (i = 0; i < length; i++) {
      points.push({
        locked: i === length - 1,
        position: {
          x,
          y: i * 4 - 50,
        },
        size: 1.5 + Math.random() * 0.5,
        uv: {
          x: x / length,
          y: (i + 0.5) / length,
        },
      });
      if (i >= 3 && i < length - 1) {
        joints.push({
          enabled: true,
          a: o + i,
          b: o + i + 1,
          length: 4,
        });
      }
    }
    points[o + 2].position.x -= 4;
    points[o + 1].position.x += 4;
    [
      [3, 2],
      [3, 1],
      [2, 1],
      [2, 0],
      [1, 0],
    ].forEach(([a, b]) => joints.push({
      enabled: true,
      a: o + a,
      b: o + b,
      length: 8,
    }));
  }
  return {
    ...PointBuffers(points),
    joints: JointBuffer(joints),
    numJoints: joints.length,
    numPoints: points.length,
  };
}
