
// @ts-check

/** @typedef {"cloud" | "vortex"} DiffusionKind */
/** @typedef {"dye" | "pigment"} InkKind */
/** @typedef {{
  x: number;
  y: number;
  kind: DiffusionKind;
  ink: InkKind;
  age: number;
  radius: number;
  color: number[];
  amount: number;
  seed: number;
}} Drop */
/** @typedef {{
  field: Float32Array;
  drops: Drop[];
  elapsed: number;
}} InkSnapshot */
// A bounded, low-resolution colour-concentration simulation; the artwork canvas
// remains full resolution. All colours share the same field, not separate blobs.
const size = 128;



const cells = size * size;



const clamp = (n, low, high) => Math.max(low, Math.min(high, n));



export class WaterInk {

  memoryBytes = cells * 4 * 4 * 2 + cells * 4;



  canvas;



  context;



  pixels;



  field = new Float32Array(cells * 4);



  next = new Float32Array(cells * 4);



  drops = [];



  elapsed = 0;



  moving = false;



  dirty = false;



  constructor() {

    this.canvas = document.createElement("canvas");



    this.canvas.width = this.canvas.height = size;



    this.context = this.canvas.getContext("2d");



    this.pixels = this.context.createImageData(size, size);

  }



  snapshot() {

    return {

      field: this.field.slice(),



      drops: this.drops.map((drop) => ({

        ...drop,



        color: [...drop.color],

      })),



      elapsed: this.elapsed,

    };

  }



  restore(snapshot) {

    this.field.set(snapshot.field);



    this.drops = snapshot.drops.map((drop) => ({

      ...drop,



      color: [...drop.color],

    }));



    this.elapsed = snapshot.elapsed;



    // Undo restores the exact pre-stroke frame, rather than immediately flowing again.
    this.moving = false;



    this.dirty = true;

  }



  clear() {

    this.field.fill(0);



    this.drops = [];



    this.moving = false;



    this.dirty = true;

  }



  add(x, y, color, kind, ink, amount) {

    const rgb = [1, 3, 5].map(

      (offset) => parseInt(color.slice(offset, offset + 2), 16) / 255,

    );



    const drop = {

      x: (x / 900) * size,



      y: (y / 900) * size,



      kind,



      ink,



      age: 0,



      radius: (kind === "cloud" ? 4.8 : 4) * (0.6 + amount / 100),



      color: rgb.map((channel) => -Math.log(Math.max(0.025, channel))),



      amount: (0.22 + (amount / 100) * 1.2) * (ink === "pigment" ? 1.4 : 1),



      seed: Math.random() * 10,

    };



    this.drops.push(drop);



    if (this.drops.length > 36) this.drops.shift();



    const scattering = Math.min(...rgb) * (ink === "pigment" ? 1.4 : 0.45);



    if (kind === "vortex") {

      for (let i = 0; i < 18; i++) {

        const angle = (i * Math.PI * 2) / 18;



        const density = 0.5 + 0.4 * Math.sin(angle * 2 + drop.seed);



        this.deposit(

          drop.x + Math.cos(angle) * drop.radius * 2.1,



          drop.y + Math.sin(angle) * drop.radius * 2.1,



          drop.radius * 0.5,



          drop.amount * density,



          drop.color,



          scattering,

        );

      }

    } else {

      for (let i = 0; i < 5; i++) {

        const angle = (i * Math.PI * 2) / 5;



        this.deposit(

          drop.x + Math.cos(angle) * drop.radius * 0.55,



          drop.y + Math.sin(angle) * drop.radius * 0.55,



          drop.radius,



          drop.amount * 0.36,



          drop.color,



          scattering,

        );

      }

    }



    this.moving = true;



    this.dirty = true;

  }



  deposit(x, y, radius, amount, color, scattering) {

    const reach = Math.ceil(radius * 2.8);



    for (

      let py = Math.max(0, Math.floor(y - reach));

      py <= Math.min(size - 1, Math.ceil(y + reach));

      py++

    ) {

      for (

        let px = Math.max(0, Math.floor(x - reach));

        px <= Math.min(size - 1, Math.ceil(x + reach));

        px++

      ) {

        const distance =

          ((px - x) ** 2 + (py - y) ** 2) / (radius * radius);



        const concentration = Math.exp(-distance / 2) * amount;



        const offset = (py * size + px) * 4;



        // Light pigment scatters colour instead of making white additions darker.
        const dilution = Math.exp(-concentration * scattering);



        for (let c = 0; c < 3; c++)

          this.field[offset + c] = Math.min(

            12,



            this.field[offset + c] * dilution + color[c] * concentration,

          );



        this.field[offset + 3] = Math.min(

          12,



          this.field[offset + 3] + concentration,

        );

      }

    }

  }



  update(dt) {

    if (!this.moving) return false;



    dt = Math.max(0, Math.min(dt, 0.05));



    this.elapsed += dt;



    for (const drop of this.drops) drop.age += dt;



    const live = this.drops



      .filter((drop) => drop.age < 4.5)



      .slice(-6)



      .map((drop) => ({

        ...drop,



        strength: Math.exp(-drop.age * 0.45),



        mobility: drop.ink === "dye" ? 1 : 0.58,

      }));



    if (!live.length) {

      this.moving = false;



      return false;

    }



    // Analytic flow fields restore the original cloud and circulating ring. Bilinear
    // backtracing carries every colour together; diffusion mixes neighbours.
    for (let y = 0; y < size; y++) {

      for (let x = 0; x < size; x++) {

        let vx = 0,

          vy = 0,

          diffusion = 0.012;



        for (const drop of live) {

          const dx = x - drop.x,

            dy = y - drop.y;



          const distanceSquared = dx * dx + dy * dy;



          if (distanceSquared > 3600) continue;



          const influence =

            Math.exp(-distanceSquared / 850) * drop.strength;



          const mobility = drop.mobility;



          if (drop.kind === "cloud") {

            vx +=

              (dx * 0.55 +

                Math.sin(y * 0.22 + this.elapsed + drop.seed) * 3) *

              influence *

              mobility;



            vy +=

              (dy * 0.45 - 2 + Math.cos(x * 0.23 + this.elapsed) * 3) *

              influence *

              mobility;



            diffusion += influence * (drop.ink === "dye" ? 0.12 : 0.055);

          } else {

            vx += (-dy * 1.05 + dx * 0.13) * influence * mobility;



            vy += (dx * 1.05 + dy * 0.13) * influence * mobility;



            diffusion += influence * 0.022;

          }

        }



        const sx = clamp(x - clamp(vx, -28, 28) * dt, 0, size - 1.001);



        const sy = clamp(y - clamp(vy, -28, 28) * dt, 0, size - 1.001);



        const x0 = Math.floor(sx),

          y0 = Math.floor(sy),

          fx = sx - x0,

          fy = sy - y0;



        const a = (y0 * size + x0) * 4,

          b = a + 4,

          c = a + size * 4,

          d = c + 4;



        const out = (y * size + x) * 4;



        const left = (y * size + Math.max(0, x - 1)) * 4;



        const right = (y * size + Math.min(size - 1, x + 1)) * 4;



        const top = (Math.max(0, y - 1) * size + x) * 4;



        const bottom = (Math.min(size - 1, y + 1) * size + x) * 4;



        const blend = Math.min(0.22, diffusion * dt * 30);



        for (let channel = 0; channel < 4; channel++) {

          const advected =

            (this.field[a + channel] * (1 - fx) +

              this.field[b + channel] * fx) *

              (1 - fy) +

            (this.field[c + channel] * (1 - fx) +

              this.field[d + channel] * fx) *

              fy;



          const neighbours =

            (this.field[left + channel] +

              this.field[right + channel] +

              this.field[top + channel] +

              this.field[bottom + channel]) /

            4;



          this.next[out + channel] = Math.max(

            0,



            advected * (1 - blend) + neighbours * blend,

          );

        }

      }

    }



    [this.field, this.next] = [this.next, this.field];



    this.dirty = true;



    return true;

  }



  render() {

    if (!this.dirty) return this.canvas;



    const bytes = this.pixels.data;



    for (let i = 0; i < cells; i++) {

      const offset = i * 4;



      const mass = this.field[offset + 3];



      const alpha = 1 - Math.exp(-mass * 1.1);



      if (alpha < 0.003) {

        bytes[offset + 3] = 0;



        continue;

      }



      for (let channel = 0; channel < 3; channel++) {

        const transmission = Math.exp(-this.field[offset + channel] * 0.9);



        bytes[offset + channel] =

          clamp((transmission - (1 - alpha)) / alpha, 0, 1) * 255;

      }



      bytes[offset + 3] = alpha * 255;

    }



    this.context.putImageData(this.pixels, 0, 0);



    this.dirty = false;



    return this.canvas;

  }

}
