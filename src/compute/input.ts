import { vec2 } from 'gl-matrix';
import Camera from '../render/camera';

class Input {
  private readonly buttons: {
    primary: boolean;
    secondary: boolean;
  };
  private readonly pointer: {
    id: number;
    position: vec2;
  };

  constructor(target: HTMLCanvasElement) {
    this.buttons = {
      primary: false,
      secondary: false,
    };
    this.pointer = {
      id: -1,
      position: vec2.create(),
    };
    window.addEventListener('blur', this.onBlur.bind(this));
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

  getButton(button: 'primary' | 'secondary') {
    return this.buttons[button];
  }

  getPointer(camera: Camera, output: vec2) {
    const { pointer: { position } } = this;
    vec2.set(output, position[0], position[1]);
    vec2.transformMat4(output, output, camera.getMatrixInverse());
    return output;
  }

  private onBlur() {
    const { buttons } = this;
    buttons.primary = buttons.secondary = false;
  }

  private onPointerDown({ button, pointerId, target }: PointerEvent) {
    (target as HTMLCanvasElement).setPointerCapture(pointerId);
    const { buttons, pointer } = this;
    if (pointer.id !== -1) {
      return;
    }
    pointer.id = pointerId;
    switch (button) {
      case 0:
        buttons.primary = true;
        break;
      case 2:
        buttons.secondary = true;
        break;
    }
  }

  private onPointerMove({ pointerId, clientX, clientY }: PointerEvent) {
    const { pointer } = this;
    if (pointer.id !== -1 && pointer.id !== pointerId) {
      return;
    }
    vec2.set(
      pointer.position,
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
  }

  private onPointerUp({ button, pointerId, target }: PointerEvent) {
    (target as HTMLCanvasElement).releasePointerCapture(pointerId);
    const { buttons, pointer } = this;
    if (pointer.id !== pointerId) {
      return;
    }
    pointer.id = -1;
    switch (button) {
      case 0:
        buttons.primary = false;
        break;
      case 2:
        buttons.secondary = false;
        break;
    }
  }
}

export default Input;
