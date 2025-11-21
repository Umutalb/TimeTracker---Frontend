const BASE_URL = 'https://timetrackerapi-9b37bc53e807.herokuapp.com/api/timetracker';
let timerInterval = null;

function showModal(message) {
    document.getElementById('modalText').textContent = message;
    document.getElementById('modal').classList.add('show');
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
}

async function fetchStatus(showAlert = false) {
    try {
        const res = await fetch(`${BASE_URL}/status`);
        if (!res.ok) throw new Error('Status request failed');
        
        const data = await res.json();
        
        // Show total time if Status button clicked
        if (showAlert) {
            if (data.isRunning) {
                showModal('Timer is running!');
            } else {
                // Get total time from backend
                const totalRes = await fetch(`${BASE_URL}/total`);
                const totalData = await totalRes.json();
                
                showModal(totalData.totalMinutes > 0 
                    ? `Total work time: ${totalData.totalMinutes} minutes`
                    : 'No sessions yet.');
            }
        }
        
        document.getElementById('status').textContent = 
            data.isRunning ? 'Running' : 'Stopped';
        
        document.getElementById('startedAt').textContent = 
            data.startedAt ? new Date(data.startedAt).toLocaleString() : '-';
        
        document.getElementById('startBtn').disabled = data.isRunning;
        document.getElementById('stopBtn').disabled = !data.isRunning;
        
        // Sayaç başlat veya durdur
        if (data.isRunning && data.startedAt) {
            startElapsedTimer(new Date(data.startedAt));
        } else {
            stopElapsedTimer();
        }
        
        document.getElementById('error').textContent = '';
    } catch (e) {
        document.getElementById('error').textContent = 'Error: ' + e.message;
    }
}

function startElapsedTimer(startTime) {
    stopElapsedTimer(); // Önceki timer'ı temizle
    
    const updateElapsed = () => {
        const now = new Date();
        const diff = now - startTime;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        
        const formatted = hours > 0 
            ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            : `${minutes}:${String(seconds).padStart(2, '0')}`;
        
        document.getElementById('elapsed').textContent = formatted;
    };
    
    updateElapsed(); // Hemen güncelle
    timerInterval = setInterval(updateElapsed, 1000); // Her saniye güncelle
}

function stopElapsedTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    document.getElementById('elapsed').textContent = '0:00';
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
        
        // Show result
        showModal(`Completed!\n${data.durationMinutes} minutes\n${data.comment}`);
        
        await fetchStatus();
    } catch (e) {
        document.getElementById('error').textContent = 'Error: ' + e.message;
    }
}

// Fetch status on page load
fetchStatus();
