const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const playButton = document.getElementById("playButton");
const stopButton = document.getElementById("stopButton");
const randomizeButton = document.getElementById("randomizeButton");
const stepButton = document.getElementById("stepButton");
const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");
const ruleSelect = document.getElementById("ruleSelect");

const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");

const rowCount = 5;
const colCount = 8;

const cellWidth = canvas.width / colCount;
const cellHeight = canvas.height / rowCount;

let grid = [];
let isPlaying = false;
let loopId = null;
let generationNumber = 0;

const cellImages = [];

// creating block counts
for (let row = 0; row < rowCount; row++) {
  cellImages[row] = [];
  for (let col = 0; col < colCount; col++) {
    cellImages[row][col] = null;
  }
}

function loadHamsterImages() {     //LOADING IN THE HAMSTERSSSS 
  let index = 0;

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      const currentRow = row;
      const currentCol = col;
      const currentIndex = index;

      const img = new Image();

      img.onload = function () {
        cellImages[currentRow][currentCol] = img;
        drawGrid();
      };

      img.onerror = function () {
        console.log(`Could not load hamsters/${currentIndex}.jpg`);
      };

      img.src = `hamsters/${currentIndex}.jpg`;
      index++;
    }
  }
}

const columnScales = [  //pentatonic scales bc i like them
  [60, 63, 65, 67, 70],
  [63, 65, 67, 70, 72],
  [65, 68, 70, 72, 75],
  [67, 70, 72, 74, 77],
  [60, 62, 64, 67, 69],
  [62, 65, 67, 69, 72],
  [58, 61, 63, 65, 68],
  [59, 61, 63, 66, 68]
];

const ruleSets = {    //4 systems of rules
  hamsterKill: {
    survive: [1, 2],
    birth: [3]
  },
  hamsterLove: {
    survive: [2, 3, 4],
    birth: [3, 4]
  },
  hamsterLife: {
    survive: [2, 3],
    birth: [2]
  }, 
  hamster67: {
    survive: [2, 3],
    birth: [1, 3]
  }
  
};

const hamster67Pattern = [    //this was stupid but i wanted to add it as a 67 feature
  [1, 1, 1, 0, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 0, 0, 0, 1]
];

function midiToFrequency(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

function updateSpeedText() {
  speedValue.textContent = `${speedSlider.value} ms`;
}

function makeRandomGrid() {     //creating a new random grid
  const newGrid = [];

  for (let row = 0; row < rowCount; row++) {
    const rowData = [];

    for (let col = 0; col < colCount; col++) {
      rowData.push(Math.random() < 0.25 ? 1 : 0);
    }

    newGrid.push(rowData);
  }

  return newGrid;
}

function countNeighbors(sourceGrid, row, col) {   //counting the amount of neighbors a given block has in a certain generation
  let total = 0;

  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let colOffset = -1; colOffset <= 1; colOffset++) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const neighborRow = row + rowOffset;
      const neighborCol = col + colOffset;

      if (
        neighborRow >= 0 &&
        neighborRow < rowCount &&
        neighborCol >= 0 &&
        neighborCol < colCount
      ) {
        total += sourceGrid[neighborRow][neighborCol];
      }
    }
  }

  return total;
}


function updateGrid() {     //updating the grid for each new generation, based on the rules
  const nextGrid = [];
  const selectedRule = ruleSelect.value;
  const activeRules = ruleSets[selectedRule];

  for (let row = 0; row < rowCount; row++) {
    const nextRow = [];

    for (let col = 0; col < colCount; col++) {
      const neighborCount = countNeighbors(grid, row, col);
      const aliveNow = grid[row][col] === 1;

      if (selectedRule === "hamster67" && hamster67Pattern[row][col] === 1 && aliveNow) {
        nextRow.push(1);
      } else if (aliveNow) {
        nextRow.push(activeRules.survive.includes(neighborCount) ? 1 : 0);
      } else {
        nextRow.push(activeRules.birth.includes(neighborCount) ? 1 : 0);
      }
    }

    nextGrid.push(nextRow);
  }

  grid = nextGrid;
}


function playShortNote(frequency, loudness, duration = 0.7) {
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const noteGain = audioCtx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(frequency, now);

  noteGain.gain.setValueAtTime(0.0001, now);
  noteGain.gain.exponentialRampToValueAtTime(loudness, now + 0.03);
  noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(noteGain);
  noteGain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.03);
}

function collectAliveNotes() {     //"collecting" all of the active notes to play 
    const notesToPlay = [];

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      if (grid[row][col] === 1) {
        const midiNote = columnScales[col][row];
        notesToPlay.push(midiToFrequency(midiNote));
      }
    }
  }

  return notesToPlay;
}

function playWholeGrid() {    //actually playing the entire grid for the blocks present at the time
  const notesToPlay = collectAliveNotes();

  if (notesToPlay.length === 0) {
    return;
  }

  const noteVolume = Math.min(0.12, 0.45 / notesToPlay.length);

  for (let i = 0; i < notesToPlay.length; i++) {
    playShortNote(notesToPlay[i], noteVolume);
  }
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      const x = col * cellWidth;
      const y = row * cellHeight;

      ctx.fillStyle = "#f0eff8";
      ctx.fillRect(x + 4, y + 4, cellWidth - 8, cellHeight - 8);

      if (grid[row][col] === 1) {
        if (cellImages[row][col]) {
          ctx.drawImage(
            cellImages[row][col],
            x + 8,
            y + 8,
            cellWidth - 16,
            cellHeight - 16
          );
        } else {
          ctx.fillStyle = "#444";
          ctx.fillRect(x + 8, y + 8, cellWidth - 16, cellHeight - 16);
        }
      }

      ctx.strokeStyle = "#d5d3e0";
      ctx.strokeRect(x + 4, y + 4, cellWidth - 8, cellHeight - 8);
    }
  }

  ctx.fillStyle = "#444";
  ctx.font = "16px Arial";
  ctx.fillText(`Generation: ${generationNumber}`, 10, 20);
}

function advanceOneGeneration() {
  playWholeGrid();
  updateGrid();
  generationNumber++;
  drawGrid();
}

function loopPlayback() {
  if (!isPlaying) {
    return;
  }

  advanceOneGeneration();

  loopId = setTimeout(() => {
    loopPlayback();
  }, Number(speedSlider.value));
}

function startPlayback() {
  if (isPlaying) {
    return;
  }

  audioCtx.resume();
  isPlaying = true;
  loopPlayback();
}

function stopPlayback() {
  isPlaying = false;

  if (loopId !== null) {
    clearTimeout(loopId);
    loopId = null;
  }
}



playButton.addEventListener("click", startPlayback);
stopButton.addEventListener("click", stopPlayback);

randomizeButton.addEventListener("click", () => {
  grid = makeRandomGrid();
  generationNumber = 0;
  drawGrid();
});

stepButton.addEventListener("click", () => {
  audioCtx.resume();
  advanceOneGeneration();
});

speedSlider.addEventListener("input", updateSpeedText);

ruleSelect.addEventListener("change", drawGrid);

// start the whole thing yay
grid = makeRandomGrid();
updateSpeedText();
loadHamsterImages();
drawGrid();