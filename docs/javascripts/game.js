// ================== game.js ==================
const levels = [
  { name: "1. Normal Mode", gravity: 0.5,  lift: -9,  speed: 3 },
  { name: "2. Heavy Mode", gravity: 0.9,  lift: -12, speed: 4 },
  { name: "3. Reverse Mode", gravity: -0.5, lift: 9,   speed: 3 }, 
  { name: "4. Chaos Mode", gravity: 0.5,  lift: -9,  speed: 4, special: "flip" }
];

let gameState = "menu", currentLevel = 0, score = 0, lives = 5;
let jellyfish, pipes = [], items = [], gravityDir = 1, gameStarted = false; 
let dashTimer = 0, featherTimer = 0; 

let globalStats = { highScore: 0, totalPipes: 0, totalDeaths: 0, totalItems: 0, totalScore: 0 };
let sessionStats = { itemsUsed: 0, flips: 0, gameStartTime: 0, noClickStartTime: 0, clicks: [] };
let toast = { text: "", timer: 0 }, achievements = {}, bgImg;

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
  achievements = JSON.parse(localStorage.getItem("jd_achieve")) || {};
  globalStats = JSON.parse(localStorage.getItem("jd_stats")) || globalStats;
}

function draw() {
  image(bgImg, 0, 0, width, height);

  if (gameState === "menu") drawMenu();
  else if (gameState === "playing") runGameLogic();
  else if (gameState === "achievements") drawAchievementScreen(); 
  
  drawToast();
}

// ================== 2. Gameplay Logic ==================
function startGame(idx) {
  currentLevel = idx; score = 0; lives = 5; gravityDir = 1;
  pipes = []; items = []; dashTimer = 0; featherTimer = 0;
  gameStarted = false; 
  window.diffScale = levels[idx].speed / 3;
  sessionStats = { itemsUsed: 0, flips: 0, gameStartTime: millis(), noClickStartTime: millis(), clicks: [] };
  jellyfish = new Jellyfish({ y: height / 2, gravity: levels[idx].gravity, lift: levels[idx].lift }); 
  gameState = "playing";
}

function runGameLogic() {
  if (!gameStarted) return (jellyfish.draw(), drawStartHint());

  let cfg = levels[currentLevel], speed = 4 * window.diffScale;
  let g = cfg.gravity * gravityDir, l = cfg.lift * gravityDir;

  if (dashTimer > 0) { speed *= 3; jellyfish.velocity = 0; dashTimer--; }
  else if (featherTimer > 0) { g *= 0.4; l *= 0.6; featherTimer--; }
  
  jellyfish.gravity = g; jellyfish.lift = l;
  jellyfish.update(); jellyfish.draw();

  if (jellyfish.offscreen()) handleCollision(-1);

  if (frameCount % 80 === 0) {
    let h = random(100, height - 300);
    pipes.push(new Pipe({ x: width, width: 70, height: h, gap: 200 }));
    if (random() > 0.5) items.push(new Item(width + 35, h + 100));
  }

  pipes.forEach((p, i) => {
    p.x -= speed; p.draw();
    if (dashTimer <= 0 && p.hits(jellyfish)) handleCollision(i);
    if (!p.passed && p.x < jellyfish.x) {
      p.passed = true; score++; globalStats.totalPipes++;
      sounds.score.play();
      if (cfg.special === "flip" && score % 3 === 0) {
        gravityDir *= -1; sessionStats.flips++;
        showToast(gravityDir === 1 ? "Gravity Restored" : "Gravity Inverted");
      }
      checkAchievements();
    }
  });
  pipes = pipes.filter(p => p.x > -100);

  items.forEach((it, i) => {
    it.x -= speed; it.draw();
    if (dist(it.x, it.y, jellyfish.x, jellyfish.y) < 45) { applyEffect(it.type); items.splice(i, 1); }
  });
  items = items.filter(it => it.x > -50);

  drawUI();
  if (millis() - sessionStats.noClickStartTime > 5000) checkAchievements('a8');
}

// ================== 3. UI & Interaction ==================
function drawMenu() {
  fill(255); textSize(60); stroke(0); strokeWeight(4);
  text("JELLY DRIFT", width / 2, height * 0.15);
  noStroke();
  levels.forEach((l, i) => {
    let y = height * 0.28 + i * 85;
    fill(255, 200); rect(width/2 - 150, y, 300, 55, 15);
    fill(0); textSize(20); text(l.name, width/2, y + 28);
  });
  fill(255); text("🏆 Hall of Fame", width/2, height * 0.85);
  text(`High Score: ${globalStats.highScore}`, width/2, height * 0.92);
}

function mousePressed() {
  if (gameState === "menu") {
    levels.forEach((l, i) => { if (mouseY > height*0.28+i*85 && mouseY < height*0.28+i*85+55) startGame(i); });
    if (mouseY > height * 0.8) gameState = "achievements";
  } else if (gameState === "playing") {
    gameStarted = true;
    if (dashTimer <= 0) jellyfish.flap();
    sessionStats.noClickStartTime = millis();
    sessionStats.clicks.push(millis());
    sessionStats.clicks = sessionStats.clicks.filter(t => millis() - t < 1000);
    if (sessionStats.clicks.length >= 5) checkAchievements('a19');
  } else gameState = "menu";
}

// ================== 4. Items & System ==================
class Item {
  constructor(x, y) {
    this.x = x; this.y = y; this.r = 20;
    let r = random();
    this.type = r < 0.4 ? 'shield' : (r < 0.7 ? 'dash' : 'feather');
  }
  draw() {
    push(); strokeWeight(2); stroke(255);
    if (this.type === 'shield') fill(52, 152, 219); 
    else if (this.type === 'dash') fill(46, 204, 113); 
    else fill(155, 89, 182); 
    ellipse(this.x, this.y, this.r * 2);
    fill(255); textSize(20); 
    text(this.type === 'shield' ? "❤️" : (this.type === 'dash' ? "⚡" : "☁️"), this.x, this.y);
    pop();
  }
}

function applyEffect(type) {
  sessionStats.itemsUsed++; globalStats.totalItems++;
  if (type === 'shield') { 
    if (lives === 1) checkAchievements('a16'); 
    lives++; 
    showToast("Extra Life!"); 
  }
  else if (type === 'dash') { dashTimer = 180; showToast("Dash Active!"); }
  else if (type === 'feather') { featherTimer = 300; showToast("Light-Weight!"); }
  checkAchievements();
}

function handleCollision(idx) {
  lives--; globalStats.totalDeaths++; sounds.die.play();
  if (idx !== -1) pipes.splice(idx, 1);
  if (millis() - sessionStats.gameStartTime < 3000) checkAchievements('a9'); 
  if (lives <= 0) {
    globalStats.totalScore += score;
    if (score === 99) checkAchievements('a15'); 
    globalStats.highScore = max(globalStats.highScore, score);
    gameState = "menu";
    saveData(); 
  } else {
    jellyfish.y = height / 2; jellyfish.velocity = 0; dashTimer = 0; featherTimer = 0;
    showToast("Life Lost!");
  }
}

function checkAchievements(id = null) {
  const unlock = (i) => { 
    if (!achievements[i]) { 
      achievements[i] = true; 
      showToast("🏆 Achievement Unlocked!"); 
      saveData(); 
    } 
  };
  if (id) return unlock(id);
  if (score >= 10) unlock('a1');
  if (globalStats.totalPipes >= 100) unlock('a2');
  if (score >= 100) unlock('a7');
  if (Object.keys(achievements).length >= 19) unlock('a20');
}

function showToast(m) { toast = { text: m, timer: 120 }; }

function drawToast() {
  if (toast.timer <= 0) return;
  push(); fill(0, 200); noStroke(); 
  rectMode(CENTER);
  rect(width/2, 40, textWidth(toast.text) + 40, 40, 20);
  fill(255); text(toast.text, width/2, 40); pop();
  toast.timer--;
}

function drawUI() {
  fill(255); stroke(0); strokeWeight(2); textAlign(LEFT);
  text(`Score: ${score}  Lives: ${"❤️".repeat(max(0, lives))}`, 20, 40);
  textAlign(CENTER); noStroke();
}

function drawStartHint() {
  push(); fill(255, map(sin(frameCount * 0.1), -1, 1, 100, 255));
  text("TAP TO FLAP", width / 2, height / 2 + 100);
  textSize(40); text("👆", width / 2, height / 2 + 50); pop();
}