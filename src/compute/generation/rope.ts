import { Data, DataBuffer, Joint, JointBuffer, Point, PointBuffer } from '../simulation/types';

export default () => {
  const data: Data[] = [];
  const points: Point[] = [];
  const joints: Joint[] = [];
  const length = 33;
  for (let i = 0; i < length; i++) {
    data.push({
      locked: i === length - 1,
      size: 1.5 + Math.random() * 0.5,
      uv: {
        x: 0.5 / length,
        y: (i + 0.5) / length,
      },
    });
    points.push({
      x: 0,
      y: i * 4 - 64,
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
  points[2].x -= 4;
  points[1].x += 4;
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
    data: DataBuffer(data),
    joints: JointBuffer(joints),
    numJoints: joints.length,
    points: PointBuffer(points),
    numPoints: points.length,
  };
}
