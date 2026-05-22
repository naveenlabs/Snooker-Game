// ------------------------------------------------------------------------------------------
// EXPLANATION OF APP DESIGN AND EXTENSION 
// ------------------------------------------------------------------------------------------
/*
Overall Design and Rationale:

This snooker-style application is built using the p5.js library for rendering and Matter.js for 
the physics simulation. The table dimensions, pockets, cushions, and ball mechanics are carefully 
calibrated to mimic real-world snooker dynamics. The main design goal is to provide an intuitive 
yet flexible user experience by allowing both mouse and keyboard control for aiming and strength 
adjustment.

Mouse-Based and Keyboard Inputs:
We chose to allow the cue stick to be aimed either by moving the mouse or using the Left/Right 
Arrow Keys. Likewise, the cue strength can be adjusted via mouse wheel or the Up/Down Arrow Keys. 
This dual-control scheme caters to different player preferences: some may find the mouse more 
natural for quick aiming, while others prefer fine-tuning with keyboard input. By integrating both 
methods, we offer a flexible system that lets players adapt their own style of play—whether 
fast-paced or highly precise.

Cue Functionality:
When the player is ready to strike the cue ball, they can initiate the shot by clicking the mouse 
or pressing the spacebar. Internally, the application runs a two-phase "pull-back" and "strike" 
animation. During the pull-back phase, the cue stick shifts away from the cue ball to reflect 
power buildup; during the strike phase, it moves forward to impact the ball, applying force 
calculated based on the user-selected strength. This sequence adds a sense of realism and 
anticipation to each shot.

Extension: “Mode 4 – Dynamic Precision Snooker”
A unique extension to standard snooker, “Mode 4” introduces a timed challenge where players must 
pot colored balls in a specific sequence (yellow, green, then brown). Additionally, the 
“designated pocket” changes every 30 seconds, so accuracy and adaptability are crucial. Red balls 
act as obstacles; hitting or potting them immediately ends the game. This mechanic adds an extra 
layer of challenge: players must carefully navigate around reds while also racing against the clock.

Power-ups occasionally appear on the table, offering advantages such as extending the remaining 
time, relocating red balls, or granting permission to place the cue ball anywhere. This dynamic 
element heightens the replay value and strategy. 

Why It’s Unique:
By combining fast-paced timed objectives, random power-up events, and mandatory pocket changes, 
this mode departs significantly from traditional snooker. It forces players to think creatively 
about each shot, balancing risk-taking with strategic potting. The flexible control scheme—mouse 
and keyboard—ensures that different styles of play remain viable.

In summary, the application leverages physics-based realism, intuitive rendering, and versatile 
input controls to deliver an engaging snooker experience. “Mode 4” further extends the game with 
a timed, dynamic challenge that rewards quick thinking and precision.
*/

// ------------------------------
// main.js
// ------------------------------

// Import Matter.js modules
const { Engine, World, Bodies, Body, Events } = Matter;

// Table dimensions and properties
const tableWidth = 1220;  
const tableHeight = tableWidth / 2;  
const rimThickness = 40;
const cushionThickness = 17;

// Ball and pocket dimensions
const ballDiameter = tableHeight / 36; 
const ballRadius = ballDiameter / 2;
const pocketRadius = (ballDiameter * 1.5) / 2; 

// D zone and baulk line dimensions
const baulkLineDist = 245;  
const dZoneRadius = 97;     
const dCenterX = rimThickness + baulkLineDist;
const dCenterY = rimThickness + tableHeight / 2;

// Cue stick dimensions and properties
const cueStickLength = 300; 
const cueStickWidth = 7;    
const tipDiameter = cueStickWidth * 0.7;
let cueStickAngle = 0;

// Cue stick animation and striking state
let cueStrength = 0.3;
const minCueStrength = 0.1;
const maxCueStrength = 0.9;
let isIncreasingStrength = false;
let isDecreasingStrength = false;
let isStriking = false;
let strikeStartFrame = 0;
let totalStrikeFrames = 0;
let pullBackFrames = 0;
let strikeFrames = 0;
let cueAnimationPhase = 0; 

// Cue stick offset and visibility
let baseCueOffset; 
let finalCueOffset; 
let currentCueOffset; 
let pullBackDist = 0; 
let cueStickVisible = true;

// Ball colors
const colors = {
  white: "#FFFFFF",
  cue: "#FFFFFF",
  yellow: "#FFFF00",
  green: "#008000",
  brown: "#8B4513",
  blue: "#0000FF",
  pink: "#FFC0CB",
  black: "#000000",
  red: "#FF0000",
};

// Fixed ball positions
const fixedBallPositions = {
  white: { x: rimThickness + baulkLineDist - dZoneRadius / 2, y: rimThickness + tableHeight / 2 },
  green: { x: rimThickness + baulkLineDist, y: rimThickness + tableHeight / 2 - dZoneRadius / 2 - 50 },
  brown: { x: rimThickness + baulkLineDist, y: rimThickness + tableHeight / 2 },
  yellow: { x: rimThickness + baulkLineDist, y: rimThickness + tableHeight / 2 + dZoneRadius / 2 + 50 },
  blue: { x: rimThickness + tableWidth / 2, y: rimThickness + tableHeight / 2 },
  pink: {
    x: rimThickness + tableWidth / 2 + tableWidth / 4 - ballDiameter * Math.sqrt(3) / 2 - ballDiameter * 0.15,
    y: rimThickness + tableHeight / 2,
  },
  black: { x: rimThickness + tableWidth - pocketRadius * 10, y: rimThickness + tableHeight / 2 },
};

// Cushion vertices and shadow offsets
const cushionVertices = [
  // Top Left Cushion
  [
    {x:50, y:40},
    {x:70, y:50},
    {x:630, y:50},
    {x:640, y:40}
  ],
  // Top Right Cushion
  [
    {x:660, y:40},
    {x:670, y:50},
    {x:1230, y:50},
    {x:1250, y:40}
  ],
  // Bottom Left Cushion
  [
    {x:50, y:650},
    {x:70, y:640},
    {x:630, y:640},
    {x:640, y:650}
  ],
  // Bottom Right Cushion
  [
    {x:660, y:650},
    {x:670, y:640},
    {x:1230, y:640},
    {x:1250, y:650}
  ],
  // Left Cushion
  [
    {x:40, y:50},
    {x:50, y:70},
    {x:50, y:620},
    {x:40, y:640}
  ],
  // Right Cushion
  [
    {x:1260, y:50},
    {x:1250, y:70},
    {x:1250, y:620},
    {x:1260, y:640}
  ]
];
const cushionShadowOffsets = [
  {shadowX: 2, shadowY: 2},   
  {shadowX: -2, shadowY: 2},  
  {shadowX: 2, shadowY: -2},  
  {shadowX: -2, shadowY: -2}, 
  {shadowX: 2, shadowY: 2},   
  {shadowX: -2, shadowY: 2},  
];

// Game state and ball positions
let gameState = 1; 
let redBallPositions = [];
let coloredBallPositions = [];
let placingCueBall = true;

// Physics engine and objects
let engine;
let world;
let balls = []; 
let walls = []; 
let pocketsBodies = []; 
let cueBallBody;

// Ball rotation speed and pocketing threshold
const rotationSpeed = 2; 
const pocketingThresholdFactor = 0.4; 

// Player controls
let isMovingLeft = false;
let isMovingRight = false;

// UI state
let showInstructions = false;
