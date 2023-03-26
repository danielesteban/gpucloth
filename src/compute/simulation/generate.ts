import { Data, DataBuffer, Joint, JointBuffer, Point, PointBuffer } from './types';

export default () => {
  const width = 33;
  const height = 33;
  const gap = 4;
  const data: Data[] = [];
  const points: Point[] = [];
  const joints: Joint[] = [];
  for (let i = 0, y = 0; y < height; y++) {
    for (let x = 0; x < width; x++, i++) {
      data.push({
        locked: y === height - 1 && (x % 8 === 0),
        size: 1.5 + Math.random() * 0.5,
        uv: {
          x: (x + 0.5) / width,
          y: (y + 0.5) / height,
        },
      });
      points.push({
        x: (x - width * 0.5 + 0.5) * gap * 1.125 + gap * (Math.random() - 0.25) * 0.125,
        y: (y - height * 0.5 + 0.5) * gap + gap * (Math.random() - 0.5) * 0.125,
      });
      if (x < width - 1) {
        joints.push({
          enabled: true,
          a: i,
          b: i + 1,
          length: 0,
        });
      }
      if (y > 0) {
        joints.push({
          enabled: true,
          a: i,
          b: i - width,
          length: 0,
        });
      }
    }
  }
  joints.forEach((joint) => {
    const a = points[joint.a];
    const b = points[joint.b];
    joint.length = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  });
  return {
    data: DataBuffer(data),
    joints: JointBuffer(joints),
    numJoints: joints.length,
    points: PointBuffer(points),
    numPoints: points.length,
  };
}
