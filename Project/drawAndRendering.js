// ------------------------------
// drawAndRendering.js
// ------------------------------

// Main draw loop for rendering the game
function draw() {
  // Check if the game is in state 4 and run the corresponding mode
  if (gameState === 4) {
    runMode4();
    return; 
  }

  background(30);

  // Handle cue ball placement
  if (placingCueBall && cueBallBody) {
    cueBallBody.isSensor = true;
    let { x, y } = confinePointToD(mouseX, mouseY);
    Body.setPosition(cueBallBody, { x, y });
    Body.setVelocity(cueBallBody, { x: 0, y: 0 });
    Body.setAngularVelocity(cueBallBody, 0);
  } else if (cueBallBody) {
    cueBallBody.isSensor = false;
  }

  // Adjust cue stick angle based on player input when not striking
  if (!isStriking) {
    if (isMovingLeft) {
      cueStickAngle -= radians(1);
    }
    if (isMovingRight) {
      cueStickAngle += radians(1);
    }
  }

  // Handle pocketing of balls
  handlePocketing();

  // Draw various table components
  drawTable();
  drawCushions();
  drawPockets();
  drawMetalCovers();
  drawDZone();
  drawBaulkLine();
  drawNuts();
  drawBalls();

  // Animate cue strike if currently striking
  if (isStriking) {
    animateCueStrike();
  }

  // Draw the cue stick and strength bar if applicable
  if (!placingCueBall && cueStickVisible && (isCueStickReady() || isStriking)) {
    drawCueStick();
    if (!isStriking) drawStrengthBar();
  }

  // Ensure the cue stick is visible when appropriate
  if (!placingCueBall && !cueStickVisible && isCueStickReady() && !isStriking) {
    cueStickVisible = true;
  }

  // Display instructions prompt
  fill(255);
  textAlign(CENTER, TOP);
  textSize(14);
  noStroke();
  text("Press 'i' for instructions", width / 2, 7);

  // Display instructions if toggled
  if (showInstructions) {
    displayInstructions();
  }

  // Manage cue strength animation
  if (isIncreasingStrength && cueStrength < maxCueStrength) {
    cueStrength += 0.01; 
  }
  if (isDecreasingStrength && cueStrength > minCueStrength) {
    cueStrength -= 0.01; 
  }
  cueStrength = constrain(cueStrength, minCueStrength, maxCueStrength);
}

// Handle pocketing logic for all balls
function handlePocketing() {
  let pocketedColoredBalls = [];

  // Iterate through all balls to check for pocketing
  for (let i = balls.length - 1; i >= 0; i--) {
    let ball = balls[i];
    for (let pocket of pocketsBodies) {
      let distance = dist(ball.position.x, ball.position.y, pocket.position.x, pocket.position.y);
      
      // Check if the ball is within the pocketing threshold
      if (distance < pocketRadius + ballRadius * pocketingThresholdFactor) {
        if (ball.label === "cue") {
          console.log("Cue Ball Pocketed!");
          placingCueBall = true;
          cueStickVisible = false;
          Body.setPosition(cueBallBody, { x: fixedBallPositions.white.x, y: fixedBallPositions.white.y });
          Body.setVelocity(cueBallBody, { x: 0, y: 0 });
          Body.setAngularVelocity(cueBallBody, 0);
          cueBallBody.isSensor = true;
        } else if (ball.label === "red") {
          World.remove(world, ball);
          balls.splice(i, 1);
          console.log("Red Ball Pocketed!");
          console.log("Red Ball is removed from the Array");
        } else if (["yellow", "green", "brown", "blue", "pink", "black"].includes(ball.label)) {
          console.log(`${ball.label.toUpperCase()} Ball Pocketed!`);
          pocketedColoredBalls.push(ball);
        }
        break;
      }
    }
  }

  // Handle multiple colored balls pocketed simultaneously
  if (pocketedColoredBalls.length > 1) {
    displayErrorMessage("Two or more colored balls pocketed at once! Resetting them.");
    pocketedColoredBalls.forEach(ball => {
      const defaultPosition = fixedBallPositions[ball.label];
      if (defaultPosition) {
        Body.setPosition(ball, { x: defaultPosition.x, y: defaultPosition.y });
        Body.setVelocity(ball, { x: 0, y: 0 });
        Body.setAngularVelocity(ball, 0);
      }
    });
  } 
  // Handle single colored ball pocketed
  else if (pocketedColoredBalls.length === 1) {
    const ball = pocketedColoredBalls[0];

    if (gameState === 4) {
      checkMode4Potting(ball);
      if (!mode4GameOver) {
        World.remove(world, ball);
        balls.splice(balls.indexOf(ball), 1);
      }
      return;
    }

    const defaultPosition = fixedBallPositions[ball.label];
    if (defaultPosition) {
      Body.setPosition(ball, { x: defaultPosition.x, y: defaultPosition.y });
      Body.setVelocity(ball, { x: 0, y: 0 });
      Body.setAngularVelocity(ball, 0);
    }
  }
}

// Display an error message on the screen
function displayErrorMessage(message) {
  fill(255, 0, 0);
  textSize(24);
  textAlign(CENTER, CENTER);
  text(message, width / 2, height / 2);
  setTimeout(() => {
    redraw(); 
  }, 3000);
}

// Draw the main table with gradient rim
function drawTable() {
  noFill();
  for (let i = 0; i < rimThickness; i++) {
    let inter = map(i, 0, rimThickness, 0, 1);
    stroke(lerpColor(color("#6B4226"), color("#8B4513"), inter));
    strokeWeight(1);
    rectMode(CENTER);
    rect(
      width / 2, 
      height / 2, 
      tableWidth + rimThickness * 2 - i * 2, 
      tableHeight + rimThickness * 2 - i * 2, 
      30
    );
  }

  fill("#228B22");
  noStroke();
  rectMode(CORNER);
  rect(rimThickness, rimThickness, tableWidth, tableHeight);
}

// Draw the cushions with shadows
function drawCushions() {
  const numShadowLayers = 6;
  cushionVertices.forEach((cushion, index) => {
    const shadowX = cushionShadowOffsets[index].shadowX;
    const shadowY = cushionShadowOffsets[index].shadowY;

    for (let i = 0; i < numShadowLayers; i++) {
      let alpha = map(i, 0, numShadowLayers, 50, 0);
      fill(`rgba(0,0,0,${alpha / 255})`);
      beginShape();
      cushion.forEach(v => {
        vertex(v.x + i * shadowX, v.y + i * shadowY);
      });
      endShape(CLOSE);
    }

    fill("#32CD32"); 
    beginShape();
    cushion.forEach(v => {
      vertex(v.x, v.y);
    });
    endShape(CLOSE);
  });
}

// Draw the pockets with glow effect
function drawPockets() {
  noFill();
  for (let i = 0; i < 15; i++) {
    let glowAlpha = map(i, 0, 15, 50, 0);
    stroke(`rgba(0,0,0,${glowAlpha/255})`);
    strokeWeight(1);
    ellipse(rimThickness, rimThickness, pocketRadius * 2 + i);
    ellipse(width - rimThickness, rimThickness, pocketRadius * 2 + i);
    ellipse(rimThickness, height - rimThickness, pocketRadius * 2 + i);
    ellipse(width - rimThickness, height - rimThickness, pocketRadius * 2 + i);
    ellipse(width / 2, rimThickness, pocketRadius * 2 + i);
    ellipse(width / 2, height - rimThickness, pocketRadius * 2 + i);
  }
  fill("black");
  noStroke();
  ellipse(rimThickness, rimThickness, pocketRadius * 2);
  ellipse(width - rimThickness, rimThickness, pocketRadius * 2);
  ellipse(rimThickness, height - rimThickness, pocketRadius * 2);
  ellipse(width - rimThickness, height - rimThickness, pocketRadius * 2);
  ellipse(width / 2, rimThickness, pocketRadius * 2);
  ellipse(width / 2, height - rimThickness, pocketRadius * 2);
}

// Draw metal covers around the pockets
function drawMetalCovers() {
  let metalColors = [color("#C0C0C0"), color("#A9A9A9"), color("#808080")]; 
  let thickness = 10; 

  let pocketPositions = [
    [rimThickness, rimThickness],
    [width - rimThickness, rimThickness],
    [rimThickness, height - rimThickness],
    [width - rimThickness, height - rimThickness],
    [width / 2, rimThickness],
    [width / 2, height - rimThickness],
  ];

  let arcAngles = [
    [radians(90), radians(360)],
    [radians(180), radians(450)],
    [radians(0), radians(270)],
    [radians(-90), radians(180)],
    [radians(180), radians(360)],
    [radians(360), radians(180)],
  ];

  // Draw arcs for each pocket cover
  for (let i = 0; i < pocketPositions.length; i++) {
    let [x, y] = pocketPositions[i];
    let [startAngle, endAngle] = arcAngles[i];

    for (let j = 0; j < thickness; j++) {
      let inter = map(j, 0, thickness, 0, 1);
      stroke(lerpColor(metalColors[0], metalColors[2], inter));
      strokeWeight(1);
      noFill();
      arc(x, y, pocketRadius * 2 + j, pocketRadius * 2 + j, startAngle, endAngle);
    }
  }
}

// Draw the D zone on the table
function drawDZone() {
  noFill();
  for (let i = 0; i < 10; i++) {
    let glowAlpha = map(i, 0, 10, 150, 0);
    stroke(`rgba(255,255,255,${glowAlpha/255})`);
    strokeWeight(2);
    arc(dCenterX, dCenterY, dZoneRadius * 2 + i, dZoneRadius * 2 + i, radians(90), radians(270));
  }
  stroke("white");
  strokeWeight(2);
  arc(dCenterX, dCenterY, dZoneRadius * 2, dZoneRadius * 2, radians(90), radians(270));
}

// Draw the baulk line on the table
function drawBaulkLine() {
  stroke("rgba(255, 255, 255, 0.8)");
  strokeWeight(4);
  const startY = rimThickness + cushionThickness - 3;
  const endY = height - rimThickness - cushionThickness + 3;
  const baulkX = rimThickness + baulkLineDist;
  line(baulkX, startY, baulkX, endY);
}

// Draw the nuts (fixed points) on the table
function drawNuts() {
  for (let i = 1; i < 5; i++) {
    drawBeveledNut(rimThickness + i * (tableWidth / 5), rimThickness / 2);
    drawBeveledNut(rimThickness + i * (tableWidth / 5), height - rimThickness / 2);
  }
  for (let i = 1; i < 2; i++) {
    drawBeveledNut(rimThickness / 2, rimThickness + i * (tableHeight / 2));
    drawBeveledNut(width - rimThickness / 2, rimThickness + i * (tableHeight / 2));
  }
}

// Draw a single beveled nut at a specified position
function drawBeveledNut(x, y) {
  for (let i = 0; i < 6; i++) {
    let inter = map(i, 0, 5, 0.8, 0.1);
    fill(lerpColor(color("#D3D3D3"), color("#696969"), inter));
    ellipse(x, y, 8 - i, 8 - i);
  }
}

// Draw all balls on the table
function drawBalls() {
  balls.forEach(ball => {
    drawBall(ball.position.x, ball.position.y, colors[ball.label] || colors.red, ball.angle); 
  });
}

// Draw a single ball with visual details
function drawBall(x, y, ballColor, angle) {
  push();
  translate(x, y);
  rotate(angle * rotationSpeed);

  // Draw the ball body
  stroke(0);
  strokeWeight(1);
  fill(ballColor);
  ellipse(0, 0, ballDiameter);

  // Draw highlights on the ball
  noStroke();
  fill(255, 255, 255, 150);
  ellipse(-ballDiameter / 6, -ballDiameter / 6, ballDiameter / 4);

  fill(0, 0, 0, 50);
  ellipse(0, ballDiameter / 5, ballDiameter * 0.9, ballDiameter * 0.6);

  // Draw ball number if not red or white
  if (ballColor !== colors.red && ballColor !== colors.white) {
    fill(255);
    textSize(ballDiameter / 3);
    textAlign(CENTER, CENTER);
    text(getBallNumber(ballColor), 0, 0);
  }

  pop();
}

// Get the ball number based on its color
function getBallNumber(ballColor) {
  switch (ballColor) {
    case colors.yellow: return "2";
    case colors.green:  return "3";
    case colors.brown:  return "4";
    case colors.blue:   return "5";
    case colors.pink:   return "6";
    case colors.black:  return "7";
    default:            return "";
  }
}

// Draw the cue stick with detailed visuals
function drawCueStick() {
  // Do not draw the cue stick while placing the cue ball
  if (placingCueBall) return; 

  push();
  translate(cueBallBody.position.x, cueBallBody.position.y);
  rotate(cueStickAngle + PI);

  // Draw the shaft of the cue stick
  for (let i = 0; i < cueStickLength; i++) {
    let taperWidth = map(i, 0, cueStickLength, cueStickWidth, cueStickWidth * 0.5);
    let shaftColor = lerpColor(color("#C69C6D"), color("#DEB887"), map(i, 0, cueStickLength, 0, 1));
    stroke(shaftColor);
    strokeWeight(taperWidth);
    line(-currentCueOffset - i, 0, -currentCueOffset - i - 1, 0);
  }

  // Draw the grip of the cue stick
  const gripLength = cueStickLength * 0.3;
  for (let i = 0; i < gripLength; i++) {
    let gripColor = lerpColor(color("#8B4513"), color("#5C4033"), map(i, 0, gripLength, 0, 1));
    stroke(gripColor);
    strokeWeight(cueStickWidth);
    line(-currentCueOffset - cueStickLength + i, 0, -currentCueOffset - cueStickLength + i - 1, 0);
  }

  // Draw grip rings for detail
  strokeWeight(1.5);
  stroke("#5A3825");
  for (let i = 0; i < gripLength; i += 8) {
    line(-currentCueOffset - cueStickLength + i, -cueStickWidth / 2, -currentCueOffset - cueStickLength + i, cueStickWidth / 2);
  }

  // Draw tip glow effect
  noFill();
  for (let i = 0; i < tipDiameter / 2; i++) {
    let fadeAlpha = map(i, 0, tipDiameter / 2, 255, 50);
    stroke(`rgba(0,0,255,${fadeAlpha/255})`);
    ellipse(-currentCueOffset, 0, tipDiameter + i * 0.5, tipDiameter + i * 0.5);
  }

  // Draw the tip of the cue stick
  fill("#0000FF");
  noStroke();
  ellipse(-currentCueOffset, 0, tipDiameter, tipDiameter);

  // Draw additional details on the tip
  fill("#C0C0C0");
  stroke("#A9A9A9");
  strokeWeight(1);
  ellipse(-currentCueOffset - tipDiameter * 0.4, 0, tipDiameter * 1.1, tipDiameter * 1.1);
  ellipse(-currentCueOffset - tipDiameter * 0.4, 0, tipDiameter * 0.9, tipDiameter * 0.9);

  // Draw shine lines on the cue stick
  noFill();
  for (let i = 0; i < cueStickLength; i += 20) {
    let shineWidth = map(i, 0, cueStickLength, cueStickWidth * 0.2, cueStickWidth * 0.05);
    stroke("rgba(255, 255, 255, 0.3)");
    strokeWeight(shineWidth);
    line(-currentCueOffset - i, -shineWidth, -currentCueOffset - i, shineWidth);
  }

  pop();
}

// Draw the strength bar for cue strike
function drawStrengthBar() {
  const barWidth = 20;
  const barHeight = 200;
  const barX = 1270;
  const barY = 90;

  // Draw the background of the strength bar
  fill(100);
  noStroke();
  rect(barX, barY, barWidth, barHeight);

  // Calculate the filled height based on cue strength
  const filledHeight = map(cueStrength, minCueStrength, maxCueStrength, 0, barHeight);

  // Draw the gradient fill for the strength bar
  push();
  strokeWeight(1);
  for (let i = 0; i < filledHeight; i++) {
    let ratio = i / barHeight;
    let c;
    if (ratio < 0.5) {
      let nt = ratio / 0.5;
      c = lerpColor(color("green"), color("yellow"), nt);
    } else {
      let nt = (ratio - 0.5) / 0.5;
      c = lerpColor(color("yellow"), color("red"), nt);
    }
    stroke(c);
    line(barX, barY + barHeight - i, barX + barWidth, barY + barHeight - i);
  }
  pop();

  // Draw labels and strength value
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(14);
  text("Force", barX + barWidth / 2, barY - 20);
  text(cueStrength.toFixed(2), barX + barWidth / 2, barY + barHeight + 15);
}

// Display the game instructions overlay
function displayInstructions() {
  let boxX = 450;
  let boxY = 150;
  let boxW = 400;
  let boxH = 320; 

  // Draw shadow box for instructions
  noStroke();
  fill(0, 0, 0, 120); 
  rect(boxX + 6, boxY + 6, boxW, boxH, 20);

  // Draw gradient background for instructions
  for (let i = 0; i < 20; i++) {
    let inter = map(i, 0, 20, 0, 1);
    fill(lerpColor(color(50, 50, 70), color(120, 120, 150), inter)); 
    rect(boxX + i, boxY + i, boxW - i * 2, boxH - i * 2, 20);
  }

  // Draw border with glow effect
  noFill();
  for (let i = 0; i < 5; i++) {
    stroke(`rgba(180, 200, 255, ${0.2 * (5 - i)})`);
    strokeWeight(2);
    rect(boxX + i, boxY + i, boxW - i * 2, boxH - i * 2, 20);
  }

  // Draw instruction text
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);

  textSize(16);
  textStyle(BOLD);
  text("How to Play:", boxX + 30, boxY + 20);

  textSize(14);
  textStyle(NORMAL);
  text(
    `1. Select Game Mode:
   - Press '1' for Fixed Red Positions
   - Press '2' for Random Red Positions
   - Press '3' for Random Red & Colored Positions
   - Press '4' for Mode 4 (Precision Snooker)

2. Place the Cue Ball:
   - Move mouse inside the D zone 
   - Click to place the cue ball

3. Aim and Strike:
   - Aim: Mouse or Left/Right Arrow Keys
   - Strength: Up/Down Arrows or Mouse Wheel
   - Strike: Click or Spacebar
`,
    boxX + 30,
    boxY + 50
  );

  // Draw decorative glow elements
  for (let i = 0; i < 10; i++) {
    let glowAlpha = map(i, 0, 10, 60, 0);
    fill(`rgba(255, 255, 255, ${glowAlpha / 255})`);
    ellipse(boxX + boxW - 20, boxY + 20, 15 + i);
    ellipse(boxX + 20, boxY + boxH - 20, 15 + i);
  }
}
