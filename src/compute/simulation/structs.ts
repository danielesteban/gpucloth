export const Data = /* wgsl */`
struct Data {
  locked: u32,
  size: f32,
  uv: vec2<f32>,
}
`;

export const Joint = /* wgsl */`
struct Joint {
  enabled: u32,
  a: u32,
  b: u32,
  length: f32,
}
`;

export const Uniforms = /* wgsl */`
struct Uniforms {
  button: u32,
  delta: f32,
  pointer: vec2<f32>,
}
`;
