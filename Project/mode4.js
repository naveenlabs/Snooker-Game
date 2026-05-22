// ------------------------------
// mode4.js
// ------------------------------

// Timer settings for Mode 4
let mode4Timer = 180;           
let mode4StartMillis = 0;
let mode4IsTimerRunning = false;

// Arrays to hold Mode 4 specific balls
let mode4ColoredBalls = [];     
let mode4RedBalls = [];         

// Sequence and management of colored balls
let mode4ColorSequence = ["yellow", "green", "brown"]; 
let mode4CurrentColorIndex = 0; 

// Management of designated pockets
let mode4DesignatedPocketIndex = 0;
let mode4LastPocketChangeMillis = 0;
const MODE4_POCKET_CHANGE_INTERVAL = 30000;

// Power-up related variables
let mode4PowerUpBody = null;
let mode4PowerUpType = null;
let mode4PowerUpSpawnMillis = 0;
let mode4PowerUpActive = false;
const MODE4_POWERUP_DURATION = 10000;
const MODE4_POWERUP_TYPES = ["time", "moveReds", "placeCue"];

// Flag to allow cue ball placement anywhere
let mode4CanPlaceCueBallAnywhere = false;

// Positions of all pockets
let mode4PocketPositions = [];

// Game over and message variables
let mode4GameOver = false;
let mode4WinMessage = "";
let mode4LoseMessage = "";

// Initializes Mode 4 by resetting all relevant variables,
// removing existing balls, resetting the cue ball,
// and setting up colored and red balls.
function initMode4() {
  mode4ColoredBalls = [];
  mode4RedBalls = [];
  mode4PowerUpBody = null;
  mode4PowerUpType = null;
  mode4PowerUpActive = false;
  mode4CanPlaceCueBallAnywhere = false;
  mode4GameOver = false;
  mode4WinMessage = "";
  mode4LoseMessage = "";

  // Remove all balls except the cue ball and reset its position
  removeAllBallsExceptCue();
  resetCueBall(); 

  // Reset timer
  mode4Timer = 180;
  mode4IsTimerRunning = false;  

  // Reset color sequence
  mode4ColorSequence = ["yellow", "green", "brown"];
  mode4CurrentColorIndex = 0;

  // Define pocket positions based on table dimensions
  mode4PocketPositions = [
    { x: rimThickness,            y: rimThickness },
    { x: width - rimThickness,    y: rimThickness },
    { x: rimThickness,            y: height - rimThickness },
    { x: width - rimThickness,    y: height - rimThickness },
    { x: width / 2,               y: rimThickness },
    { x: width / 2,               y: height - rimThickness },
  ];

  // Select a random pocket as the designated pocket
  mode4DesignatedPocketIndex = floor(random(mode4PocketPositions.length));
  mode4LastPocketChangeMillis = millis();

  // Create colored and red balls for Mode 4
  createMode4ColoredBalls();
  createMode4RedBalls();
}

// Main loop for running Mode 4. Handles game logic, rendering, and state updates.
function runMode4() {
  // If the game is over, display the end screen
  if (mode4GameOver) {
    background(30);
    displayMode4EndScreen();
    return;
  }

  background(30);

  // Adjust cue stick angle based on player input when not striking
  if (!isStriking) {
    if (isMovingLeft) {
      cueStickAngle -= radians(1);
    }
    if (isMovingRight) {
      cueStickAngle += radians(1);
    }
  }

  // Manage cue strength animation
  if (isIncreasingStrength && cueStrength < maxCueStrength) {
    cueStrength += 0.01; 
  }
  if (isDecreasingStrength && cueStrength > minCueStrength) {
    cueStrength -= 0.01; 
  }
  cueStrength = constrain(cueStrength, minCueStrength, maxCueStrength);

  // Handle cue ball placement based on Mode 4 settings
  if (mode4CanPlaceCueBallAnywhere && placingCueBall && cueBallBody) {
    cueBallBody.isSensor = true;
    let { x, y } = confinePointToTable(mouseX, mouseY);
    Body.setPosition(cueBallBody, { x, y });
    Body.setVelocity(cueBallBody, { x: 0, y: 0 });
    Body.setAngularVelocity(cueBallBody, 0);
  }
  else if (!mode4CanPlaceCueBallAnywhere) {
    if (placingCueBall && cueBallBody) {
      cueBallBody.isSensor = true;
      let { x, y } = confinePointToD(mouseX, mouseY);
      Body.setPosition(cueBallBody, { x, y });
      Body.setVelocity(cueBallBody, { x: 0, y: 0 });
      Body.setAngularVelocity(cueBallBody, 0);
    } else if (cueBallBody) {
      cueBallBody.isSensor = false;
    }
  }

  // Update game timer, power-ups, and pocket assignments
  updateMode4Timer();   
  updateMode4PowerUp(); 
  checkMode4PocketChange();

  // Draw all table components
  drawTable();
  drawCushions();
  drawPockets();
  drawMetalCovers();
  drawDZone();
  drawBaulkLine();
  drawNuts();

  // Handle pocketing logic for Mode 4
  handlePocketing();

  drawBalls();

  // Draw and animate the cue stick and strength bar if applicable
  if (!placingCueBall && cueStickVisible && (isCueStickReady() || isStriking)) {
    if (isStriking) {
      animateCueStrike();
    }
    drawCueStick();
    if (!isStriking) {
      drawStrengthBar();
    }
  }

  // Draw HUD elements specific to Mode 4
  drawMode4HUD();

  // Draw active power-ups
  drawMode4PowerUp();

  // Draw additional animations for Mode 4
  drawMode4Animation();

  // Display instructions overlay if toggled
  if (showInstructions) {
    displayMode4Instructions();
  }
}

// Confines a point to within the table boundaries.
function confinePointToTable(x, y) {
  const minX = rimThickness + cushionThickness;
  const maxX = width - rimThickness - cushionThickness;
  const minY = rimThickness + cushionThickness;
  const maxY = height - rimThickness - cushionThickness;

  x = constrain(x, minX, maxX);
  y = constrain(y, minY, maxY);

  return { x, y };
}

// Handles collisions specific to Mode 4.
// Ends the game if a red ball is hit or other losing conditions are met.
function handleCollisionMode4(event) {
  // Do not handle collisions while placing the cue ball
  if (placingCueBall) return;

  const pairs = event.pairs;
  pairs.forEach(pair => {
    const bodyA = pair.bodyA;
    const bodyB = pair.bodyB;

    // Check if either body is the cue ball
    if (bodyA.label === "cue" || bodyB.label === "cue") {
      let otherBody = bodyA.label === "cue" ? bodyB : bodyA;

      // If a red ball is hit, end the game
      if (otherBody.label === "red") {
        console.log("Cue-Red");
        mode4LoseMessage = "You hit a red ball! Game Over.";
        mode4GameOver = true; 
        return;
      }

      // Log colored ball hits
      if (["yellow", "green", "brown", "blue", "pink", "black"].includes(otherBody.label)) {
        console.log(`Cue-Colour: Detected ${otherBody.label.toUpperCase()} ball.`);
      }

      // Log cushion hits
      if (otherBody.label === "wall") {
        console.log("Cue-Cushion");
      }

      // Activate power-up if the cue hits a power-up
      if (
        mode4PowerUpActive &&
        otherBody === mode4PowerUpBody
      ) {
        console.log(`Cue-PowerUp: Detected a ${mode4PowerUpType.toUpperCase()} power-up!`);
        activateMode4PowerUp(); 
      }
    }
  });
}

// Handles mouse press events specific to Mode 4.
// Allows placing the cue ball and initiating cue strikes.
function mousePressedMode4() {
  // Handle cue ball placement when allowed to place anywhere
  if (mode4CanPlaceCueBallAnywhere && placingCueBall && cueBallBody) {
    if (isValidBallPosition(mouseX, mouseY)) {
      Body.setPosition(cueBallBody, { x: mouseX, y: mouseY });
      Body.setVelocity(cueBallBody, { x: 0, y: 0 });
      Body.setAngularVelocity(cueBallBody, 0);
      cueBallBody.isSensor = false;
      placingCueBall = false;
      cueStickVisible = true;
      mode4CanPlaceCueBallAnywhere = false; 
    } else {
      displayErrorMessage("Invalid Cue Ball Placement!");
    }
    return; 
  }

  // Handle cue ball placement within the D zone
  if (!mode4CanPlaceCueBallAnywhere && placingCueBall && isWithinD(mouseX, mouseY)) {
    if (isValidBallPosition(mouseX, mouseY)) {
      Body.setPosition(cueBallBody, { x: mouseX, y: mouseY });
      Body.setVelocity(cueBallBody, { x: 0, y: 0 });
      Body.setAngularVelocity(cueBallBody, 0);
      cueBallBody.isSensor = false;
      placingCueBall = false;
      cueStickVisible = true;

      // Start the game timer if it's not already running
      if (!mode4IsTimerRunning) {
        mode4StartMillis = millis();
        mode4IsTimerRunning = true;
      }
    } else {
      displayErrorMessage("Invalid Cue Ball Placement!");
    }
    return;
  }

  // Initiate cue strike if conditions are met
  if (!placingCueBall && isCueStickReady() && cueStickVisible && !isStriking) {
    startCueStrikeAnimation();
  }
}

// Creates colored balls for Mode 4 based on the color sequence.
// Ensures each ball is placed in a valid position on the table.
function createMode4ColoredBalls() {
  mode4ColorSequence.forEach(colorName => {
    let validPosFound = false;
    let x, y;

    // Find a valid position for the colored ball
    while (!validPosFound) {
      x = random(
        rimThickness + pocketRadius + cushionThickness,
        width - rimThickness - pocketRadius - cushionThickness
      );
      y = random(
        rimThickness + pocketRadius + cushionThickness,
        height - rimThickness - pocketRadius - cushionThickness
      );
      if (isValidBallPosition(x, y)) validPosFound = true;
    }

    // Create and add the colored ball to the world and arrays
    const ball = Bodies.circle(x, y, ballRadius, {
      restitution: 0.9,
      friction: 0.005,
      frictionAir: 0.01,
      label: colorName,
    });
    World.add(world, ball);
    balls.push(ball);
    mode4ColoredBalls.push(ball);
  });
}

// Creates red balls for Mode 4.
// Ensures each red ball is placed in a valid position on the table.
function createMode4RedBalls() {
  for (let i = 0; i < 3; i++) {
    let validPosFound = false;
    let x, y;

    // Find a valid position for the red ball
    while (!validPosFound) {
      x = random(
        rimThickness + pocketRadius + cushionThickness,
        width - rimThickness - pocketRadius - cushionThickness
      );
      y = random(
        rimThickness + pocketRadius + cushionThickness,
        height - rimThickness - pocketRadius - cushionThickness
      );
      if (isValidBallPosition(x, y)) validPosFound = true;
    }

    // Create and add the red ball to the world and arrays
    const redBall = Bodies.circle(x, y, ballRadius, {
      restitution: 0.9,
      friction: 0.005,
      frictionAir: 0.01,
      label: "red",
    });
    World.add(world, redBall);
    balls.push(redBall);
    mode4RedBalls.push(redBall);
  }
}

// Updates the game timer for Mode 4.Ends the game if the timer runs out.
function updateMode4Timer() {
  if (!mode4IsTimerRunning) return;

  const elapsedSec = (millis() - mode4StartMillis) / 1000;
  const remaining = 180 - elapsedSec;
  mode4Timer = Math.max(0, remaining);

  // Check if time has run out
  if (mode4Timer <= 0) {
    mode4LoseMessage = "Time is up! You lose.";
    mode4GameOver = true;
  }
}

// Updates and manages power-ups in Mode 4.
// Spawns new power-ups randomly and handles their duration.
function updateMode4PowerUp() {
  if (!mode4IsTimerRunning) return;

  const now = millis();

  // Handle active power-up duration
  if (mode4PowerUpActive && mode4PowerUpBody) {
    if (now - mode4PowerUpSpawnMillis >= MODE4_POWERUP_DURATION) {
      World.remove(world, mode4PowerUpBody);
      mode4PowerUpBody = null;
      mode4PowerUpActive = false;
      mode4PowerUpType = null;
    }
    return;
  }

  // Randomly spawn a new power-up
  if (random(1) < 0.01) {
    spawnMode4PowerUp();
  }
}

// Spawns a new power-up at a random valid position on the table.
function spawnMode4PowerUp() {
  let x = random(
    rimThickness + pocketRadius + cushionThickness,
    width - rimThickness - pocketRadius - cushionThickness
  );
  let y = random(
    rimThickness + pocketRadius + cushionThickness,
    height - rimThickness - pocketRadius - cushionThickness
  );

  // Create the power-up body
  mode4PowerUpBody = Bodies.circle(x, y, ballRadius * 0.6, {
    isStatic: true,
    isSensor: true,
    label: "powerup",
  });
  World.add(world, mode4PowerUpBody);

  // Randomly select a power-up type
  mode4PowerUpType = random(MODE4_POWERUP_TYPES);
  mode4PowerUpSpawnMillis = millis();
  mode4PowerUpActive = true;
}

// Activates the current power-up based on its type.
function activateMode4PowerUp() {
  switch (mode4PowerUpType) {
    case "time":
      // Add 15 seconds to the timer
      mode4StartMillis += 15000; 
      break;

    case "moveReds":
      // Relocate all red balls to new valid positions
      mode4RedBalls.forEach(rb => {
        let validPosFound = false;
        let x, y;
        while (!validPosFound) {
          x = random(
            rimThickness + pocketRadius + cushionThickness,
            width - rimThickness - pocketRadius - cushionThickness
          );
          y = random(
            rimThickness + pocketRadius + cushionThickness,
            height - rimThickness - pocketRadius - cushionThickness
          );
          if (isValidBallPosition(x, y)) validPosFound = true;
        }
        Body.setPosition(rb, { x, y });
        Body.setVelocity(rb, { x: 0, y: 0 });
        Body.setAngularVelocity(rb, 0);
      });
      break;

    case "placeCue":
      // Allow placing the cue ball anywhere on the table
      if (cueBallBody) {
        Body.setVelocity(cueBallBody, { x: 0, y: 0 });
        Body.setAngularVelocity(cueBallBody, 0);
      }
      mode4CanPlaceCueBallAnywhere = true;
      placingCueBall = true;
      break;
  }

  // Remove the power-up from the world
  if (mode4PowerUpBody) {
    World.remove(world, mode4PowerUpBody);
  }
  mode4PowerUpBody = null;
  mode4PowerUpActive = false;
  mode4PowerUpType = null;
}

// Checks if it's time to change the designated pocket in Mode 4.
// Updates the designated pocket index every 30 seconds.
function checkMode4PocketChange() {
  const now = millis();
  if (now - mode4LastPocketChangeMillis >= MODE4_POCKET_CHANGE_INTERVAL) {
    mode4DesignatedPocketIndex = (mode4DesignatedPocketIndex + 1) % mode4PocketPositions.length;
    mode4LastPocketChangeMillis = now;
  }
}

// Draws the Heads-Up Display (HUD) for Mode 4,
// showing the remaining time and the next ball to pot.
function drawMode4HUD() {
  fill(255);
  textSize(16);
  textAlign(LEFT, TOP);
  noStroke();
  text(`Time Left: ${mode4Timer.toFixed(1)}s`, 70, 3);

  // Display the next color to pot or a completion message
  if (mode4CurrentColorIndex < mode4ColorSequence.length) {
    const currentColor = mode4ColorSequence[mode4CurrentColorIndex];
    text(`Pot Next: ${currentColor.toUpperCase()}`, 70, 20);
  } else {
    text("All Colors Potted!", 20, 40);
  }
}

// Displays the end screen for Mode 4,
// showing either a win or lose message.
function displayMode4EndScreen() {
  fill(255);
  textSize(32);
  textAlign(CENTER, CENTER);

  if (mode4WinMessage !== "") {
    text(mode4WinMessage, width / 2, height / 2);
  } else if (mode4LoseMessage !== "") {
    text(mode4LoseMessage, width / 2, height / 2);
  } else {
    text("Game Over!", width / 2, height / 2);
  }
}

// Handles the logic when a ball is potted in Mode 4.
// Checks for correct sequence and designated pocket. Ends the game if conditions are not met.
function checkMode4Potting(ball) {
  // Remove the potted ball from the world and arrays
  World.remove(world, ball);
  let index = balls.indexOf(ball);
  if (index !== -1) {
    balls.splice(index, 1);
  }

  // Check if the potted ball is the correct next ball in sequence
  if (ball.label !== mode4ColorSequence[mode4CurrentColorIndex]) {
    mode4LoseMessage = `You potted ${ball.label.toUpperCase()} out of sequence!`;
    mode4GameOver = true;
    return;
  }

  // Check if the ball was potted in the designated pocket
  const designatedPocketPos = mode4PocketPositions[mode4DesignatedPocketIndex];
  const distToDesignated = dist(
    ball.position.x,
    ball.position.y,
    designatedPocketPos.x,
    designatedPocketPos.y
  );
  if (distToDesignated > pocketRadius + ballRadius * pocketingThresholdFactor) {
    mode4LoseMessage = `Wrong pocket for ${ball.label.toUpperCase()}!`;
    mode4GameOver = true;
    return;
  }

  // Move to the next color in the sequence
  mode4CurrentColorIndex++;
  if (mode4CurrentColorIndex >= mode4ColorSequence.length) {
    mode4WinMessage = "Congratulations! You potted all colored balls!";
    mode4GameOver = true;
  }
}

// Draws the active power-up on the table with visual effects.
function drawMode4PowerUp() {
  if (mode4PowerUpActive && mode4PowerUpBody) {
    push();
    translate(mode4PowerUpBody.position.x, mode4PowerUpBody.position.y);

    // Rotate the power-up for a dynamic effect
    let angle = frameCount * 0.1;
    rotate(angle);

    let outerRadius = ballDiameter * 0.8;
    let innerRadius = outerRadius * 0.45;

    // Draw the power-up shape
    stroke(255, 0, 255);
    strokeWeight(2);
    fill(255, 0, 255, 100);

    beginShape();
    for (let i = 0; i < 10; i++) {
      let r = (i % 2 === 0) ? outerRadius : innerRadius;
      let theta = (TWO_PI / 10) * i;
      vertex(r * cos(theta), r * sin(theta));
    }
    endShape(CLOSE);

    // Draw the power-up type text
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(12);

    let powerUpText = "";
    switch (mode4PowerUpType) {
      case "time":      powerUpText = "TIME";  break;
      case "moveReds":  powerUpText = "MOVE";  break;
      case "placeCue":  powerUpText = "CUE";   break;
      default:          powerUpText = "?";     break;
    }
    text(powerUpText, 0, 0);
    pop();
  }
}

// Draws additional animations for Mode 4,
// such as pulsing rings around the target and designated pockets.
function drawMode4Animation() {
  if (mode4CurrentColorIndex < mode4ColorSequence.length) {
    let targetColor = mode4ColorSequence[mode4CurrentColorIndex];
    let targetBall = mode4ColoredBalls.find(b => b.label === targetColor);

    // Animate the target ball with pulsing rings
    if (targetBall) {
      push();
      let t = frameCount * 0.05;
      let ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        let offset = i * 0.4; 
        let pulse = sin(t + offset) * 8 + 12*(i+1);
        stroke(255, 190 - i*40, 0, 120 - i*30);
        strokeWeight(2 + i);
        noFill();
        ellipse(
          targetBall.position.x,
          targetBall.position.y,
          (ballDiameter + 12 + pulse),
          (ballDiameter + 12 + pulse)
        );
      }
      pop();
    }

    // Animate the designated pocket with pulsing rings
    let designatedPocketPos = mode4PocketPositions[mode4DesignatedPocketIndex];
    if (designatedPocketPos) {
      push();
      let t2 = frameCount * 0.05;
      let ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        let offset = i * 0.4;
        let pulse2 = sin(t2 + offset) * 8 + 16*(i+1);
        stroke(255, 190 - i*40, 0, 120 - i*30);
        strokeWeight(2 + i);
        noFill();
        ellipse(
          designatedPocketPos.x,
          designatedPocketPos.y,
          (pocketRadius * 2 + 30 + pulse2),
          (pocketRadius * 2 + 30 + pulse2)
        );
      }
      pop();
    }
  }
}

// Displays an error message on the screen.
function displayErrorMessage(message) {
  fill(255, 0, 0);
  textSize(24);
  textAlign(CENTER, CENTER);
  text(message, width / 2, height / 2);

  // Redraw the screen after a delay
  setTimeout(() => {
    redraw();
  }, 3000);
}

// Displays the instructions overlay for Mode 4.
// Provides detailed game instructions and rules.
function displayMode4Instructions() {
  let boxX = 350;
  let boxY = 100;
  let boxW = 600;
  let boxH = 480; 
 
  // Draw shadow box for instructions
  noStroke();
  fill(0, 0, 0, 120); 
  rect(boxX + 6, boxY + 6, boxW, boxH, 20);

  // Draw gradient background for instructions
  for (let i = 0; i < 20; i++) {
    let inter = i / 19; 
    fill(lerpColor(color(50, 50, 70), color(120, 120, 150), inter));
    rect(boxX + i, boxY + i, boxW - i * 2, boxH - i * 2, 20);
  }

  // Draw border with glow effect
  noFill();
  for (let i = 0; i < 5; i++) {
    let alphaVal = 0.2 * (5 - i); 
    stroke(`rgba(180, 200, 255, ${alphaVal})`);
    strokeWeight(2);
    rect(boxX + i, boxY + i, boxW - i * 2, boxH - i * 2, 20);
  }

  // Draw instruction text
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);

  const instructionsText = 
`Game Description:
Dynamic Precision Snooker is a fast-paced game that challenges your accuracy, strategy, and adaptability. 
Pot three colored balls in order, following designated pocket rules, within 3 minutes.

Objective:
- Pot all three colored balls (yellow, green, brown) in the correct sequence.
- Each ball must be potted into its designated pocket, which changes every 30 seconds.

Rules:
- You must pot the highlighted ball first.
- Potting a ball out of sequence or in the wrong pocket results in a game over.
- Hitting or potting a red ball also ends the game.

Power-Ups:
- **Add 15 Seconds**: Extends the timer by 15 seconds.
- **Move Red Balls**: Relocates red balls to random positions.
- **Place Cue Ball Anywhere**: Allows repositioning of the cue ball anywhere.

Gameplay:
- Place the cue ball in the "D" zone at the start.
- Aim and shoot to pot the highlighted ball.
- After each pot, the next ball in the sequence is highlighted.
- The designated pocket changes every 30 seconds, so adapt quickly.
- Power-ups spawn randomly and can be activated by hitting them with the cue ball.

Controls:
- **Aim**: Use the mouse or arrow keys.
- **Adjust Strength**: Use up/down arrow keys or the mouse wheel.
- **Strike**: Click or press Space.

Winning Condition:
- Pot all three colored balls in the correct order and pockets within the time limit.

Losing Conditions:
- Timer runs out.
- A ball is potted out of sequence or in the wrong pocket.
- A red ball is hit or potted.`;

  // Display the instruction text within the box
  text(instructionsText, boxX + 30, boxY + 30, boxW - 60, boxH - 60);
  
  // Draw decorative glow elements
  for (let i = 0; i < 10; i++) {
    let glowAlpha = map(i, 0, 10, 60, 0);
    fill(`rgba(255, 255, 255, ${glowAlpha / 255})`);
    ellipse(boxX + boxW - 20, boxY + 20, 15 + i);
    ellipse(boxX + 20, boxY + boxH - 20, 15 + i);
  }
}
