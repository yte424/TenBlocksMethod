document.addEventListener('DOMContentLoaded', () => {
    init(); // Hauptinitialisierungsfunktion

    // Farbauswahl-Logik
    const colorPicker = document.getElementById('color-picker');
    const colorInput = document.getElementById('color-input');

    // Synchronisierung der Farbauswahl mit dem Textfeld
    colorPicker.addEventListener('input', () => {
        colorInput.value = colorPicker.value;
    });

    // Beim manuellen Eingeben der Farbe im Textfeld
    colorInput.addEventListener('input', () => {
        const inputColor = colorInput.value;

        if (isValidHex(inputColor)) {
            colorPicker.value = inputColor;
        } else if (isValidRgb(inputColor)) {
            const hexColor = rgbToHex(inputColor);
            colorPicker.value = hexColor;
        } else {
            alert('Bitte einen gültigen Hex- oder RGB-Wert eingeben.');
        }
    });

    // Funktion zur Überprüfung von Hex-Farben
    function isValidHex(color) {
        return /^#([0-9A-F]{3}){1,2}$/i.test(color);
    }

    // Funktion zur Überprüfung von RGB-Farben
    function isValidRgb(color) {
        const rgbPattern = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;
        const match = color.match(rgbPattern);
        if (match) {
            return match.slice(1, 4).every(num => num >= 0 && num <= 255);
        }
        return false;
    }

    // Funktion zur Umwandlung von RGB in Hex
    function rgbToHex(rgb) {
        const rgbPattern = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;
        const result = rgbPattern.exec(rgb);
        return result
            ? `#${((1 << 24) + (parseInt(result[1]) << 16) + (parseInt(result[2]) << 8) + parseInt(result[3]))
                .toString(16)
                .slice(1)
                .toUpperCase()}`
            : '';
    }

    // Reset Button
    document.getElementById('reset-button').addEventListener('click', resetApp);
});

// Hauptinitialisierungsfunktion
function init() {
    setupPlanningForm();
    setupModal();
    updateBereichsliste();
    createBlocks();
}

// Bereichsplanung hinzufügen
function setupPlanningForm() {
    const form = document.getElementById('planning-form');
    form.addEventListener('submit', addBereich);
}

function addBereich(event) {
    event.preventDefault();
    const bereich = document.getElementById('bereich').value;
    const stunden = parseInt(document.getElementById('stunden').value);
    const farbe = document.getElementById('color-picker').value; // Hier wird die Farbe übernommen

    const bereiche = JSON.parse(localStorage.getItem('bereiche')) || {};
    bereiche[bereich] = { stunden: stunden, farbe: farbe };
    localStorage.setItem('bereiche', JSON.stringify(bereiche));

    updateBereichsliste();
    createBlocks();
}

function updateBereichsliste() {
    const bereichsliste = document.getElementById('bereichsliste');
    bereichsliste.innerHTML = ''; // Liste leeren

    const bereiche = JSON.parse(localStorage.getItem('bereiche')) || {};
    for (const [bereich, details] of Object.entries(bereiche)) {
        const div = document.createElement('div');
        div.textContent = `${bereich}: ${details.stunden} Stunden, Farbe: ${details.farbe}`;
        bereichsliste.appendChild(div);
    }

    updateBereichAuswahl();
}

// Dynamische Erstellung der Blöcke basierend auf den geplanten Bereichen
function createBlocks() {
    const blockContainer = document.getElementById('block-container');
    blockContainer.innerHTML = ''; // Alte Blöcke entfernen

    const bereiche = JSON.parse(localStorage.getItem('bereiche')) || {};
    let blockCount = 0;

    for (const [bereich, details] of Object.entries(bereiche)) {
        const anzahlBloecke = Math.ceil(details.stunden / 4); // 1 Block = 4 Stunden
        for (let i = 0; i < anzahlBloecke; i++) {
            blockCount++;
            const block = document.createElement('div');
            block.classList.add('block');
            block.dataset.blockId = blockCount;
            block.dataset.bereich = bereich;
            block.style.backgroundColor = details.farbe;

            const blockTitle = document.createElement('h3');
            blockTitle.textContent = `Block ${blockCount} - ${bereich}`;
            block.appendChild(blockTitle);

            // Fortschrittsanzeige einfügen
            const progressBar = document.createElement('div');
            progressBar.classList.add('progress-bar');
            const progress = document.createElement('div');
            progress.classList.add('progress');
            progress.style.width = '0%'; // Start bei 0%
            progressBar.appendChild(progress);
            block.appendChild(progressBar);

            // Eventlistener zum Öffnen des Modals bei Klick auf den Block
            block.addEventListener('click', () => openModal());

            blockContainer.appendChild(block);
        }
    }
}

// Modal-Setup und Eventlistener

function setupModal() {
    const modal = document.getElementById('task-modal');
    const closeButton = document.querySelector('.close-button');

    // Modal schließen, wenn auf das X geklickt wird
    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Modal schließen, wenn außerhalb des Modals geklickt wird
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    const taskForm = document.getElementById('task-form');
    taskForm.addEventListener('submit', saveTask);
}

// Funktion zum Öffnen des Modals
function openModal() {
    const modal = document.getElementById('task-modal');
    modal.style.display = 'block';
}

// Aufgaben speichern und einem Block zuweisen
function saveTask(event) {
    event.preventDefault();
    const bereich = document.getElementById('bereich-auswahl').value;
    const taskDuration = parseInt(document.getElementById('task-duration').value) * 30; // Dauer in Minuten

    const tasks = JSON.parse(localStorage.getItem('tasks')) || {};
    if (!tasks[bereich]) tasks[bereich] = [];

    // Aufgabe hinzufügen
    tasks[bereich].push({ duration: taskDuration });
    localStorage.setItem('tasks', JSON.stringify(tasks));

    // Fortschritt in den Blöcken aktualisieren
    assignTaskToBlocks(bereich, taskDuration);

    // Modal schließen und Formular zurücksetzen
    document.getElementById('task-modal').style.display = 'none';
    event.target.reset();
}

// Aufgaben einem Block zuweisen
function assignTaskToBlocks(bereich, taskDuration) {
    const blockContainer = document.getElementById('block-container');
    const blocks = blockContainer.querySelectorAll(`.block[data-bereich="${bereich}"]`);

    let remainingDuration = taskDuration; // Dauer der Aufgabe in Minuten
    const maxBlockDuration = 240; // 4 Stunden pro Block in Minuten

    blocks.forEach((block) => {
        const currentBlockId = block.dataset.blockId;
        let blockUsedTime = parseInt(localStorage.getItem(`block-${currentBlockId}`)) || 0;

        if (blockUsedTime < maxBlockDuration && remainingDuration > 0) {
            const availableTime = maxBlockDuration - blockUsedTime;

            // Berechnen, wie viel Zeit in diesen Block passt
            const timeToAssign = Math.min(availableTime, remainingDuration);

            // Zeit im Block aktualisieren
            blockUsedTime += timeToAssign;
            localStorage.setItem(`block-${currentBlockId}`, blockUsedTime);

            // Fortschrittsanzeige für diesen Block aktualisieren
            updateBlockProgress(block, blockUsedTime);

            // Restzeit der Aufgabe verringern
            remainingDuration -= timeToAssign;
        }
    });
}

// Fortschrittsanzeige aktualisieren
function updateBlockProgress(block, usedTime) {
    const progressElement = block.querySelector('.progress');
    const maxBlockDuration = 240; // 4 Stunden pro Block in Minuten
    const progressPercentage = Math.min((usedTime / maxBlockDuration) * 100, 100);

    progressElement.style.width = `${progressPercentage}%`;

    // Farbe basierend auf Fortschritt anpassen
    if (progressPercentage >= 75) {
        progressElement.style.backgroundColor = '#4caf50';
    } else if (progressPercentage >= 50) {
        progressElement.style.backgroundColor = '#ffc107';
    } else {
        progressElement.style.backgroundColor = '#f44336';
    }
}

// Dynamische Bereichsauswahl aktualisieren
function updateBereichAuswahl() {
    const bereichAuswahl = document.getElementById('bereich-auswahl');
    bereichAuswahl.innerHTML = ''; // Alte Optionen löschen

    const bereiche = JSON.parse(localStorage.getItem('bereiche')) || {};
    for (const [bereich] of Object.entries(bereiche)) {
        const option = document.createElement('option');
        option.value = bereich;
        option.textContent = bereich;
        bereichAuswahl.appendChild(option);
    }
}

// Funktion zum Zurücksetzen der App
function resetApp() {
    // Local Storage leeren
    localStorage.removeItem('bereiche');
    localStorage.removeItem('tasks');

    // Alle block-spezifischen Daten löschen
    const blocks = document.querySelectorAll('.block');
    blocks.forEach((block) => {
        const currentBlockId = block.dataset.blockId;
        localStorage.removeItem(`block-${currentBlockId}`);
    });

    // Benutzeroberfläche neu laden
    updateBereichsliste();
    createBlocks();
    alert('App wurde zurückgesetzt!');
}
