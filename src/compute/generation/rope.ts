import { Joint, JointBuffer, Point, PointBuffers } from '../simulation/types';

export default () => {
  const points: Point[] = [];
  const joints: Joint[] = [];
  const length = 33;
  for (let i = 0; i < length; i++) {
    points.push({
      locked: i === length - 1,
      position: {
        x: 0,
        y: i * 4 - 64,
      },
      size: 1.5 + Math.random() * 0.5,
      uv: {
        x: 0.5 / length,
        y: (i + 0.5) / length,
      },
    });
    if (i >= 3 && i < length - 1) {
      joints.push({
        enabled: true,
        a: i,
        b: i + 1,
        length: 4,
      });
    }
  }
  points[2].position.x -= 4;
  points[1].position.x += 4;
  [
    [3, 2],
    [3, 1],
    [2, 1],
    [2, 0],
    [1, 0],
  ].forEach(([a, b]) => joints.push({
    enabled: true,
    a,
    b,
    length: 8,
  }));
  return {
    ...PointBuffers(points),
    joints: JointBuffer(joints),
    numJoints: joints.length,
    numPoints: points.length,
  };
}
