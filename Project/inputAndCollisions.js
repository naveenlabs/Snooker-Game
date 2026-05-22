// ------------------------------
// inputAndCollisions.js
// ------------------------------

// Flags to manage cue ball placement and readiness to strike
let justPlacedCueBall = false; 
let readyToStrike = false;     

// Event handler for mouse movement
function mouseMoved() {
  // Update cue stick angle only if not striking, not moving, not placing cue ball, and cue ball exists
  if (!isStriking && !isMovingLeft && !isMovingRight && !placingCueBall && cueBallBody) {
    // Calculate angle between cue ball and mouse position
    cueStickAngle = atan2(cueBallBody.position.y - mouseY, cueBallBody.position.x - mouseX);
  }
}

// Constrain a point within the D zone
function confinePointToD(x, y) {
  let dx = x - dCenterX;
  let dy = y - dCenterY;
  let distFromDCenter = sqrt(dx * dx + dy * dy);

  // If the point is outside the D zone, adjust it to lie on the boundary
  if (distFromDCenter > dZoneRadius) {
    let angle = atan2(dy, dx);
    x = dCenterX + dZoneRadius * cos(angle);
    y = dCenterY + dZoneRadius * sin(angle);
  }

  // Ensure the x-coordinate does not exceed the center of the D zone
  if (x > dCenterX) {
    x = dCenterX;
  }

  return { x, y };
}

// Check if a point is within the D zone
function isWithinD(x, y) {
  let dx = x - dCenterX;
  let dy = y - dCenterY;
  let distSq = dx * dx + dy * dy;
  if (distSq > dZoneRadius * dZoneRadius) return false;
  if (x > dCenterX) return false;
  return true;
}

// Event handler for mouse press
function mousePressed() {
  // Handle input differently based on game state
  if (gameState === 4) {
    // In Mode 4, allow placing cue ball anywhere if conditions are met
    if (mode4CanPlaceCueBallAnywhere && placingCueBall && cueBallBody) {
      if (isValidBallPosition(mouseX, mouseY)) {
        Body.setPosition(cueBallBody, { x: mouseX, y: mouseY });
        Body.setVelocity(cueBallBody, { x: 0, y: 0 });
        Body.setAngularVelocity(cueBallBody, 0);
        cueBallBody.isSensor = false;
        placingCueBall = false;
        cueStickVisible = true;
        mode4CanPlaceCueBallAnywhere = false; 
        readyToStrike = true; 
      } else {
        displayErrorMessage("Invalid Cue Ball Placement!");
      }
      return; 
    }
    // Handle Mode 4 specific mouse press
    mousePressedMode4();
    return;
  }

  // Handle cue ball placement in other game states
  if (placingCueBall && isWithinD(mouseX, mouseY)) {
    if (cueBallBody && isValidBallPosition(cueBallBody.position.x, cueBallBody.position.y)) {
      placingCueBall = false;
      Body.setVelocity(cueBallBody, { x: 0, y: 0 });
      Body.setAngularVelocity(cueBallBody, 0);
      cueBallBody.isSensor = false;
      cueStickVisible = true;

      // Start timer for Mode 4 if applicable
      if (gameState === 4 && !mode4IsTimerRunning) {
        mode4StartMillis = millis();
        mode4IsTimerRunning = true;
      }
    } else {
      displayErrorMessage("Invalid Cue Ball Placement!");
    }
  } else if (!placingCueBall) {
    // Handle striking the cue ball
    if (gameState === 4 && readyToStrike) {
      readyToStrike = false; 
      return; 
    }

    if (isCueStickReady() && cueStickVisible && !isStriking) {
      startCueStrikeAnimation();
    }
  }
}

// Event handler for key presses
function keyPressed() {
  // Switch game modes based on number keys
  if (key === "1") {
    initializeRedBallPositions();
    coloredBallPositions = [];
    gameState = 1;
    placingCueBall = true; 
    resetCueBall();
    removeAllBallsExceptCue();
    createOtherBalls();
  } else if (key === "2") {
    randomizeRedBallPositions();
    coloredBallPositions = [];
    gameState = 2;
    placingCueBall = true;
    resetCueBall();
    removeAllBallsExceptCue();
    createOtherBalls();
  } else if (key === "3") {
    randomizeRedBallPositions();
    randomizeColoredBallPositions();
    gameState = 3;
    placingCueBall = true; 
    resetCueBall();
    removeAllBallsExceptCue();
    createOtherBalls();
  } else if (key === "4") {
    gameState = 4;
    placingCueBall = true; 
    initMode4();
  }

  // Handle movement and strength adjustments if not placing cue ball
  if (!placingCueBall && cueStickVisible && isCueStickReady()) {
    if (keyCode === UP_ARROW) {
      isIncreasingStrength = true;
    } else if (keyCode === DOWN_ARROW) {
      isDecreasingStrength = true;
    } else if (keyCode === LEFT_ARROW) {
      isMovingLeft = true;
    } else if (keyCode === RIGHT_ARROW) {
      isMovingRight = true;
    } else if (key === ' ') {
      if (!isStriking) {
        startCueStrikeAnimation();
      }
    }
  }
}

// Event handler for key releases
function keyReleased() {
  // Reset flags based on which key was released
  if (keyCode === UP_ARROW) {
    isIncreasingStrength = false;
  } else if (keyCode === DOWN_ARROW) {
    isDecreasingStrength = false;
  } else if (keyCode === LEFT_ARROW) {
    isMovingLeft = false;
  } else if (keyCode === RIGHT_ARROW) {
    isMovingRight = false;
  }
}

// Event handler for mouse wheel scrolling
function mouseWheel(event) {
  if (!placingCueBall) {
    // Adjust cue strength based on scroll direction
    if (event.delta > 0) {
      cueStrength -= 0.05;
    } else {
      cueStrength += 0.05;
    }
    cueStrength = constrain(cueStrength, minCueStrength, maxCueStrength);
  }
}

// Reset the cue ball to its default position and state
function resetCueBall() {
  if (cueBallBody) {
    Body.setPosition(cueBallBody, { x: fixedBallPositions.white.x, y: fixedBallPositions.white.y });
    Body.setVelocity(cueBallBody, { x: 0, y: 0 });
    Body.setAngularVelocity(cueBallBody, 0);
    Body.setAngle(cueBallBody, 0);
    cueStickAngle = 0;
    cueStrength = 0.3; 
    cueBallBody.isSensor = true; 
    placingCueBall = true;
    readyToStrike = false; 
  }
}

// Remove a specific ball from the world and balls array
function removeBall(ball) {
  World.remove(world, ball);
  balls = balls.filter(b => b !== ball);
}

// Remove all balls except the cue ball from the world and balls array
function removeAllBallsExceptCue() {
  balls = balls.filter(b => {
    if (b.label === 'cue') {
      return true;
    } else {
      World.remove(world, b);
      return false;
    }
  });
}

// Check if the cue stick is ready to strike (all balls are stationary)
function isCueStickReady() {
  for (let ball of balls) {
    if (ball.speed > 0.05) return false;
  }
  return true;
}

// Initialize the cue strike animation
function startCueStrikeAnimation() {
  isStriking = true;
  strikeStartFrame = frameCount;

  // Define minimum and maximum duration for the strike animation based on cue strength
  let minDuration = 10; 
  let maxDuration = 30;
  totalStrikeFrames = int(map(cueStrength, minCueStrength, maxCueStrength, minDuration, maxDuration));

  // Calculate frames for pulling back and striking phases
  pullBackFrames = int(totalStrikeFrames * 0.67);
  strikeFrames = totalStrikeFrames - pullBackFrames;

  // Define pull back distance based on cue strength
  let minPullBackDistance = 0; 
  let maxPullBackDistance = 100; 
  pullBackDist = map(cueStrength, minCueStrength, maxCueStrength, minPullBackDistance, maxPullBackDistance);

  // Set initial phase for the animation
  cueAnimationPhase = 1; 
}

// Animate the cue strike over frames
function animateCueStrike() {
  let elapsed = frameCount - strikeStartFrame;

  if (cueAnimationPhase === 1) {
    // Pull back phase of the cue strike
    let t = elapsed / pullBackFrames;
    if (t > 1) {
      t = 1;
      cueAnimationPhase = 2;
      strikeStartFrame = frameCount; 
    }
    currentCueOffset = baseCueOffset + pullBackDist * t;
  } else if (cueAnimationPhase === 2) {
    // Strike phase of the cue strike
    let t = (elapsed) / strikeFrames;
    if (t > 1) {
      t = 1;
      cueAnimationPhase = 0;
      actuallyStrikeCueBall();
      isStriking = false;
      currentCueOffset = baseCueOffset; 
    } else {
      currentCueOffset = lerp(baseCueOffset + pullBackDist, finalCueOffset, t);
    }
  }
}

// Apply force to the cue ball to simulate a strike
function actuallyStrikeCueBall() {
  if (cueBallBody) {
    const forceMagnitude = cueStrength * 0.012; 
    const force = {
      x: forceMagnitude * cos(cueStickAngle + PI),
      y: forceMagnitude * sin(cueStickAngle + PI)
    };
    Body.applyForce(
      cueBallBody, 
      { x: cueBallBody.position.x, y: cueBallBody.position.y }, 
      force
    );
  }
}

// Event handler for key typing
function keyTyped() {
  // Toggle instructions display when 'i' or 'I' is pressed
  if (key === 'i' || key === 'I') {
    showInstructions = !showInstructions;
  }
}

// Event handler for collisions
function handleCollision(event) {
  // Handle collisions differently based on game state
  if (gameState === 4) {
    handleCollisionMode4(event);
    return;
  }

  const pairs = event.pairs;
  pairs.forEach(pair => {
    const bodyA = pair.bodyA;
    const bodyB = pair.bodyB;

    // Check if either body in the collision is the cue ball
    if (bodyA.label === 'cue' || bodyB.label === 'cue') {
      let otherBody = bodyA.label === 'cue' ? bodyB : bodyA;
      
      // Log different collision types based on the other body's label
      if (otherBody.label === 'red') {
        console.log("Cue-Red");
      } else if (["yellow", "green", "brown", "blue", "pink", "black"].includes(otherBody.label)) {
        console.log(`Cue-Colour: Detected ${otherBody.label.toUpperCase()} Ball.`);
      } else if (otherBody.label === 'wall') {
        console.log("Cue-Cushion");
      }
    }
  });
}

// Validate if a ball position is valid (no overlapping with other balls or invalid areas)
function isValidBallPosition(x, y) {
  let threshold = ballDiameter;
  
  // Check against fixed ball positions for game states 1 and 2
  if (gameState === 1 || gameState === 2) {
    for (const [colorName, pos] of Object.entries(fixedBallPositions)) {
      if (colorName !== "white") {
        if (dist(x, y, pos.x, pos.y) < threshold) return false;
      }
    }
  }

  // Check against red ball positions
  for (const redBall of redBallPositions) {
    if (dist(x, y, redBall.x, redBall.y) < threshold) return false;
  }

  // Check against colored ball positions for game state 3
  if (gameState === 3) {
    for (const cBall of coloredBallPositions) {
      if (dist(x, y, cBall.x, cBall.y) < threshold) return false;
    }
  }

  // Check against Mode 4 colored and red balls
  if (gameState === 4) {
    for (const ball of mode4ColoredBalls) {
      if (dist(x, y, ball.position.x, ball.position.y) < threshold) return false;
    }
    for (const ball of mode4RedBalls) {
      if (dist(x, y, ball.position.x, ball.position.y) < threshold) return false;
    }
  }

  // Ensure the new position does not overlap with the cue ball
  if (!placingCueBall && cueBallBody) {
    if (dist(x, y, cueBallBody.position.x, cueBallBody.position.y) < threshold) return false;
  }

  // Additional checks for Mode 4 when placing cue ball anywhere
  if (gameState === 4 && mode4CanPlaceCueBallAnywhere) {
    if (x < rimThickness + cushionThickness || x > width - rimThickness - cushionThickness ||
        y < rimThickness + cushionThickness || y > height - rimThickness - cushionThickness) {
      return false;
    }

    // Ensure the position is not too close to any pocket
    for (let pocket of pocketsBodies) {
      let distance = dist(x, y, pocket.position.x, pocket.position.y);
      if (distance < pocketRadius) {
        return false;
      }
    }
  }

  return true;
}
