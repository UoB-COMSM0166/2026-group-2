class Jellyfish {
  constructor({
    x = 200,
    y = 300,
    lift = -9,
    velocity = 0,
    gravity = 0.5,
    size = 60,
  } = {}) {
    this.x = x;
    this.y = y;
    this.lift = lift;
    this.velocity = velocity;
    this.gravity = gravity;
    this.size = size;
    this.image = loadImage('./images/jellyfish.png');
  }

  draw() {
    push();
    const ratio = this.image.width / this.image.height;
    let stretch = map(this.velocity, -10, 10, 0.8, 1.2);
    imageMode(CENTER);
    image(this.image, this.x, this.y, this.size * ratio, this.size);
    pop();
  }

  update() {
    this.velocity += this.gravity;
    this.y += this.velocity;
  }

  flap() {
    this.velocity = this.lift;
    sounds.flap.play();
  }

  offscreen() {
    return this.y + this.size/2 > height || this.y - this.size/2 < 0;
  }
}