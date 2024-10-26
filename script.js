document.addEventListener("DOMContentLoaded", () => {
    const isPlayingMode = document.querySelector('#start-algorithm') !== null;
    const isCreatingMode = document.querySelector('#generate-grid') !== null;

    if (isPlayingMode) {
        setupPlayingMode();
    } else if (isCreatingMode) {
        setupCreatingMode();
    }

    document.getElementById('switch-to-creating')?.addEventListener('click', () => {
        window.location.href = 'creatingmode.html';
    });

    document.getElementById('switch-to-playing')?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});

function setupPlayingMode() {
    let currentLevel = 1;
    let gridData = [];
    let taskDescription = '';
    let floodInterval;
    let selectedColor = 'white';
    let selectedNumber = '';
    let waterFront = [];
    let visited = new Set();
    let floodInitialized = false;

    const grid = document.querySelector('.grid');
    const taskTextElement = document.getElementById('footer-text');
    const fileUploadInput = document.getElementById('file-upload');
    const levelButtons = document.querySelectorAll('.level-button');
    const colorPickers = document.querySelectorAll('.color-picker');
    const cellNumberInput = document.getElementById('cell-number');

    let rows;
    let cols;

    function loadLevelFromText(filePath) {
        fetch(filePath)
            .then(response => response.text())
            .then(data => loadLevelFromFile(data))
            .catch(err => console.error('Error loading level:', err));
    }

    function loadLevelFromFile(fileContent) {
        const lines = fileContent.trim().split('\n');
        const taskCategory = lines[0];
        const taskType = lines[1];
        taskDescription = lines[1];
        gridData = lines.slice(2, lines.length - 2).map(line => line.trim().split(''));
        const answerType = lines[lines.length - 2];
        const correctAnswer = lines[lines.length - 1];

        rows = gridData.length;
        cols = gridData[0].length;

        taskTextElement.textContent = taskDescription;

        createGrid(gridData);
        if (taskType === 'čo sa nezaplaví?') {
            evaluateNoFloodingTask(correctAnswer);
        } else if (taskType === 'za koľko sekúnd?') {
            evaluateTimeTask(correctAnswer);
        } else if (taskType.includes('doplň prekážky')) {
            evaluateBarrierTask(correctAnswer);
        }
    }
    loadLevelFromText(`levels/level1.txt`);

    function evaluateNoFloodingTask(correctAnswer) {
        let userMarkedCells = [];
        document.querySelectorAll('.grid div').forEach(cell => {
            cell.addEventListener('click', () => {
                const row = cell.dataset.row;
                const col = cell.dataset.col;

                if (!cell.classList.contains('marked')) {
                    cell.classList.add('marked');
                    cell.style.backgroundColor = 'green';
                    userMarkedCells.push([parseInt(row), parseInt(col)]);
                } else {
                    cell.classList.remove('marked');
                    cell.style.backgroundColor = 'white';
                    userMarkedCells = userMarkedCells.filter(([r, c]) => !(r === parseInt(row) && c === parseInt(col)));
                }
            });
        });


        function checkSolution() {
            const correctCells = correctAnswer.split(' ').map(pair => pair.split(',').map(Number));
            if (JSON.stringify(userMarkedCells.sort()) === JSON.stringify(correctCells.sort())) {
                alert('Correct!');
            } else {
                alert('Incorrect. Try again.');
            }
        }

        document.getElementById('save-solution').addEventListener('click', checkSolution);
    }


    function evaluateTimeTask(correctAnswer) {
        let userInputTime = 0;

        document.getElementById('cell-number').addEventListener('input', (e) => {
            userInputTime = parseInt(e.target.value, 10);
        });

        function checkSolution() {
            if (userInputTime === parseInt(correctAnswer)) {
                alert('Correct!');
            } else {
                alert('Incorrect. The correct time is ' + correctAnswer + ' seconds.');
            }
        }

        document.getElementById('save-solution').addEventListener('click', checkSolution);
    }


    function evaluateBarrierTask(correctAnswer) {
        let barriers = [];
        const iterationsRequired = parseInt(correctAnswer.match(/\d+/)[0], 10);

        document.querySelectorAll('.grid div').forEach(cell => {
            cell.addEventListener('click', () => {
                const row = cell.dataset.row;
                const col = cell.dataset.col;

                if (!cell.classList.contains('barrier')) {
                    cell.classList.add('barrier');
                    cell.style.backgroundColor = 'darkgrey';
                    barriers.push([parseInt(row), parseInt(col)]);
                } else {
                    cell.classList.remove('barrier');
                    cell.style.backgroundColor = 'white';
                    barriers = barriers.filter(([r, c]) => !(r === parseInt(row) && c === parseInt(col)));
                }
            });
        });


        function checkSolution() {
            let iterations = simulateFloodWithBarriers(barriers);
            if (iterations === iterationsRequired) {
                alert('Correct!');
            } else {
                alert('Incorrect. The flood filled in ' + iterations + ' iterations.');
            }
        }

        document.getElementById('save-solution').addEventListener('click', checkSolution);
    }


    function simulateFloodWithBarriers(barriers) {
        let iterations = 0;
        return iterations;
    }

    function createGrid(gridMap) {
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${cols}, 50px)`;
        grid.style.gridTemplateRows = `repeat(${rows}, 50px)`;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cell = document.createElement('div');
                cell.dataset.row = row;
                cell.dataset.col = col;

                if (gridMap[row][col] === '1') {
                    cell.style.backgroundColor = 'black';
                } else {
                    cell.style.backgroundColor = 'white';
                    cell.addEventListener('click', () => fillCell(cell, row, col));
                }

                grid.appendChild(cell);
            }
        }
    }


    cellNumberInput.addEventListener('input', (event) => {
        selectedNumber = event.target.value;
    });

    function fillCell(cell, row, col) {
        if (gridData[row][col] === '1') return;

        if (selectedNumber !== '') {
            cell.textContent = selectedNumber;
        }

        cell.style.backgroundColor = selectedColor;
        gridData[row][col] = selectedColor === 'black' ? '1' : '0';
    }

    colorPickers.forEach(picker => {
        picker.addEventListener('click', (event) => {
            selectedColor = event.target.dataset.color;
            selectedNumber = '';
            cellNumberInput.value = '';
        });
    });

    fileUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const fileContent = e.target.result;
                loadLevelFromFile(fileContent);
            };
            reader.readAsText(file);
        }
    });

    function initializeWaterFront() {
        waterFront = [];
        visited = new Set();

        for (let i = 0; i < cols; i++) {
            if (gridData[0][i] === '0') {
                waterFront.push([0, i]);
                fillWithWater(0, i);
                visited.add(`0,${i}`);
            }
            if (gridData[rows - 1][i] === '0') {
                waterFront.push([rows - 1, i]);
                fillWithWater(rows - 1, i);
                visited.add(`${rows - 1},${i}`);
            }
        }

        for (let i = 0; i < rows; i++) {
            if (gridData[i][0] === '0') {
                waterFront.push([i, 0]);
                fillWithWater(i, 0);
                visited.add(`${i},0`);
            }
            if (gridData[i][cols - 1] === '0') {
                waterFront.push([i, cols - 1]);
                fillWithWater(i, cols - 1);
                visited.add(`${i},${cols - 1}`);
            }
        }
    }

    function processFloodStep() {
        const newWaterFront = [];

        for (const [row, col] of waterFront) {
            const adjacentCells = getAdjacentCells(row, col);

            for (const [adjRow, adjCol] of adjacentCells) {
                const adjCellKey = `${adjRow},${adjCol}`;
                if (!visited.has(adjCellKey) && gridData[adjRow][adjCol] === '0') {
                    fillWithWater(adjRow, adjCol);
                    visited.add(adjCellKey);
                    newWaterFront.push([adjRow, adjCol]);
                }
            }
        }

        waterFront = newWaterFront;

        if (newWaterFront.length === 0) {
            clearInterval(floodInterval);
        }
    }

    function startFloodFill() {
        if (!floodInitialized) {
            initializeWaterFront();
            floodInitialized = true;
        }

        floodInterval = setInterval(() => {
            processFloodStep();
        }, 1000);
    }

    function fillWithWater(row, col) {
        const cell = document.querySelector(`.grid div[data-row="${row}"][data-col="${col}"]`);
        cell.style.backgroundColor = 'deepskyblue';
        gridData[row][col] = '2';
    }

    function getAdjacentCells(row, col) {
        const adjacent = [];
        if (row > 0) adjacent.push([row - 1, col]);
        if (row < rows - 1) adjacent.push([row + 1, col]);
        if (col > 0) adjacent.push([row, col - 1]);
        if (col < cols - 1) adjacent.push([row, col + 1]);
        return adjacent;
    }

    function stopFloodFill() {
        clearInterval(floodInterval);
    }

    document.getElementById('save-solution').addEventListener('click', () => {
        console.log('Solution saved:', gridData);
    });

    document.getElementById('start-algorithm').addEventListener('click', startFloodFill);
    document.getElementById('pause-algorithm').addEventListener('click', stopFloodFill);

    levelButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentLevel = button.dataset.level;
            loadLevelFromText(`levels/level${currentLevel}.txt`);
            resetFloodFillState();
        });
    });

    function resetFloodFillState() {
        waterFront = [];
        visited = new Set();
        clearInterval(floodInterval);
        floodInitialized = false;
    }
}

function setupCreatingMode() {
    const grid = document.querySelector('.grid');
    const rowsInput = document.getElementById('rows-input');
    const colsInput = document.getElementById('cols-input');
    const sizeInput = document.getElementById('size-input');
    const probabilityInput = document.getElementById('probability-input');
    const taskInput = document.getElementById('task-input');
    const correctAnswerInput = document.getElementById('correct-answer-input');
    const generateGridButton = document.getElementById('generate-grid');
    const saveMapButton = document.getElementById('save-map');

    let gridData = [];

    generateGridButton.addEventListener('click', () => {
        const rows = parseInt(rowsInput.value);
        const cols = parseInt(colsInput.value);
        const cellSize = parseInt(sizeInput.value);
        const freeProbability = parseInt(probabilityInput.value);

        gridData = [];
        for (let row = 0; row < rows; row++) {
            const gridRow = [];
            for (let col = 0; col < cols; col++) {
                const isFree = Math.random() * 100 < freeProbability ? '0' : '1';
                gridRow.push(isFree);
            }
            gridData.push(gridRow);
        }

        createCustomGrid(rows, cols, cellSize);
    });

    function createCustomGrid(rows, cols, cellSize) {
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
        grid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cell = document.createElement('div');
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;

                if (gridData[row][col] === '1') {
                    cell.style.backgroundColor = 'black';
                } else {
                    cell.style.backgroundColor = 'white';
                    cell.addEventListener('click', () => toggleCellType(cell, row, col));
                }

                grid.appendChild(cell);
            }
        }
    }

    function toggleCellType(cell, row, col) {
        if (gridData[row][col] === '0') {
            gridData[row][col] = '1';
            cell.style.backgroundColor = 'black';
        } else {
            gridData[row][col] = '0';
            cell.style.backgroundColor = 'white';
        }
    }


    document.getElementById('save-map').addEventListener('click', () => {
        const taskCategory = document.getElementById('category-input').value;
        const taskDescription = document.getElementById('task-input').value;
        const correctAnswer = document.getElementById('correct-answer-input').value;
        const answerCategory = document.getElementById('answer-category-input').value;
        let fileContent = taskCategory + '\n' + taskDescription + '\n';
        gridData.forEach(row => {
            fileContent += row.join('') + '\n';
        });

        fileContent += answerCategory + '\n';
        fileContent += correctAnswer + '\n';

        const blob = new Blob([fileContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'new_task.txt';
        link.click();
    });


}
