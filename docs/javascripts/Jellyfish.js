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
    this.hitboxWidth = size * 0.55;
    this.hitboxHeight = size * 0.55;

    this.image = loadImage('./images/jellyfish.png');
  }

  draw() {
    push();
    const ratio = this.image.width / this.image.height;

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
    return (
      this.y + this.hitboxHeight / 2 > height ||
      this.y - this.hitboxHeight / 2 < 0
    );
  }
}
