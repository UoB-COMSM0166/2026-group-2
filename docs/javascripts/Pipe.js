class Pipe {
	constructor({
		x = width,
		width = 60,
		height = 100,
		gap = 200,
	} = {}) {
		this.x = x;
		this.width = width;
		this.height = height;
		this.gap = gap;
		this.passed = false;
	}

	draw() {
		fill('green');
		// Top pipe
		rect(this.x, 0, this.width, this.height);
		rect(this.x - 10, this.height - 20, 20 + this.width, 20);

		// Bottom pipe
		rect(this.x, this.height + this.gap, this.width, height - this.height - this.gap);
		rect(this.x - 10, this.height + this.gap, 20 + this.width, 20);
	}

	update() {
		if (isLose) { // If the bird is dead, stop moving the pipes
			return;
		}

		this.x -= 4* diffScale;
	}

	offscreen() {
		return this.x < -this.width;
	}

	hits(bird) {
		if (bird.y < this.height || bird.y + bird.size > this.height + this.gap) {
			if (bird.x + bird.size > this.x && bird.x < this.x + this.width) {
				return true;
			}
		}
	}
}
