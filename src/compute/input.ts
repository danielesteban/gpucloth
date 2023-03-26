import { vec2 } from 'gl-matrix';
import Camera from '../render/camera';

class Input {
  private readonly pointer: {
    id: number;
    button: number;
    normalized: vec2;
    position: vec2;
  };

  constructor(target: HTMLCanvasElement) {
    this.pointer = {
      id: -1,
      button: 0,
      normalized: vec2.create(),
      position: vec2.create(),
    };
    target.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    target.addEventListener('pointerup', this.onPointerUp.bind(this));

    {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Couldn't get 2d context");
      }
      canvas.width = 20;
      canvas.height = 20;
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#111';
      ctx.arc(canvas.width * 0.5, canvas.height * 0.5, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#eee';
      ctx.stroke();
      canvas.toBlob((blob) => {
        if (blob) {
          document.body.style.cursor = `url(${URL.createObjectURL(blob)}) 10 10, default`;
        }
      });
    }
  }

  getPointer(camera: Camera) {
    const { pointer } = this;
    vec2.transformMat4(
      pointer.position,
      pointer.normalized,
      camera.getMatrixInverse()
    );
    return pointer;
  }

  private onPointerDown({ buttons, pointerId, target }: PointerEvent) {
    (target as HTMLCanvasElement).setPointerCapture(pointerId);
    const { pointer } = this;
    if (pointer.id !== -1) {
      return;
    }
    pointer.id = pointerId;
    pointer.button = buttons;
  }

  private onPointerMove({ pointerId, clientX, clientY }: PointerEvent) {
    const { pointer } = this;
    if (pointer.id !== -1 && pointer.id !== pointerId) {
      return;
    }
    vec2.set(
      pointer.normalized,
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
  }

  private onPointerUp({ pointerId, target }: PointerEvent) {
    (target as HTMLCanvasElement).releasePointerCapture(pointerId);
    const { pointer } = this;
    if (pointer.id !== pointerId) {
      return;
    }
    pointer.id = -1;
    pointer.button = 0;
  }
}

export default Input;
