// ================== game.js ==================
const levels = [
  { name: "1. Normal Mode", gravity: 0.5, lift: -9, speed: 3 },
  { name: "2. Heavy Mode", gravity: 0.9, lift: -12, speed: 4 },
  { name: "3. Reverse Mode", gravity: -0.5, lift: 9, speed: 3 },
  { name: "4. Chaos Mode", gravity: 0.5, lift: -9, speed: 4, special: "flip" }
];

let gameState = "menu", currentLevel = 0, score = 0, lives = 5;
let jellyfish, pipes = [], items = [], gravityDir = 1, gameStarted = false;
let dashTimer = 0, featherTimer = 0, postDashGrace = 0; 
let bubbles = [];
let seaweed = [];

let pipeDistanceCounter = 0; 
let nextPipeThreshold = 400; 

let globalStats = { highScore: 0, totalPipes: 0, totalDeaths: 0, totalItems: 0, totalScore: 0 };
let sessionStats = { itemsUsed: 0, flips: 0, gameStartTime: 0, noClickStartTime: 0, clicks: [] };
let toast = { text: "", timer: 0 }, achievements = {}, bgImg;

// ================== Debug Mode ==================
const DEBUG = {
  enabled: false,       
  showHitboxes: true,   
  showInfo: true,       
  slowMotion: false,    
  paused: false         
};

// ================== 1. Core Engine ==================
function preload() {
  bgImg = loadImage('./images/background.png');
  window.sounds = {
    flap: loadSound('./sounds/flap.mp3'),
    score: loadSound('./sounds/score.mp3'),
    die: loadSound('./sounds/die.mp3')
  };
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  let savedStats = JSON.parse(localStorage.getItem("jd_stats")) || {};
  globalStats = Object.assign(globalStats, savedStats);
  achievements = JSON.parse(localStorage.getItem("jd_achieve")) || {};

  initBackgroundEffects();
}

function initBackgroundEffects() {
  bubbles = [];
  seaweed = [];
  for (let i = 0; i < 20; i++) bubbles.push(new Bubble());
  let count = 15; 
  for (let i = 0; i < count; i++) seaweed.push(new Seaweed(i * (width / (count - 1))));
}

function draw() {
  image(bgImg, 0, 0, width, height);
  drawBackgroundEffects();

  if (DEBUG.paused && gameState === "playing") {
    drawPausedGameFrame();
    drawControlPanel(); 
  } else {
    if (gameState === "menu") drawMenu();
    else if (gameState === "playing") {
        runGameLogic();
        drawControlPanel();
    }
    else if (gameState === "achievements") drawAchievementScreen();
  }

  drawToast();
  drawDebugOverlay();
  
  if (gameState === "playing") checkAchievements();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initBackgroundEffects(); 
}

// ================== 2. Gameplay Logic ==================
function startGame(idx) {
  currentLevel = idx;
  score = 0;
  lives = 5;
  gravityDir = 1;
  pipes = [];
  items = [];
  dashTimer = 0;
  featherTimer = 0;
  postDashGrace = 0; 
  pipeDistanceCounter = 0; 
  nextPipeThreshold = 400; 
  gameStarted = false;
  window.diffScale = levels[idx].speed / 3;
  sessionStats = { itemsUsed: 0, flips: 0, gameStartTime: millis(), noClickStartTime: millis(), clicks: [] };
  jellyfish = new Jellyfish({ y: height / 2, gravity: levels[idx].gravity, lift: levels[idx].lift });
  gameState = "playing";
}

function runGameLogic() {
  if (!gameStarted) {
    jellyfish.draw();
    drawStartHint();
    if (DEBUG.enabled && DEBUG.showHitboxes) drawJellyfishHitbox();
    return;
  }

  const cfg = levels[currentLevel];
  let speed = 4 * window.diffScale;
  let g = cfg.gravity * gravityDir;
  let l = cfg.lift * gravityDir;

  if (DEBUG.slowMotion) speed *= 0.35;

  if (dashTimer > 0) {
    speed *= 3;
    g = 0;               
    jellyfish.velocity = 0; 
    dashTimer--;
    if (dashTimer === 0) postDashGrace = 90; 
  } else if (featherTimer > 0) {
    g *= 0.4;
    l *= 0.6;
    featherTimer--;
  }

  if (postDashGrace > 0) postDashGrace--; 

  jellyfish.gravity = g;
  jellyfish.lift = l;
  jellyfish.update();
  
  if (postDashGrace > 0 && frameCount % 10 < 5) {
    tint(255, 120); 
  }
  jellyfish.draw();
  noTint(); 

  if (dashTimer > 0 || featherTimer > 0) drawEffectProgressBar();
  if (currentLevel === 3) drawGravityIndicator();

  if (jellyfish.offscreen() && dashTimer <= 0 && postDashGrace <= 0) handleCollision(-1);

  if (!DEBUG.paused) {
    pipeDistanceCounter += speed;
    
    let dynamicThreshold = nextPipeThreshold;
    if (dashTimer > 0 || postDashGrace > 0) {
      dynamicThreshold = nextPipeThreshold * 2.5; 
    }

    if (pipeDistanceCounter >= dynamicThreshold) {
      const h = random(100, height - 300);
      pipes.push(new Pipe({ x: width, width: 70, height: h, gap: 200 }));
      
      if (random() > 0.5) items.push(new Item(width + 35, h + 100));
      
      pipeDistanceCounter = 0;
      nextPipeThreshold = random(350, 600); 
    }
  }

  pipes.forEach((p, i) => {
    p.x -= speed;
    p.draw();
    
    if (dashTimer <= 0 && postDashGrace <= 0 && p.hits(jellyfish)) handleCollision(i);
    
    if (!p.passed && p.x < jellyfish.x) {
      p.passed = true;
      score++;
      globalStats.totalPipes++;
      sounds.score.play();
      if (cfg.special === "flip" && score % 3 === 0) {
        gravityDir *= -1;
        sessionStats.flips++;
        showToast(gravityDir === 1 ? "Gravity Restored" : "Gravity Inverted");
      }
      checkAchievements();
    }
  });

  pipes = pipes.filter(p => p.x > -100);

  items.forEach((it, i) => {
    it.x -= speed;
    it.draw();
    if (dist(it.x, it.y, jellyfish.x, jellyfish.y) < 45) {
      applyEffect(it.type);
      items.splice(i, 1);
    }
  });

  items = items.filter(it => it.x > -50);
  
  drawUI();

  if (DEBUG.enabled && DEBUG.showHitboxes) {
    drawJellyfishHitbox();
    drawPipeHitboxes();
    drawItemHitboxes();
  }
}

// ================== 3. UI & Interaction ==================
function drawMenu() {
  push();
  let titleY = height * 0.15;
  textFont('Impact', 'sans-serif'); 
  textSize(80);
  strokeJoin(ROUND); 
  
  noStroke(); fill(0, 60);
  text("JELLY DRIFT", width / 2 + 6, titleY + 6);
  
  strokeWeight(12); stroke(0, 80, 130); fill(0, 191, 255);
  text("JELLY DRIFT", width / 2, titleY);
  
  strokeWeight(2); stroke(255); fill(224, 255, 255);
  text("JELLY DRIFT", width / 2, titleY);
  pop();

  levels.forEach((l, i) => {
    const y = height * 0.28 + i * 85;
    fill(255, 230);
    rect(width / 2 - 150, y, 300, 55, 15);
    fill(44, 62, 80);
    textSize(22);
    text(l.name, width / 2, y + 28);
  });

  const statsY = height * 0.82; 
  fill(255, 230);
  rect(width / 2 - 200, statsY, 400, 90, 15);
  fill(44, 62, 80);
  textSize(20);
  text("🏆 Hall of Fame", width / 2, statsY + 30);
  textSize(18);
  text(`High Score: ${globalStats.highScore}`, width / 2, statsY + 60);

  let itemX = constrain(width - 200, width / 2 + 170, width / 2 + 320); 
  
  push();
  textAlign(LEFT, CENTER);
  textSize(22); stroke(0); strokeWeight(2); fill(255);
  const itemDescs = [
    { icon: "⭐", desc: "Extra life" },
    { icon: "🔱", desc: "Speed dash" },
    { icon: "🫧", desc: "Low gravity" }
  ];
  itemDescs.forEach((item, i) => {
    const y = height * 0.28 + i * 85; 
    text(`${item.icon}: ${item.desc}`, itemX, y + 28);
  });
  pop();

  if (DEBUG.enabled) {
    push();
    noStroke();
    fill(0, 180);
    rect(20, 20, 310, 92, 10);
    fill(255);
    textAlign(LEFT, TOP);
    textSize(16);
    text("DEBUG MODE ON", 35, 35);
    textSize(13);
    text("D:Toggle | H:Hitboxes | I:Info | S:SlowMo | P:Pause", 35, 62);
    pop();
  }
}

function drawControlPanel() {
  if (gameState !== "playing") return;
  
  push();
  let b1Text = !gameStarted ? "START" : (DEBUG.paused ? "RESUME" : "PAUSE");
  drawPrettyButton(20, 70, 140, 60, b1Text, "#2ecc71");
  
  // Home Button - Ocean Blue
  drawPrettyButton(170, 70, 140, 60, "HOME", "#3498db");
  pop();
}

function drawPrettyButton(x, y, w, h, txt, col) {
  push();
  noStroke();
  fill(0, 50);
  rect(x + 4, y + 4, w, h, 15);
  fill(col);
  rect(x, y, w, h, 15);
  fill(255, 40);
  rect(x, y, w, h/2, 15);
  
  fill(255);
  textSize(24);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(txt, x + w/2, y + h/2);
  pop();
}

function drawEffectProgressBar() {
  push();
  const barW = 60, barH = 8;
  const x = jellyfish.x - barW / 2, y = jellyfish.y - 50; 
  noStroke(); fill(0, 100); rect(x, y, barW, barH, 4);
  if (dashTimer > 0) {
    fill(46, 204, 113); rect(x, y, map(dashTimer, 0, 180, 0, barW), barH, 4);
  } else if (featherTimer > 0) {
    fill(155, 89, 182); rect(x, y, map(featherTimer, 0, 300, 0, barW), barH, 4);
  }
  pop();
}

function drawGravityIndicator() {
  push();
  textSize(32); fill(255, 200, 0); stroke(0); strokeWeight(3);
  let arrow = gravityDir === 1 ? "⬇️" : "⬆️";
  text(arrow, jellyfish.x - 60, jellyfish.y); 
  pop();
}

function mousePressed() {
  if (gameState === "menu") {
    levels.forEach((l, i) => {
      if (mouseY > height * 0.28 + i * 85 && mouseY < height * 0.28 + i * 85 + 55) startGame(i);
    });
    if (mouseY > height * 0.8) gameState = "achievements";
    return;
  } 
  
  if (gameState === "playing") {
    if (mouseX > 170 && mouseX < 310 && mouseY > 70 && mouseY < 130) {
        gameState = "menu";
        DEBUG.paused = false;
        return;
    }

    if (DEBUG.paused) {
        DEBUG.paused = false;
        return;
    }

    if (mouseX > 20 && mouseX < 160 && mouseY > 70 && mouseY < 130) {
        if (!gameStarted) {
            gameStarted = true;
            sessionStats.gameStartTime = millis(); 
        } else {
            DEBUG.paused = true;
        }
        return;
    }

    gameStarted = true;
    if (dashTimer <= 0) jellyfish.flap();
    sessionStats.noClickStartTime = millis();

    // A19: Speed Clicker - Click 5 times in 1 second
    const now = millis();
    sessionStats.clicks.push(now);
    sessionStats.clicks = sessionStats.clicks.filter(t => now - t <= 1000);
    if (sessionStats.clicks.length >= 5 && !achievements['a19']) {
      unlock('a19');
    }
  } else {
    gameState = "menu";
  }
}

function showToast(m) {
  toast = { text: m, timer: 120 };
}

function drawToast() {
  if (toast.timer <= 0) return;
  push();
  textAlign(CENTER, CENTER); textSize(48); strokeWeight(6); stroke(0); fill(255, 215, 0);
  text(toast.text, width / 2, height * 0.2);
  pop();
  toast.timer--;
}

function drawUI() {
  fill(255); stroke(0); strokeWeight(2); textAlign(LEFT); textSize(24);
  text(`Score: ${score}  Lives: ${"❤️".repeat(max(0, lives))}`, 20, 40);
  textAlign(CENTER); noStroke();
}

function drawStartHint() {
  push();
  fill(255, map(sin(frameCount * 0.1), -1, 1, 100, 255));
  textSize(28); text("TAP START OR SCREEN", width / 2, height / 2 + 100);
  textSize(40); text("👆", width / 2, height / 2 + 50);
  pop();
}

// ================== 4. Items & Achievements ==================
class Item {
  constructor(x, y) {
    this.x = x; this.y = y; this.r = 20;
    const r = random();
    this.type = r < 0.4 ? 'shield' : (r < 0.7 ? 'dash' : 'feather');
  }
  draw() {
    push();
    strokeWeight(2); stroke(255);
    if (this.type === 'shield') fill(255, 127, 80); 
    else if (this.type === 'dash') fill(0, 191, 255); 
    else fill(224, 255, 255); 
    ellipse(this.x, this.y, this.r * 2.5); 
    fill(255); textSize(24);
    let icon = this.type === 'shield' ? "⭐" : (this.type === 'dash' ? "🔱" : "🫧");
    text(icon, this.x, this.y);
    pop();
  }
}

function applyEffect(type) {
  sessionStats.itemsUsed++;
  globalStats.totalItems++;
  if (type === 'shield') { 
    // A16: Resurrection - Survive by shielding at 1 HP
    if (lives === 1 && !achievements['a16']) unlock('a16');
    lives++; 
    showToast("Extra Life!"); 
  }
  else if (type === 'dash') { dashTimer = 180; showToast("Trident Power!"); }
  else if (type === 'feather') { featherTimer = 300; showToast("Bubble Float!"); }
  
  checkAchievements();
}

function handleCollision(idx) {
  lives--;
  globalStats.totalDeaths++;
  sounds.die.play();
  if (idx !== -1) pipes.splice(idx, 1);
  if (lives <= 0) {
    // A9: Fast Demise - Die within 3s of starting
    if (millis() - sessionStats.gameStartTime <= 3000 && !achievements['a9']) unlock('a9');
    // A15: Edge Expert - Die with exactly 99 pts
    if (score === 99 && !achievements['a15']) unlock('a15');

    globalStats.totalScore += score;
    globalStats.highScore = max(globalStats.highScore, score);
    gameState = "menu";
  } else {
    jellyfish.y = height / 2;
    jellyfish.velocity = 0;
    dashTimer = 0; featherTimer = 0; postDashGrace = 0; 
    showToast("Current caught you!");
  }
  checkAchievements();
}

function unlock(id) {
  achievements[id] = true;
  const ach = achievementList.find(a => a.id === id);
  showToast("Achievement Unlocked: " + (ach ? ach.label : id));
  saveData();

  // A20: Completionist - Unlock all other achievements 
  if (id !== 'a20' && !achievements['a20']) {
    let unlockedCount = achievementList.filter(a => achievements[a.id]).length;
    if (unlockedCount >= 19) unlock('a20');
  }
}

function checkAchievements() {
  if (score >= 10 && !achievements['a1']) unlock('a1');
  if (globalStats.totalPipes >= 100 && !achievements['a2']) unlock('a2');
  if (globalStats.totalItems >= 20 && !achievements['a3']) unlock('a3');
  if (globalStats.totalDeaths >= 50 && !achievements['a4']) unlock('a4');
  if (currentLevel === 2 && score >= 20 && !achievements['a5']) unlock('a5');
  if (sessionStats.flips >= 10 && !achievements['a6']) unlock('a6');
  if (score >= 100 && !achievements['a7']) unlock('a7');
  if (gameStarted && millis() - sessionStats.noClickStartTime > 5000 && !achievements['a8']) unlock('a8');
  if (lives >= 8 && !achievements['a10']) unlock('a10');
  if (score >= 30 && sessionStats.itemsUsed === 0 && !achievements['a11']) unlock('a11');
  if (currentLevel === 1 && score >= 40 && !achievements['a12']) unlock('a12');
  if (sessionStats.itemsUsed >= 10 && !achievements['a13']) unlock('a13');
  if (currentLevel === 3 && score >= 60 && !achievements['a14']) unlock('a14');
  if (globalStats.totalScore >= 1000 && !achievements['a17']) unlock('a17');
  if (gameStarted && (millis() - sessionStats.gameStartTime) >= 300000 && !achievements['a18']) unlock('a18');
}

// --- Background Effects ---
function drawBackgroundEffects() {
  seaweed.forEach(s => { s.update(); s.draw(); });
  bubbles.forEach((b, i) => {
    b.update(); b.draw();
    if (b.y < -20) { bubbles[i] = new Bubble(); bubbles[i].y = height + 20; }
  });
}

class Bubble {
  constructor() { this.x = random(width); this.y = random(height); this.r = random(4, 12); this.speed = random(0.5, 1.5); }
  update() { this.y -= this.speed; this.x += sin(frameCount * 0.05 + this.y) * 0.3; }
  draw() { noFill(); stroke(180, 220, 255, 180); strokeWeight(1.5); ellipse(this.x, this.y, this.r * 2); }
}

class Seaweed {
  constructor(x) {
    this.baseX = x;
    this.heights = [random(70, 120), random(100, 160), random(70, 120)];
    this.offsets = [random(1000), random(1000), random(1000)];
    this.spacing = 15;
  }
  update() { for (let i = 0; i < 3; i++) this.offsets[i] += 0.08; }
  draw() {
    push(); noFill(); stroke(46, 139, 87, 200); strokeWeight(6);
    for (let i = 0; i < 3; i++) {
      let x = this.baseX + (i-1)*this.spacing;
      beginShape();
      for (let y = 0; y < this.heights[i]; y += 8) {
        let sway = sin(frameCount * 0.08 + this.offsets[i] + y * 0.08) * 12;
        vertex(x + sway, height - y);
      }
      endShape();
    }
    pop();
  }
}

// ================== 5. Debug Helpers ==================
function keyPressed() {
  const keyUpper = key.toUpperCase();
  if (keyUpper === 'D') {
    DEBUG.enabled = !DEBUG.enabled;
    showToast(DEBUG.enabled ? "Debug Mode: ON" : "Debug Mode: OFF");
  }
  if (!DEBUG.enabled) return;
  if (keyUpper === 'H') {
    DEBUG.showHitboxes = !DEBUG.showHitboxes;
    showToast(DEBUG.showHitboxes ? "Hitboxes: ON" : "Hitboxes: OFF");
  } else if (keyUpper === 'I') {
    DEBUG.showInfo = !DEBUG.showInfo;
    showToast(DEBUG.showInfo ? "Debug Info: ON" : "Debug Info: OFF");
  } else if (keyUpper === 'S') {
    DEBUG.slowMotion = !DEBUG.slowMotion;
    showToast(DEBUG.slowMotion ? "Slow Motion: ON" : "Slow Motion: OFF");
  } else if (keyUpper === 'P' && gameState === "playing") {
    DEBUG.paused = !DEBUG.paused;
    showToast(DEBUG.paused ? "Paused" : "Resumed");
  }
}

function drawDebugOverlay() {
  if (!DEBUG.enabled || !DEBUG.showInfo) return;
  push();
  rectMode(CORNER); noStroke(); fill(0, 170);
  rect(12, 140, 270, 165, 10);
  fill(255); textAlign(LEFT, TOP); textSize(14);
  const lines = [
    "DEBUG MODE",
    `State: ${gameState}`,
    `FPS: ${nf(frameRate(), 2, 1)}`,
    `Score: ${score}`,
    `Lives: ${lives}`,
    `Pipes: ${pipes.length}`,
    `Items: ${items.length}`,
    jellyfish ? `Jelly X/Y: ${jellyfish.x.toFixed(1)}, ${jellyfish.y.toFixed(1)}` : "Jelly X/Y: -",
    `Slow Motion: ${DEBUG.slowMotion ? "ON" : "OFF"}`,
    `Paused: ${DEBUG.paused ? "YES" : "NO"}`
  ];
  let y = 150;
  for (const line of lines) { text(line, 24, y); y += 13; }
  pop();
}

function drawJellyfishHitbox() {
  if (!jellyfish) return;
  push();
  rectMode(CENTER); noFill(); stroke(255, 60, 60); strokeWeight(2);
  rect(jellyfish.x, jellyfish.y, jellyfish.size, jellyfish.size);
  pop();
}

function drawPipeHitboxes() {
  push();
  rectMode(CORNER); noFill(); stroke(0, 255, 120); strokeWeight(2);
  for (const p of pipes) {
    rect(p.x, 0, p.width, p.height);
    rect(p.x, p.height + p.gap, p.width, height - p.height - p.gap);
  }
  pop();
}

function drawItemHitboxes() {
  push();
  noFill(); stroke(80, 180, 255); strokeWeight(2);
  for (const it of items) ellipse(it.x, it.y, 90, 90);
  pop();
}

function drawPausedGameFrame() {
  if (jellyfish) jellyfish.draw();
  for (const p of pipes) p.draw();
  for (const it of items) it.draw();
  drawUI();
  push();
  fill(0, 150); rect(0, 0, width, height);
  fill(255); textAlign(CENTER, CENTER); textSize(48);
  text("PAUSED", width / 2, height / 2);
  textSize(20); text("TAP ANYWHERE TO RESUME", width / 2, height / 2 + 60);
  pop();
}
