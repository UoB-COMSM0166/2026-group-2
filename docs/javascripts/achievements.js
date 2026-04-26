// ================== achievements.js ==================

const achievementList = [
  { id: 'a1', label: 'Novice Flyer', desc: 'Score 10 pts in one run' },
  { id: 'a2', label: 'Pipe Master', desc: 'Pass 100 pipes total' },
  { id: 'a3', label: 'Pharmacist', desc: 'Use 20 items total' },
  { id: 'a4', label: 'Never Give Up', desc: 'Die 50 times total' },
  { id: 'a5', label: 'Upside Down', desc: 'Score 20 in Reverse Mode' },
  { id: 'a6', label: 'Space Vertigo', desc: '10 gravity flips in one run' },
  { id: 'a7', label: 'Legendary Wings', desc: 'Score 100 pts in one run' },
  { id: 'a8', label: 'Zen Moment', desc: 'No clicks for 5 seconds' }, 
  { id: 'a9', label: 'Fast Demise', desc: 'Die within 3s of starting' },
  { id: 'a10', label: 'Eight Lives', desc: 'Reach 8 lives in one run' },
  { id: 'a11', label: 'Pure Flight', desc: 'Score 30 without using items' },
  { id: 'a12', label: 'Gravity Buster', desc: 'Score 40 in Heavy Mode' },
  { id: 'a13', label: 'Gold Miner', desc: 'Use 10 items in one run' },
  { id: 'a14', label: 'Chaos Lord', desc: 'Score 60 in Chaos Mode' },
  { id: 'a15', label: 'Edge Expert', desc: 'Die with exactly 99 pts' },
  { id: 'a16', label: 'Resurrection', desc: 'Survive by shielding at 1 HP' },
  { id: 'a17', label: 'Flight Maniac', desc: 'Reach 1000 total score' },
  { id: 'a18', label: 'Ultimate Survival', desc: 'Survive 5 mins in one run' },
  { id: 'a19', label: 'Speed Clicker', desc: 'Click 5 times in 1 second' },
  { id: 'a20', label: 'Completionist', desc: 'Unlock all achievements' }
];

function drawAchievementScreen() {
  fill(0, 180); rectMode(CORNER); rect(0, 0, width, height);
  fill(255); noStroke(); textSize(32); textAlign(CENTER, CENTER);
  text("Hall of Fame", width / 2, 50);

  let hoveredAch = null; 

  achievementList.forEach((ach, i) => {
    let col = i < 10 ? 0 : 230, row = i % 10;
    let x = width / 2 - 220 + col, y = 80 + row * 45;
    let boxW = 210, boxH = 40;

    let isHovering = mouseX > x && mouseX < x + boxW && mouseY > y && mouseY < y + boxH;
    if (isHovering) { hoveredAch = ach; stroke(255); strokeWeight(2); } else { noStroke(); }

    fill(achievements[ach.id] ? "#2ecc71" : "#444"); 
    rect(x, y, boxW, boxH, 5);
    noStroke(); fill(255); textAlign(LEFT, CENTER); textSize(14);
    text(ach.label, x + 10, y + boxH / 2);
  });

  if (hoveredAch) drawTooltip(hoveredAch);

  textAlign(CENTER, CENTER); fill(255, 150); textSize(16);
  text("Click anywhere to return", width / 2, height - 20);
}

function drawTooltip(ach) {
  push();
  textSize(14);
  let status = achievements[ach.id] ? "[Unlocked] " : "[Locked] ";
  let tipText = status + ach.desc;
  let tipW = textWidth(tipText) + 20, tipH = 30;
  let tipX = constrain(mouseX + 15, 0, width - tipW);
  let tipY = constrain(mouseY + 15, 0, height - tipH);

  fill(20, 230); stroke(100); 
  rect(tipX, tipY, tipW, tipH, 4);
  noStroke(); fill(achievements[ach.id] ? "#a8ffb5" : "#ffbaba");
  textAlign(LEFT, CENTER); text(tipText, tipX + 10, tipY + 15);
  pop();
}

function saveData() {
  try {
    localStorage.setItem("jd_stats", JSON.stringify(globalStats));
    localStorage.setItem("jd_achieve", JSON.stringify(achievements));
  } catch(e){}
}
