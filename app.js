const BASE_URL = 'https://timetrackerapi-9b37bc53e807.herokuapp.com/api/TimeTracker';
let timerInterval = null;

// Tree and UI elements
const tree = document.getElementById('tree');
const statusText = document.getElementById('status');

function showModal(message) {
    document.getElementById('modalText').textContent = message;
    document.getElementById('modal').classList.add('show');
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
}

function updateTreeState(isRunning, elapsedMs = 0) {
    if (!tree) return;
    
    tree.classList.remove('growing', 'grown');
    
    if (isRunning) {
        // Tree grows based on elapsed time
        if (elapsedMs > 60000) { // After 1 minute, fully grown
            tree.classList.add('grown');
        } else {
            tree.classList.add('growing');
        }
    }
}

function updateStatusText(isRunning) {
    if (!statusText) return;
    
    if (isRunning) {
        statusText.textContent = 'Growing...';
    } else {
        statusText.textContent = 'Ready to focus';
    }
}

async function fetchStatus(showAlert = false) {
    try {
        const res = await fetch(`${BASE_URL}/status`);
        if (!res.ok) throw new Error('Status request failed');

        const data = await res.json();
        // Server time to avoid client/server clock skew
        const serverDateHeader = res.headers.get('Date');
        const serverNow = serverDateHeader ? new Date(serverDateHeader) : null;

        // Status butonu: sadece o anki durumu/elapsed'i göster
        if (showAlert) {
            if (data.isRunning) {
                const elapsedText = document.getElementById('elapsed').textContent;
                showModal(`🌱 Your tree is growing!\n\nTime: ${elapsedText}`);
            } else {
                showModal('🌲 Your tree is resting.\nStart a new session to grow!');
            }
        }

        updateStatusText(data.isRunning);
        document.getElementById('startedAt').textContent = data.startedAt ? new Date(data.startedAt).toLocaleString() : '-';
        document.getElementById('startBtn').disabled = data.isRunning;
        document.getElementById('stopBtn').disabled = !data.isRunning;

        // Start/stop elapsed timer synced with server time
        if (data.isRunning && data.startedAt) {
            const startTime = new Date(data.startedAt);
            if (!isNaN(startTime.getTime())) {
                startElapsedTimer(startTime, serverNow);
            } else {
                stopElapsedTimer();
            }
        } else {
            stopElapsedTimer();
        }

        document.getElementById('error').textContent = '';
    } catch (e) {
        document.getElementById('error').textContent = 'Error: ' + e.message;
    }
}

function startElapsedTimer(startTime, serverNow) {
    stopElapsedTimer();

    const baseNow = serverNow instanceof Date && !isNaN(serverNow) ? serverNow : new Date();
    let elapsedMs = Math.max(0, baseNow - startTime);

    const updateElapsed = () => {
        const hours = Math.floor(elapsedMs / 3600000);
        const minutes = Math.floor((elapsedMs % 3600000) / 60000);
        const seconds = Math.floor((elapsedMs % 60000) / 1000);

        const formatted =
            hours > 0
                ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                : `${minutes}:${String(seconds).padStart(2, '0')}`;

        document.getElementById('elapsed').textContent = formatted;
        
        // Update tree growth
        updateTreeState(true, elapsedMs);
        
        elapsedMs += 1000; 
    };

    updateElapsed();
    timerInterval = setInterval(updateElapsed, 1000);
}

function stopElapsedTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    document.getElementById('elapsed').textContent = '0:00';
    updateTreeState(false);
    updateStatusText(false);
}

async function startTimer() {
    try {
        const res = await fetch(`${BASE_URL}/start`, { method: 'POST' });
        if (!res.ok) throw new Error('Start failed');
        await fetchStatus();
    } catch (e) {
        document.getElementById('error').textContent = 'Error: ' + e.message;
    }
}

async function stopTimer() {
    try {
        const res = await fetch(`${BASE_URL}/stop`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Stop failed');
        }

        const emoji = data.durationMinutes >= 1 ? '🌳' : '🌱';
        showModal(`${emoji} Tree Harvested!\n\n${data.durationMinutes} minutes\n${data.comment}`);
        await fetchStatus();
    } catch (e) {
        document.getElementById('error').textContent = 'Error: ' + e.message;
    }
}

// GET /total explicit button handler
async function showTotal() {
    try {
        const res = await fetch(`${BASE_URL}/total`);
        if (!res.ok) throw new Error('Total request failed');
        const data = await res.json();
        
        const trees = Math.floor(data.totalMinutes / 25); // 1 tree per 25 min
        const treeEmojis = '🌲'.repeat(Math.min(trees, 10)) || '🌱';
        
        showModal(
            data.totalMinutes > 0
                ? `🌲 Your Forest 🌲\n\nTotal focus time:\n${data.totalMinutes} minutes\n\n${treeEmojis}`
                : '🌱 Your forest is empty.\nStart planting trees!'
        );
    } catch (e) {
        document.getElementById('error').textContent = 'Error: ' + e.message;
    }
}

// POST /reset button handler
async function resetTimer() {
    try {
        const res = await fetch(`${BASE_URL}/reset`, { method: 'POST' });
        if (!res.ok) throw new Error('Reset failed');
        showModal('🔄 Forest cleared!\n\nReady for a fresh start.');
        await fetchStatus();
    } catch (e) {
        document.getElementById('error').textContent = 'Error: ' + e.message;
    }
}

// Fetch status on page load
fetchStatus();
