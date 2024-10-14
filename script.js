let audioContext;
const tracks = [];
console.log("JS script loaded");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded");
    document.getElementById('playBtn').addEventListener('click', initializeAudioContext);
    document.getElementById('stopBtn').addEventListener('click', stopAudio);
});

async function initializeAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("AudioContext initialized");
        await initApp(); // Initialize the app after creating AudioContext
    }

    if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log("AudioContext resumed");
    }

    playAudio();
}

async function loadAudio(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
}

function createTrack(audioBuffer) {
    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.loop = true;
    const gainNode = audioContext.createGain();
    const pannerNode = audioContext.createStereoPanner();

    sourceNode.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(audioContext.destination);

    return { sourceNode, gainNode, pannerNode };
}

function playAudio() {
    console.log("Playing audio");
    tracks.forEach(track => {
        if (!track.sourceNode.isPlaying) {
            track.sourceNode.start();
            track.sourceNode.isPlaying = true;
        }
    });
}

function stopAudio() {
    if (audioContext) {
        console.log("Stopping audio");
        tracks.forEach(track => {
            if (track.sourceNode.isPlaying) {
                track.sourceNode.stop();
                track.sourceNode.isPlaying = false;
            }
        });
        initApp(); // Recreate tracks for next play
    }
}

function setVolume(trackIndex, volume) {
    console.log(`Setting volume for track ${trackIndex} to ${volume}`);
    tracks[trackIndex].gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
}

function setPanning(trackIndex, panValue) {
    if (!isFinite(panValue)) {
        console.error(`Invalid pan value for track ${trackIndex}: ${panValue}`);
        return;
    }
    console.log(`Setting panning for track ${trackIndex} to ${panValue}`);
    tracks[trackIndex].pannerNode.pan.setValueAtTime(panValue, audioContext.currentTime);
    const knob = document.querySelector(`#panKnob${trackIndex}`);
    rotateKnob(knob, panValue);
}

function createTrackUI(index) {
    const trackDiv = document.createElement('div');
    trackDiv.className = 'track';
    trackDiv.innerHTML = `
        <h3>Track ${index + 1}</h3>
        <div class="controls-container">
            <div class="pan-control">
                <div class="knob" id="panKnob${index}"></div>
                <div class="pan-label">Pan</div>
            </div>
            <div class="volume-control">
                <input type="range" min="0" max="1" step="0.01" value="1" orient="vertical" 
                       oninput="setVolume(${index}, this.value)">
                <div class="volume-label">Volume</div>
            </div>
        </div>
    `;
    document.getElementById('tracks').appendChild(trackDiv);

    // Set up pan knob
    const knob = trackDiv.querySelector(`#panKnob${index}`);
    let isDragging = false;
    let startY;
    let currentValue = 0; // Track the current value

    knob.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        knob.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaY = startY - e.clientY;
        const newValue = Math.max(-1, Math.min(1, currentValue + deltaY / 100));
        if (newValue !== currentValue) {
            currentValue = newValue;
            setPanning(index, newValue);
            rotateKnob(knob, newValue);
        }
        startY = e.clientY; // Update startY for the next move event
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        knob.style.cursor = 'grab';
    });
}

function rotateKnob(knob, value) {
    const rotation = value * 150; // -150 to 150 degrees
    knob.style.setProperty('--rotation', `${rotation}deg`);
}

async function initApp() {
    // Clear existing tracks
    tracks.length = 0;
    document.getElementById('tracks').innerHTML = '';

    try {
        const audioBuffer1 = await loadAudio('Audio/Chords_Loop.wav');
        const audioBuffer2 = await loadAudio('Audio/Drums_Loop_100.wav');
        const audioBuffer3 = await loadAudio('Audio/Percussion_100.flac');
        
        tracks.push(createTrack(audioBuffer1));
        tracks.push(createTrack(audioBuffer2));
        tracks.push(createTrack(audioBuffer3));
        
        tracks.forEach((_, index) => createTrackUI(index));
        console.log(`Created ${tracks.length} tracks`);
    } catch (error) {
        console.error("Error loading audio:", error);
    }
}