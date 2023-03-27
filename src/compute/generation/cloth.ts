import { Joint, JointBuffer, Point, PointBuffers } from '../simulation/types';

export default (variant: number = 0) => {
  const width = 33;
  const height = 33;
  const gap = 4;
  const points: Point[] = [];
  const joints: Joint[] = [];
  for (let i = 0, y = 0; y < height; y++) {
    for (let x = 0; x < width; x++, i++) {
      points.push({
        locked: variant === 1 ? (
          ((y === 0 || y === height - 1) && (x % 8 === 0))
          || ((x === 0 || x === width - 1) && (y % 8 === 0))
        ) : (
          y === height - 1 && (x % 8 === 0)
        ),
        position: {
          x: (x - width * 0.5 + 0.5) * gap * 1.125 + gap * (Math.random() - 0.25) * 0.125,
          y: (y - height * 0.5 + 0.5) * gap + gap * (Math.random() - 0.5) * 0.125 + height * gap * 0.2,
        },
        size: 1.5 + Math.random() * 0.5,
        uv: {
          x: (x + 0.5) / width,
          y: (y + 0.5) / height,
        },
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
    const a = points[joint.a].position;
    const b = points[joint.b].position;
    joint.length = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  });
  if (variant === 1) {
    points.forEach(({ position }) => {
      position.x *= 1.25;
      position.y = (position.y - 26) * 1.4;
    });
  }
  return {
    ...PointBuffers(points),
    joints: JointBuffer(joints),
    numJoints: joints.length,
    numPoints: points.length,
  };
}
