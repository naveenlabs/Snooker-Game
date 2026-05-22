// ------------------------------
// setupAndHelpers.js
// ------------------------------

// Initialize the game setup
function setup() {
  createCanvas(tableWidth + rimThickness * 2, tableHeight + rimThickness * 2);
  
  initializeRedBallPositions(); 

  // Create and configure the Matter.js physics engine
  engine = Engine.create();
  world = engine.world;
  engine.gravity.y = 0; 
  
  // Create table boundaries, pockets, and balls
  createTableBoundaries();
  createPockets();
  createCueBall();
  createOtherBalls();
  
  // Run the physics engine
  Engine.run(engine);

  // Initialize cue stick offsets
  baseCueOffset = ballRadius + 25; 
  finalCueOffset = ballRadius + tipDiameter / 2;
  currentCueOffset = baseCueOffset;

  // Register collision event handler
  Events.on(engine, 'collisionStart', handleCollision);
}

// Calculate the centroid of a set of vertices
function getCentroid(vertices) {
  let x = 0;
  let y = 0;
  vertices.forEach(v => {
    x += v.x;
    y += v.y;
  });
  x /= vertices.length;
  y /= vertices.length;
  return {x, y};
}

// Create a static cushion body from given vertices and add it to the world
function createCushionBody(vertices) {
  const centroid = getCentroid(vertices);
  const relativeVertices = vertices.map(v => ({x: v.x - centroid.x, y: v.y - centroid.y}));
  // Create the cushion body with physical properties
  const cushionBody = Bodies.fromVertices(
    centroid.x, 
    centroid.y, 
    relativeVertices, 
    { isStatic: true, restitution:0.9, friction:0, label: 'wall' }, 
    true
  );
  // Add the cushion to the physics world and track it
  World.add(world, cushionBody);
  walls.push(cushionBody);
}

// Create all table boundaries based on predefined cushion vertices
function createTableBoundaries() {
  cushionVertices.forEach(cushion => {
    createCushionBody(cushion);
  });
}

// Create pockets on the table and add them to the world
function createPockets() {
  const pocketOptions = { isStatic: true, isSensor: true, label: 'pocket' };
  let pocketPositions = [
    { x: rimThickness, y: rimThickness },
    { x: width - rimThickness, y: rimThickness },
    { x: rimThickness, y: height - rimThickness },
    { x: width - rimThickness, y: height - rimThickness },
    { x: width / 2, y: rimThickness },
    { x: width / 2, y: height - rimThickness },
  ];
  
  // Create a pocket for each predefined position
  pocketPositions.forEach(pos => {
    let pocket = Bodies.circle(pos.x, pos.y, pocketRadius, pocketOptions);
    World.add(world, pocket);
    pocketsBodies.push(pocket);
  });
}

// Create the cue ball and add it to the world
function createCueBall() {
  cueBallBody = Bodies.circle(fixedBallPositions.white.x, fixedBallPositions.white.y, ballRadius, {
    restitution: 0.9,
    friction: 0.005,
    frictionAir: 0.01,
    label: 'cue',
  });
  World.add(world, cueBallBody);
  balls.push(cueBallBody);
}

// Create other balls based on the current game state and add them to the world
function createOtherBalls() {
  if (gameState === 1 || gameState === 2 || gameState === 3) {
    // For game states 1 and 2, add red balls
    if (gameState === 1 || gameState === 2) {
      redBallPositions.forEach(pos => {
        let redBall = Bodies.circle(pos.x, pos.y, ballRadius, {
          restitution: 0.9,
          friction: 0.005,
          frictionAir: 0.01,
          label: 'red',
        });
        World.add(world, redBall);
        balls.push(redBall);
      });
    } 
    // For game state 3, add both red and colored balls
    if (gameState === 3) {
      redBallPositions.forEach(pos => {
        let redBall = Bodies.circle(pos.x, pos.y, ballRadius, {
          restitution: 0.9,
          friction: 0.005,
          frictionAir: 0.01,
          label: 'red',
        });
        World.add(world, redBall);
        balls.push(redBall);
      });
      
      coloredBallPositions.forEach(pos => {
        let coloredBall = Bodies.circle(pos.x, pos.y, ballRadius, {
          restitution: 0.9,
          friction: 0.005,
          frictionAir: 0.01,
          label: pos.color,
        });
        World.add(world, coloredBall);
        balls.push(coloredBall);
      });
    }
  }

  // For game states 1 and 2, add fixed colored balls except the cue ball
  if (gameState === 1 || gameState === 2) {
    for (const [colorName, pos] of Object.entries(fixedBallPositions)) {
      if (colorName !== "white") {
        let ball = Bodies.circle(pos.x, pos.y, ballRadius, {
          restitution: 0.9,
          friction: 0.005,
          frictionAir: 0.01,
          label: colorName,
        });
        World.add(world, ball);
        balls.push(ball);
      }
    }
  }
}

// Initialize positions for red balls in a triangular rack formation
function initializeRedBallPositions() {
  const triangleStartX = rimThickness + tableWidth / 2 + tableWidth / 4;
  const triangleStartY = rimThickness + tableHeight / 2;
  const rowLength = 5; 

  redBallPositions = [];
  for (let row = 0; row < rowLength; row++) {
    for (let col = 0; col <= row; col++) {
      const redX = triangleStartX + row * ballDiameter * Math.sqrt(3) / 2;
      const redY = triangleStartY - row * ballDiameter / 2 + col * ballDiameter;
      redBallPositions.push({ x: redX, y: redY });
    }
  }
}

// Randomize positions for red balls ensuring no overlaps or invalid placements
function randomizeRedBallPositions() {
  redBallPositions = [];
  while (redBallPositions.length < 15) { 
    const x = random(
      rimThickness + pocketRadius + cushionThickness,
      width - rimThickness - pocketRadius - cushionThickness
    );
    const y = random(
      rimThickness + pocketRadius + cushionThickness,
      height - rimThickness - pocketRadius - cushionThickness
    );

    // Add position only if it's valid
    if (isValidBallPosition(x, y)) {
      redBallPositions.push({ x: x, y: y });
    }
  }
}

// Randomize positions for colored balls ensuring no overlaps or invalid placements
function randomizeColoredBallPositions() {
  coloredBallPositions = [];
  for (const colorName of ["yellow", "green", "brown", "blue", "pink", "black"]) {
    let validPositionFound = false;
    // Attempt to find a valid position for each colored ball
    while (!validPositionFound) {
      const x = random(
        rimThickness + pocketRadius + cushionThickness,
        width - rimThickness - pocketRadius - cushionThickness
      );
      const y = random(
        rimThickness + pocketRadius + cushionThickness,
        height - rimThickness - pocketRadius - cushionThickness
      );

      // Add position only if it's valid
      if (isValidBallPosition(x, y)) {
        coloredBallPositions.push({ x: x, y: y, color: colorName });
        validPositionFound = true;
      }
    }
  }
}

// Validate if a ball's position is valid (no overlapping with other balls or invalid areas)
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
  
  // Check against existing red ball positions
  for (const redBall of redBallPositions) {
    if (dist(x, y, redBall.x, redBall.y) < threshold) return false;
  }
  
  // Check against existing colored ball positions for game state 3
  if (gameState === 3) {
    for (const cBall of coloredBallPositions) {
      if (dist(x, y, cBall.x, cBall.y) < threshold) return false;
    }
  }
  
  // Ensure the new position does not overlap with the cue ball
  if (!placingCueBall && cueBallBody) {
    if (dist(x, y, cueBallBody.position.x, cueBallBody.position.y) < threshold) return false;
  }
  
  return true;
}
