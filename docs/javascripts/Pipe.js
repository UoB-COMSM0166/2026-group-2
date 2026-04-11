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

  drawPixel(x, y, size, color) {
    fill(color);
    rect(x, y, size, size);
  }

  drawPixelRect(x, y, w, h, size, color) {
    fill(color);
    rect(x, y, w * size, h * size);
  }

  drawLeafCluster(startX, startY, px, direction = 1) {
    const light = '#7ddf84';
    const mid = '#43b05c';
    const dark = '#1f6b3b';

    this.drawPixel(startX, startY, px, mid);
    this.drawPixel(startX + direction * px, startY - px, px, light);
    this.drawPixel(startX + direction * 2 * px, startY - px, px, light);
    this.drawPixel(startX + direction * 2 * px, startY, px, mid);
    this.drawPixel(startX + direction * 3 * px, startY, px, dark);
  }

  drawSeaweedSpriteColumn(x, y, w, h, growDown = true) {
    push();
    noStroke();

    const px = 5; 
    const cols = Math.max(8, Math.floor(w / px));
    const rows = Math.max(8, Math.floor(h / px));

    const dark = '#14532d';
    const dark2 = '#1c6a3a';
    const mid = '#2f9e44';
    const light = '#56c271';
    const highlight = '#9be9a8';
    const bodyLeftOffset = new Array(cols).fill(0);
    const bodyRightOffset = new Array(cols).fill(0);

    for (let c = 0; c < cols; c++) {
      const edgeWave = Math.floor(Math.sin(c * 0.8) * 1);
      bodyLeftOffset[c] = (c === 0 || c === 1) ? 1 : 0;
      bodyRightOffset[c] = (c === cols - 1 || c === cols - 2) ? 1 : 0;

      if (c % 5 === 0) {
        bodyLeftOffset[c] += Math.max(0, edgeWave);
      }
      if (c % 4 === 0) {
        bodyRightOffset[c] += Math.max(0, -edgeWave);
      }
    }

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const drawX = x + c * px;
        const drawY = y + r * px;

        let skip = false;

        if (growDown) {
          if (r < Math.max(bodyLeftOffset[c], bodyRightOffset[c])) skip = true;
        } else {
          if (r >= rows - Math.max(bodyLeftOffset[c], bodyRightOffset[c])) skip = true;
        }

        if (skip) continue;

        if ((c === 0 || c === cols - 1) && r % 6 === 0) continue;

        let color = mid;

        if (c <= 1) color = dark;
        else if (c === 2) color = dark2;
        else if (c >= cols - 2) color = light;

        const highlightBand = Math.floor(cols * 0.62);
        if ((c === highlightBand || c === highlightBand - 1) && r % 4 !== 0) {
          color = highlight;
        }

        if (r % 7 === 0 && c > 1 && c < cols - 2) {
          color = light;
        }

        this.drawPixel(drawX, drawY, px, color);
      }
    }

    for (let c = 1; c < cols - 1; c += 2) {
      const tipX = x + c * px;

      if (growDown) {
        const tipY = y + ((c % 4 === 0) ? 2 * px : px);
        this.drawPixel(tipX, tipY, px, highlight);
        if (c % 3 === 0) this.drawPixel(tipX, tipY + px, px, light);
      } else {
        const tipY = y + h - (((c % 4 === 0) ? 3 : 2) * px);
        this.drawPixel(tipX, tipY, px, highlight);
        if (c % 3 === 0) this.drawPixel(tipX, tipY - px, px, light);
      }
    }

    const leafRows = [
      Math.floor(rows * 0.22),
      Math.floor(rows * 0.42),
      Math.floor(rows * 0.65),
    ];

    for (const r of leafRows) {
      const baseY = y + r * px;

      if (growDown) {
        this.drawLeafCluster(x + 2 * px, baseY, px, -1);
        this.drawLeafCluster(x + (cols - 3) * px, baseY + px, px, 1);
      } else {
        this.drawLeafCluster(x + 2 * px, baseY, px, -1);
        this.drawLeafCluster(x + (cols - 3) * px, baseY - px, px, 1);
      }
    }

 
    for (let r = 3; r < rows - 3; r += 6) {
      const blockX = x + Math.floor(cols * 0.35) * px;
      const blockY = y + r * px;
      this.drawPixel(blockX, blockY, px, dark2);
      this.drawPixel(blockX + px, blockY, px, light);
      if (r % 12 === 3) {
        this.drawPixel(blockX + 2 * px, blockY + px, px, highlight);
      }
    }

    pop();
  }

  draw() {
    this.drawSeaweedSpriteColumn(this.x, 0, this.width, this.height, true);
    this.drawSeaweedSpriteColumn(
      this.x,
      this.height + this.gap,
      this.width,
      height - this.height - this.gap,
      false
    );
  }

  update() {
    if (gameState !== "playing") return
    this.x -= 4 * diffScale;
  }

  offscreen() {
    return this.x < -this.width;
  }

  hits(jellyfish) {
    const halfW = jellyfish.hitboxWidth / 2;
    const halfH = jellyfish.hitboxHeight / 2;

    const left = jellyfish.x - halfW;
    const right = jellyfish.x + halfW;
    const top = jellyfish.y - halfH;
    const bottom = jellyfish.y + halfH;

    const pipeLeft = this.x;
    const pipeRight = this.x + this.width;
    const gapTop = this.height;
    const gapBottom = this.height + this.gap;

    const hitTop =
      right > pipeLeft &&
      left < pipeRight &&
      top < gapTop;

    const hitBottom =
      right > pipeLeft &&
      left < pipeRight &&
      bottom > gapBottom;

    return hitTop || hitBottom;
  }
}
