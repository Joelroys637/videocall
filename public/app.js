const configuration = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let roomId = null;

const landing = document.getElementById('landing');
const callScreen = document.getElementById('call-screen');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const roomIdInput = document.getElementById('roomIdInput');
const currentRoomId = document.getElementById('currentRoomId');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const runSetupBtn = document.getElementById('runSetupBtn');
const hangupBtn = document.getElementById('hangupBtn');
const micBtn = document.getElementById('micBtn');
const cameraBtn = document.getElementById('cameraBtn');
const roomInfo = document.getElementById('room-info');
const statusMsg = document.getElementById('statusMsg');

// --- Event Listeners ---

createBtn.addEventListener('click', createRoom);
joinBtn.addEventListener('click', joinRoom);
hangupBtn.addEventListener('click', hangUp);

micBtn.addEventListener('click', toggleMic);
cameraBtn.addEventListener('click', toggleCamera);

roomInfo.addEventListener('click', () => {
    if (roomId) {
        navigator.clipboard.writeText(roomId).then(() => {
            alert("Room ID copied to clipboard!");
        });
    }
});

// --- Core WebRTC Functions ---

async function openUserMedia() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = stream;
        localStream = stream;

        remoteStream = new MediaStream();
        remoteVideo.srcObject = remoteStream;

        console.log('Stream:', stream);
        return true;
    } catch (error) {
        console.error('Error opening user media.', error);
        statusMsg.innerText = "Error accessing camera/mic. Please allow permissions.";
        return false;
    }
}

async function createRoom() {
    statusMsg.innerText = "Creating room...";
    if (await openUserMedia()) {
        const roomRef = await db.collection('rooms').doc();
        roomId = roomRef.id;

        console.log('Create PeerConnection with configuration: ', configuration);
        peerConnection = new RTCPeerConnection(configuration);

        registerPeerConnectionListeners();

        // Add local tracks to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Collecting ICE candidates
        const callerCandidatesCollection = roomRef.collection('callerCandidates');

        peerConnection.addEventListener('icecandidate', event => {
            if (!event.candidate) {
                console.log('Got final candidate!');
                return;
            }
            console.log('Got candidate: ', event.candidate);
            callerCandidatesCollection.add(event.candidate.toJSON());
        });

        // Create Offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log('Created offer:', offer);

        const roomWithOffer = {
            offer: {
                type: offer.type,
                sdp: offer.sdp,
            },
        };
        await roomRef.set(roomWithOffer);
        roomIdInput.value = roomId;
        console.log(`New room created with SDP offer. Room ID: ${roomId}`);

        showCallScreen(roomId);

        // Listen for remote answer
        roomRef.onSnapshot(async snapshot => {
            const data = snapshot.data();
            if (!peerConnection.currentRemoteDescription && data && data.answer) {
                console.log('Got remote answer: ', data.answer);
                const rtcSessionDescription = new RTCSessionDescription(data.answer);
                await peerConnection.setRemoteDescription(rtcSessionDescription);
            }
        });

        // Listen for remote ICE candidates
        roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });
    }
}

async function joinRoom() {
    roomId = roomIdInput.value;
    if (!roomId) {
        statusMsg.innerText = "Please enter a valid Room ID.";
        return;
    }

    statusMsg.innerText = "Joining room...";
    const roomRef = db.collection('rooms').doc(roomId);
    const roomSnapshot = await roomRef.get();

    if (!roomSnapshot.exists) {
        statusMsg.innerText = "Room not found. Check the ID.";
        return;
    }

    console.log('Got room:', roomSnapshot.exists);

    if (await openUserMedia()) {
        console.log('Create PeerConnection with configuration: ', configuration);
        peerConnection = new RTCPeerConnection(configuration);
        registerPeerConnectionListeners();

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Code for collecting ICE candidates
        const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
        peerConnection.addEventListener('icecandidate', event => {
            if (!event.candidate) {
                console.log('Got final candidate!');
                return;
            }
            console.log('Got candidate: ', event.candidate);
            calleeCandidatesCollection.add(event.candidate.toJSON());
        });

        // Get Offer
        const data = roomSnapshot.data();
        const offer = data.offer;
        console.log('Got offer:', offer);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        // Create Answer
        const answer = await peerConnection.createAnswer();
        console.log('Created answer:', answer);
        await peerConnection.setLocalDescription(answer);

        const roomWithAnswer = {
            answer: {
                type: answer.type,
                sdp: answer.sdp,
            },
        };
        await roomRef.update(roomWithAnswer);

        showCallScreen(roomId);

        // Listen for remote ICE candidates
        roomRef.collection('callerCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });
    }
}

function registerPeerConnectionListeners() {
    peerConnection.addEventListener('iceconnectionstatechange', () => {
        console.log(`ICE connection state change: ${peerConnection.iceConnectionState}`);
        if (peerConnection.iceConnectionState === 'disconnected') {
            statusMsg.innerText = "Remote user disconnected.";
            // Optionally handle cleanup here
        }
    });

    peerConnection.addEventListener('track', event => {
        console.log('Got remote track:', event.streams[0]);
        event.streams[0].getTracks().forEach(track => {
            console.log('Add a track to the remoteStream:', track);
            remoteStream.addTrack(track);
        });
    });
}

async function hangUp(e) {
    const tracks = localStream.getTracks();
    tracks.forEach(track => track.stop());

    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
    }

    if (peerConnection) {
        peerConnection.close();
    }

    roomIdInput.value = '';

    // Clean UI
    document.querySelector('#localVideo').srcObject = null;
    document.querySelector('#remoteVideo').srcObject = null;

    landing.classList.remove('hidden');
    callScreen.classList.remove('active');

    location.reload(); // Simple reload to clear listeners
}

// --- UI Helpers ---

function showCallScreen(id) {
    landing.classList.add('hidden');
    callScreen.classList.add('active');
    currentRoomId.innerText = id;
}

function toggleMic() {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack.enabled) {
        audioTrack.enabled = false;
        micBtn.classList.add('active');
        micBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
    } else {
        audioTrack.enabled = true;
        micBtn.classList.remove('active');
        micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    }
}

function toggleCamera() {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack.enabled) {
        videoTrack.enabled = false;
        cameraBtn.classList.add('active');
        cameraBtn.innerHTML = '<i class="fa-solid fa-video-slash"></i>';
    } else {
        videoTrack.enabled = true;
        cameraBtn.classList.remove('active');
        cameraBtn.innerHTML = '<i class="fa-solid fa-video"></i>';
    }
}
