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
    let floodInterval;
    let selectedColor = 'white';
    let selectedNumber = '';
    let waterFront = [];
    let visited = new Set();
    let floodInitialized = false;
    let taskCategory= '';
    let taskDescription = '';
    let answerType = '';
    let correctAnswer;
    let beginningPoints;

    const grid = document.querySelector('.grid');
    let taskTextElement = document.getElementById('footer-text');
    const fileUploadInput = document.getElementById('file-upload');
    const levelButtons = document.querySelectorAll('.level-button');
    const colorPickers = document.querySelectorAll('.color-picker');
    const cellNumberInput = document.getElementById('cell-number');
    const userAnswerInput = document.getElementById('correct-answer-input');
    const prevLevelButton = document.getElementById('prev-level');
    const nextLevelButton = document.getElementById('next-level');

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
        taskCategory = lines[0];
        taskDescription = lines[1];
        gridData = lines.slice(2, lines.length - 3).map(line => line.trim().split('').map(char => {
            if (char === '1') return '1';
            if (char === '0') return '0';
            if (char === 'G') return 'G';
            if (char === 'B') return 'B';
            return char;
        }));
        answerType = lines[lines.length - 3];
        correctAnswer = lines[lines.length - 2];
        beginningPoints = lines[lines.length - 1];
        setupSolutionCheckers(answerType, correctAnswer, taskCategory);

        rows = gridData.length;
        cols = gridData[0].length;
        taskTextElement.textContent = taskDescription;
        createGrid(gridData);
    }

    loadLevelFromText(`levels/level${currentLevel}.txt`);

    // Add event listeners for prev and next level buttons
    prevLevelButton.addEventListener('click', () => {
        if (currentLevel > 1) {
            currentLevel--;
            loadLevelFromText(`levels/level${currentLevel}.txt`);
            resetFloodFillState();
        }
    });

    nextLevelButton.addEventListener('click', () => {
        if (currentLevel < levelButtons.length) {
            currentLevel++;
            loadLevelFromText(`levels/level${currentLevel}.txt`);
            resetFloodFillState();
        }
    });



    loadLevelFromText(`levels/level1.txt`);

    function setupSolutionCheckers(answerType, correctAnswer, taskType) {
        // Remove any existing event listeners to prevent multiple alerts
        const checkSolutionButton = document.getElementById('check-solution');
        const newCheckSolutionButton = checkSolutionButton.cloneNode(true);
        checkSolutionButton.parentNode.replaceChild(newCheckSolutionButton, checkSolutionButton);

        const revealSolutionButton = document.getElementById('reveal-solution');
        const newRevealSolutionButton = revealSolutionButton.cloneNode(true);
        revealSolutionButton.parentNode.replaceChild(newRevealSolutionButton, revealSolutionButton);

        if (taskType.includes('čo sa nezaplaví?')){
            newCheckSolutionButton.addEventListener('click', () => evaluateNoFloodingTask(correctAnswer));
            newRevealSolutionButton.addEventListener('click', revealCorrectSquares.bind(null, correctAnswer));
        } else if (answerType === 'number') {
            newCheckSolutionButton.addEventListener('click', () => evaluateTimeTask(correctAnswer));
            newRevealSolutionButton.addEventListener('click', () => alert('Správny čas je ' + correctAnswer + ' sekúnd.'));
        } else if (taskType.includes('doplň prekážky')) {
            newCheckSolutionButton.addEventListener('click', () => evaluateBarrierTask(correctAnswer));
            newRevealSolutionButton.addEventListener('click', revealCorrectSquares.bind(null, correctAnswer));
        }
    }

    function evaluateNoFloodingTask(correctAnswer) {
        let userMarkedCells = [];
        document.querySelectorAll('.grid div').forEach(cell => {
            if (cell.style.backgroundColor === 'green') {
                userMarkedCells.push([parseInt(cell.dataset.row), parseInt(cell.dataset.col)]);
            }
        });

        const correctCells = correctAnswer.split(' ').map(pair => pair.split(',').map(Number));
        if (JSON.stringify(userMarkedCells.sort()) === JSON.stringify(correctCells.sort())) {
            alert('Correct!');
        } else {
            alert('Incorrect. Try again.');
        }
    }

    function evaluateTimeTask(correctAnswer) {
        const userInputTime = parseInt(userAnswerInput.value, 10);
        if (userInputTime === parseInt(correctAnswer)) {
            alert('Správne!');
        } else {
            alert('Nesprávne. Správny čas je ' + correctAnswer + ' sekúnd.');
        }
    }

    function evaluateBarrierTask(correctAnswer) {
        let barriers = [];
        document.querySelectorAll('.grid div').forEach(cell => {
            if (cell.style.backgroundColor === 'grey') {
                barriers.push([parseInt(cell.dataset.row), parseInt(cell.dataset.col)]);
            }
        });

        const correctCells = correctAnswer.split(' ').map(pair => pair.split(',').map(Number));
        if (JSON.stringify(barriers.sort()) === JSON.stringify(correctCells.sort())) {
            alert('Správne!');
        } else {
            alert('Nesprávne. Skúste to znova.');
        }
    }

    function revealCorrectSquares(correctAnswer) {
        const correctCells = correctAnswer.split(' ').map(pair => pair.split(',').map(Number));
        correctCells.forEach(([row, col]) => {
            const cell = document.querySelector(`.grid div[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.style.backgroundColor = 'pink';
            }
        });
    }

    function createGrid(gridData) {
        grid.innerHTML = '';
        const containerWidth = window.innerWidth * 0.5; // Set the width of the grid container to 50vw
        const containerHeight = window.innerHeight * 0.5; // Set the height of the grid container to 50vh

        const cellWidth = (Math.min(containerWidth / cols, containerHeight / rows)) - 5;
        const cellHeight = cellWidth;

        grid.style.width = `${containerWidth}px`;
        grid.style.height = `${containerHeight}px`;
        grid.style.gridTemplateColumns = `repeat(${cols}, ${cellWidth}px)`;
        grid.style.gridTemplateRows = `repeat(${rows}, ${cellHeight}px)`;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cell = document.createElement('div');
                cell.dataset.row = row;
                cell.dataset.col = col;

                const cellValue = gridData[row][col];
                if (cellValue === '1') {
                    cell.style.backgroundColor = 'black';
                } else if (cellValue === 'G') {
                    cell.style.backgroundColor = 'green';
                } else if (cellValue === 'B') {
                    cell.style.backgroundColor = 'grey';
                } else {
                    cell.style.backgroundColor = 'white';
                    cell.addEventListener('click', () => fillCell(cell, row, col));
                }

                cell.style.width = `${cellWidth}px`;
                cell.style.height = `${cellHeight}px`;

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
        if (selectedColor === 'black') {
            cell.classList.add('barrier');
            gridData[row][col] = '1';
        } else if (selectedColor === 'grey') {
            cell.classList.add('barrier');
            gridData[row][col] = '1';
        } else {
            cell.classList.remove('barrier');
            gridData[row][col] = '0';
        }
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

        if (beginningPoints === 'all') {
            // Original logic for entire boundary
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
        } else {
            // Custom beginning points logic
            const startPoints = beginningPoints.split(' ').map(point => point.split(',').map(Number));
            startPoints.forEach(([row, col]) => {
                if (gridData[row][col] === '0') {
                    waterFront.push([row, col]);
                    fillWithWater(row, col);
                    visited.add(`${row},${col}`);
                }
            });
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

    function stepFloodFill() {
        if (!floodInitialized) {
            initializeWaterFront();
            floodInitialized = true;
        } else {
            processFloodStep();
        }
    }

    function fillWithWater(row, col) {
        const cell = document.querySelector(`.grid div[data-row="${row}"][data-col="${col}"]`);
        if (cell && cell.style.backgroundColor !== 'grey') {
            cell.style.backgroundColor = 'deepskyblue';
            gridData[row][col] = '2';
        }
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
        let fileContent = `${taskCategory}\n`+`${taskDescription}\n`;
        gridData.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const cellElement = document.querySelector(`.grid div[data-row="${rowIndex}"][data-col="${colIndex}"]`);
                let cellState = cell;
                if (cellElement) {
                    if (cellElement.style.backgroundColor === 'green') {
                        cellState = 'G';
                    } else if (cellElement.style.backgroundColor === 'grey') {
                        cellState = 'B';
                    }
                }
                fileContent += cellState;
            });
            fileContent += '\n';
        });

        fileContent += `${answerType}\n`;
        fileContent += `${correctAnswer}\n`;
        fileContent += `${beginningPoints}\n`;

        const blob = new Blob([fileContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'riesena_uloha.txt';
        link.click();
    });

    document.getElementById('start-algorithm').addEventListener('click', startFloodFill);
    document.getElementById('pause-algorithm').addEventListener('click', stopFloodFill);
    document.getElementById('step-algorithm').addEventListener('click', stepFloodFill);

    levelButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentLevel = button.dataset.level;
            loadLevelFromText(`levels/level${currentLevel}.txt`);
            resetFloodFillState();
        });
    });

    const clearDisplayButton = document.getElementById('clear-display');
    clearDisplayButton.addEventListener('click', () => {
        clearGridDisplay();
    });
    function clearGridDisplay() {
        document.querySelectorAll('.grid div').forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const cellValue = gridData[row][col];
            if (cellValue === '0') {
                cell.style.backgroundColor = 'white';
                cell.textContent = '';
            } else if (cellValue !== '1' && cellValue !== 'G' && cellValue !== 'B') {
                cell.style.backgroundColor = 'white';
            }
        });
    }



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
    const generateGridButton = document.getElementById('generate-grid');
    const saveMapButton = document.getElementById('save-map');
    const uploadTaskButton = document.getElementById('uploadTaskButton');
    const colorPickers = document.querySelectorAll('.color-picker');

    const entireBoundaryButton = document.querySelector('.color-picker[data-color="deepskyblue"]');


    let beginningPoints = "all";
    let customStartingPoints = [];
    let correctAnswerPoints = [];
    let selectedColor = 'white';

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
                }

                cell.addEventListener('click', () => handleCellClick(cell, row, col));
                grid.appendChild(cell);
            }
        }

        correctAnswerPoints.forEach(([r, c]) => {
            const cell = document.querySelector(`.grid div[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.style.backgroundColor = 'green';
            }
        });

        customStartingPoints.forEach(([r, c]) => {
            const cell = document.querySelector(`.grid div[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.style.backgroundColor = 'deepskyblue';
                cell.textContent = '1';
            }
        });
    }

    function handleCellClick(cell, row, col) {
        if (selectedColor === 'black') {
            gridData[row][col] = '1';
            cell.style.backgroundColor = 'black';
            correctAnswerPoints = correctAnswerPoints.filter(([r, c]) => !(r == row && c == col));
            customStartingPoints = customStartingPoints.filter(([r, c]) => !(r == row && c == col));
        } else if (selectedColor === 'green') {
            if (!correctAnswerPoints.some(([r, c]) => r == row && c == col)) {
                correctAnswerPoints.push([row, col]);
                cell.style.backgroundColor = 'green';
            } else {
                correctAnswerPoints = correctAnswerPoints.filter(([r, c]) => !(r == row && c == col));
                cell.style.backgroundColor = 'white';
            }
        } else if (selectedColor === 'deepskyblue') {
            if (!customStartingPoints.some(([r, c]) => r == row && c == col)) {
                cell.style.backgroundColor = 'deepskyblue';
                cell.textContent = '1';
                customStartingPoints.push([row, col]);
            } else {
                cell.style.backgroundColor = 'white';
                cell.textContent = '';
                customStartingPoints = customStartingPoints.filter(([r, c]) => !(r == row && c == col));
            }
        } else if (selectedColor === 'white') {
            gridData[row][col] = '0';
            cell.style.backgroundColor = 'white';
            correctAnswerPoints = correctAnswerPoints.filter(([r, c]) => !(r == row && c == col));
            customStartingPoints = customStartingPoints.filter(([r, c]) => !(r == row && c == col));
        }
    }

    colorPickers.forEach(picker => {
        picker.addEventListener('click', (event) => {
            selectedColor = event.target.dataset.color;
        });
    });

    entireBoundaryButton.addEventListener('click', () => {
        beginningPoints = 'all';
        customStartingPoints = [];
    });

    uploadTaskButton.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const fileContent = e.target.result;
                loadTaskFromFile(fileContent);
            };
            reader.readAsText(file);
        }
    });

    function loadTaskFromFile(fileContent) {
        const lines = fileContent.trim().split('\n');
        const taskCategory = lines[0];
        const taskDescription = lines[1];
        gridData = lines.slice(2, lines.length - 3).map(line => line.split(''));

        const answerCategory = lines[lines.length - 3];
        const correctAnswerPointsLine = lines[lines.length - 2];
        const beginningPointsLine = lines[lines.length - 1];

        document.getElementById('category-input').value = taskCategory;
        document.getElementById('task-input').value = taskDescription;
        document.getElementById('answer-category-input').value = answerCategory;

        if (answerCategory === 'number') {
            document.getElementById('correct-answer-input').value = correctAnswerPointsLine;
        } else {
            document.getElementById('correct-answer-input').value = ''; // Clear if not applicable
        }

        if (correctAnswerPointsLine.trim() !== '' && answerCategory !== 'number') {
            correctAnswerPoints = correctAnswerPointsLine.split(' ').map(point => point.split(',').map(Number));
        } else {
            correctAnswerPoints = [];
        }

        if (beginningPointsLine === 'all') {
            beginningPoints = 'all';
            customStartingPoints = [];
        } else {
            customStartingPoints = beginningPointsLine.split(' ').map(point => point.split(',').map(Number));
            beginningPoints = ''; // Set to custom mode since points are explicitly defined
        }

        const rows = gridData.length;
        const cols = gridData[0].length;
        rowsInput.value = rows;
        colsInput.value = cols;

        createCustomGrid(rows, cols, parseInt(sizeInput.value));
    }

    saveMapButton.addEventListener('click', () => {
        const taskCategory = document.getElementById('category-input').value;
        const taskDescription = document.getElementById('task-input').value;

        let fileContent = taskCategory + '\n' + taskDescription + '\n';

        gridData.forEach(row => {
            fileContent += row.join('') + '\n';
        });

        const answerCategory = document.getElementById('answer-category-input').value;
        fileContent += answerCategory + '\n';

        if (answerCategory === 'number') {
            const correctAnswerNumber = document.getElementById('correct-answer-input').value;
            fileContent += `${correctAnswerNumber}\n`;
        } else if (correctAnswerPoints.length > 0) {
            const correctAnswer = correctAnswerPoints.map(([r, c]) => `${r},${c}`).join(' ');
            fileContent += `${correctAnswer}\n`;
        } else {
            fileContent += `\n`;
        }

        if (beginningPoints === 'all' && customStartingPoints.length === 0) {
            fileContent += `all\n`;
        } else {
            const startingPoints = customStartingPoints.map(([r, c]) => `${r},${c}`).join(' ');
            fileContent += `${startingPoints}\n`;
        }

        const blob = new Blob([fileContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'new_task.txt';
        link.click();
    });
}




