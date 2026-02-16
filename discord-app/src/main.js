// ═══════════════════════════════════════════════════════
//  Discord2 — Frontend Application Logic (v3 — Full Clone)
// ═══════════════════════════════════════════════════════

const API = "http://127.0.0.1:8080";
const WS_URL = "ws://127.0.0.1:8080/ws";
const WEBRTC_CONFIG = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

function createVoiceState() {
    return {
        joinedRoomId: null,
        localStream: null,
        peers: {},
        audioEls: {},
        members: {},
        muted: false,
        deafened: false,
    };
}

// ── State ──────────────────────────────────────────────
let state = {
    token: localStorage.getItem("token") || null,
    userId: localStorage.getItem("userId") || null,
    username: localStorage.getItem("username") || null,
    role: null,
    avatarColor: 0,
    avatarUrl: null,
    about: "",
    currentRoomId: null,
    currentRoomName: null,
    currentRoomKind: null,
    ws: null,
    rooms: [],
    users: {},
    voice: createVoiceState(),
};

// ── Preferences ────────────────────────────────────────
let prefs = {
    theme: localStorage.getItem("theme") || "dark",
    fontSize: parseInt(localStorage.getItem("fontSize") || "15"),
    reduceMotion: localStorage.getItem("reduceMotion") === "true",
    compactMode: localStorage.getItem("compactMode") === "true",
};

// Apply preferences immediately
applyPrefs();

function applyPrefs() {
    document.documentElement.setAttribute("data-theme", prefs.theme);
    document.documentElement.style.setProperty("--font-size-base", prefs.fontSize + "px");
    document.documentElement.classList.toggle("reduce-motion", prefs.reduceMotion);
    document.documentElement.classList.toggle("compact-mode", prefs.compactMode);
}

function savePref(key, value) {
    prefs[key] = value;
    localStorage.setItem(key, value);
    applyPrefs();
}

// ── DOM Elements ───────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const authModal = $("#auth-modal");
const app = $("#app");
const authForm = $("#auth-form");
const authUsername = $("#auth-username");
const authPassword = $("#auth-password");
const authSubmit = $("#auth-submit");
const authError = $("#auth-error");
const tabLogin = $("#tab-login");
const tabRegister = $("#tab-register");
const roomsList = $("#rooms-list");
const voiceRoomsList = $("#voice-rooms-list");
const messagesContainer = $("#messages-container");
const messageForm = $("#message-form");
const messageInput = $("#message-input");
const messageInputArea = $("#message-input-area");
const currentRoomName = $("#current-room-name");
const roomKindIcon = $("#room-kind-icon");
const addRoomBtn = $("#add-room-btn");
const createRoomModal = $("#create-room-modal");
const createRoomForm = $("#create-room-form");
const roomNameInput = $("#room-name-input");
const roomKindInput = $("#room-kind-input");
const cancelRoomBtn = $("#cancel-room-btn");
const userAvatar = $("#user-avatar");
const userName = $("#user-name");
const userDiscriminator = $("#user-discriminator");
const muteBtn = $("#mute-btn");
const deafenBtn = $("#deafen-btn");
const deleteRoomBtn = $("#delete-room-btn");
const membersList = $("#members-list");
const memberCount = $("#member-count");
const membersSidebar = $("#members-sidebar");
const voiceRoomPanel = $("#voice-room-panel");
const voiceRoomTitle = $("#voice-room-title");
const joinVoiceBtn = $("#join-voice-btn");
const leaveVoiceBtn = $("#leave-voice-btn");
const voiceMuteBtn = $("#voice-mute-btn");
const voiceDeafenBtn = $("#voice-deafen-btn");
const voiceMembersList = $("#voice-members-list");
const voiceQuickStatus = $("#voice-quick-status");
const voiceStatusText = $("#voice-status-text");
const voiceMeterBars = $("#voice-meter-bars");
const voiceMeterLabel = $("#voice-meter-label");

let micMeterAudioCtx = null;
let micMeterAnalyser = null;
let micMeterSource = null;
let micMeterData = null;
let micMeterAnim = null;

// Settings
const settingsBtn = $("#settings-btn");
const settingsModal = $("#settings-modal");
const closeSettingsBtn = $("#close-settings-btn");
const logoutSettingsBtn = $("#logout-settings-btn");
const updateProfileForm = $("#update-profile-form");
const settingsUsername = $("#settings-username");
const settingsAbout = $("#settings-about");
const settingsPassword = $("#settings-password");
const settingsAvatar = $("#settings-avatar");
const settingsUsernameDisplay = $("#settings-username-display");
const settingsDiscDisplay = $("#settings-disc-display");
const settingsRoleBadge = $("#settings-role-badge");
const avatarColorPicker = $("#avatar-color-picker");
const settingsAvatarColorInput = $("#settings-avatar-color");
const settingsFeedback = $("#settings-feedback");
const acctUsernameDisplay = $("#acct-username-display");
const editPanel = $("#edit-panel");
const editPanelTitle = $("#edit-panel-title");
const cancelEditBtn = $("#cancel-edit-btn");
const btnEditProfile = $("#btn-edit-profile");

// Profile tab
const profileColorPicker = $("#profile-color-picker");
const profileAboutInput = $("#profile-about-input");
const saveProfileBtn = $("#save-profile-btn");
const profileFeedback = $("#profile-feedback");
const previewAvatar = $("#preview-avatar");
const previewBanner = $("#preview-banner");
const previewUsername = $("#preview-username");
const previewDisc = $("#preview-disc");
const previewAbout = $("#preview-about");
const previewBadges = $("#preview-badges");

// Context Menu
const contextMenu = $("#context-menu");
const ctxHeaderTitle = $("#ctx-header-title");
const ctxCopyId = $("#ctx-copy-id");
const ctxDeleteRoom = $("#ctx-delete-room");
const ctxDeleteMessage = $("#ctx-delete-message");
const ctxPromoteAdmin = $("#ctx-promote-admin");

// Typing
const typingIndicator = $("#typing-indicator");
const typingText = $("#typing-text");

// User popout
const userPopout = $("#user-popout");
const popoutAvatar = $("#popout-avatar");
const popoutBanner = $("#popout-banner");
const popoutUsername = $("#popout-username");
const popoutDisc = $("#popout-disc");
const popoutBadges = $("#popout-badges");

// Chat search
const chatSearch = $("#chat-search");

// Members toggle
const membersToggleBtn = $("#members-toggle-btn");
let membersVisible = true;

// ── Auth Mode ──────────────────────────────────────────
let authMode = "login";

tabLogin.addEventListener("click", () => {
    authMode = "login";
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    authSubmit.textContent = "Se connecter";
});

tabRegister.addEventListener("click", () => {
    authMode = "register";
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    authSubmit.textContent = "S'inscrire";
});

// ── Auth Form Submit ───────────────────────────────────
authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authError.textContent = "";
    const username = authUsername.value.trim();
    const password = authPassword.value;
    if (!username || !password) return;

    try {
        const res = await fetch(`${API}/api/${authMode}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
            authError.textContent = data.error || "Erreur d'authentification";
            return;
        }
        saveSession(data);
        enterApp();
    } catch (err) {
        authError.textContent = "Impossible de contacter le serveur";
    }
});

function saveSession(data) {
    state.token = data.token;
    state.userId = data.user_id;
    state.username = data.username;
    if (data.role) state.role = data.role;
    if (data.avatar_color !== undefined) state.avatarColor = data.avatar_color;
    if (data.about !== undefined) state.about = data.about;
    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.user_id);
    localStorage.setItem("username", data.username);
}

// ── Logout ─────────────────────────────────────────────
function logout() {
    if (state.voice?.joinedRoomId) {
        leaveVoiceRoom();
    }
    stopMicMeter();
    if (state.ws) state.ws.close();
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    state = {
        token: null, userId: null, username: null, role: null,
        avatarColor: 0, about: "",
        currentRoomId: null, currentRoomName: null, currentRoomKind: null,
        ws: null, rooms: [], users: {}, voice: createVoiceState()
    };
    app.classList.add("hidden");
    settingsModal.classList.add("hidden");
    authModal.classList.remove("hidden");
    authUsername.value = "";
    authPassword.value = "";
    authError.textContent = "";
    updateVoiceQuickStatus();
}

logoutSettingsBtn.addEventListener("click", logout);

// ── Enter App ──────────────────────────────────────────
async function enterApp() {
    authModal.classList.add("hidden");
    app.classList.remove("hidden");
    await fetchMyProfile();
    updateUserPanel();
    loadRooms();
    connectWebSocket();
}

async function fetchMyProfile() {
    try {
        const res = await fetch(`${API}/api/users/me`, {
            headers: { Authorization: `Bearer ${state.token}` }
        });
        if (res.ok) {
            const data = await res.json();
            state.role = data.role;
            state.avatarColor = data.avatar_color;
            state.about = data.about;
            state.avatarUrl = data.avatar_url || null;
            updateUserPanel();
        }
    } catch (err) {
        console.error("Failed to fetch profile", err);
    }
}

function updateUserPanel() {
    userAvatar.className = `user-avatar avatar-bg-${state.avatarColor % 8}`;
    if (state.avatarUrl) {
        userAvatar.innerHTML = `<img src="${API}${state.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    } else {
        userAvatar.textContent = state.username[0].toUpperCase();
    }
    userName.textContent = state.username;
    const disc = (hashString(state.username) % 9000) + 1000;
    userDiscriminator.textContent = `#${disc}`;
    if (state.role === "admin") {
        deleteRoomBtn.classList.remove("hidden");
    }
}

// ── Load Rooms ─────────────────────────────────────────
async function loadRooms() {
    try {
        const res = await fetch(`${API}/api/rooms`);
        state.rooms = await res.json();
        state.rooms = state.rooms.map((room) => ({
            ...room,
            kind: room.kind === "voice" ? "voice" : "text"
        }));

        if (state.currentRoomId && !state.rooms.find((r) => r.id === state.currentRoomId)) {
            if (state.voice.joinedRoomId) {
                leaveVoiceRoom();
            }
            state.currentRoomId = null;
            state.currentRoomName = null;
            state.currentRoomKind = null;
            currentRoomName.textContent = "Sélectionnez un salon";
            roomKindIcon.textContent = "#";
            messagesContainer.classList.remove("hidden");
            voiceRoomPanel.classList.add("hidden");
            messageInputArea.classList.add("hidden");
        }

        renderRooms();
    } catch (err) {
        console.error("Failed to load rooms:", err);
    }
}

function renderRooms() {
    roomsList.innerHTML = "";
    voiceRoomsList.innerHTML = "";

    state.rooms.forEach((room) => {
        const li = document.createElement("li");
        const icon = room.kind === "voice" ? "🔊" : "#";
        li.innerHTML = `<span class="room-icon">${icon}</span><span>${escapeHtml(room.name)}</span>`;
        if (room.id === state.currentRoomId) li.classList.add("active");
        li.addEventListener("click", () => selectRoom(room));
        li.addEventListener("contextmenu", (e) => showContextMenu(e, "room", room.id, room.name));

        if (room.kind === "voice") {
            voiceRoomsList.appendChild(li);
        } else {
            roomsList.appendChild(li);
        }
    });
}

function updateRoomModeUI(roomKind, roomName) {
    if (roomKind === "voice") {
        roomKindIcon.textContent = "🔊";
        voiceRoomTitle.textContent = roomName || "Salon vocal";
        messagesContainer.classList.add("hidden");
        typingIndicator.classList.add("hidden");
        messageInputArea.classList.add("hidden");
        voiceRoomPanel.classList.remove("hidden");
        renderVoiceMembers();
    } else {
        roomKindIcon.textContent = "#";
        voiceRoomPanel.classList.add("hidden");
        messagesContainer.classList.remove("hidden");
        messageInputArea.classList.remove("hidden");
    }
    updateVoiceButtons();
    updateVoiceQuickStatus();
}

// ── Select Room ────────────────────────────────────────
async function selectRoom(room) {
    if (state.voice.joinedRoomId && state.voice.joinedRoomId !== room.id) {
        leaveVoiceRoom();
    }

    state.currentRoomId = room.id;
    state.currentRoomName = room.name;
    state.currentRoomKind = room.kind;
    currentRoomName.textContent = room.name;
    messageInput.placeholder = `Envoyer un message dans #${room.name}`;
    updateRoomModeUI(room.kind, room.name);

    if (state.role === "admin") {
        deleteRoomBtn.classList.remove("hidden");
    } else {
        deleteRoomBtn.classList.add("hidden");
    }

    renderRooms();

    if (room.kind === "text") {
        await loadMessages(room.id);
    }
}

async function loadMessages(roomId) {
    try {
        const res = await fetch(`${API}/api/rooms/${roomId}/messages`);
        const messages = await res.json();
        messagesContainer.innerHTML = "";

        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon">#</div>
                    <h2>Bienvenue dans #${escapeHtml(state.currentRoomName)} !</h2>
                    <p>C'est le début du salon. Envoyez le premier message !</p>
                </div>
            `;
        } else {
            let lastUsername = null;
            let lastDate = null;
            messages.forEach((msg) => {
                const msgDate = msg.created_at ? msg.created_at.split('T')[0] : null;
                const dateChanged = lastDate && msgDate && msgDate !== lastDate;

                // Insert date separator when day changes
                if (dateChanged) {
                    const sep = document.createElement("div");
                    sep.className = "date-separator";
                    sep.innerHTML = `<span>${formatDateLabel(msgDate)}</span>`;
                    messagesContainer.appendChild(sep);
                }

                const isFirstInGroup = lastUsername !== msg.username || dateChanged;
                appendMessage(msg, isFirstInGroup);
                lastUsername = msg.username;
                lastDate = msgDate;
            });
        }
        scrollToBottom();
    } catch (err) {
        console.error("Failed to load messages:", err);
    }
}

// ── WebSocket & Member List ────────────────────────────
function connectWebSocket() {
    if (state.ws) {
        state.ws.onmessage = null;
        state.ws.onclose = null;
        state.ws.close();
    }

    state.ws = new WebSocket(WS_URL);

    state.ws.onopen = () => {
        console.log("✅ WebSocket connected");
        state.ws.send(JSON.stringify({
            type: "join",
            user_id: state.userId,
            username: state.username,
            avatar_color: state.avatarColor,
            avatar_url: state.avatarUrl || null,
            about: state.about || null,
            role: state.role || "user"
        }));

        if (state.voice.joinedRoomId) {
            state.ws.send(JSON.stringify({
                type: "voice_join",
                room_id: state.voice.joinedRoomId,
                user_id: state.userId,
                username: state.username,
                muted: state.voice.muted,
                deafened: state.voice.deafened,
            }));
        }
    };

    state.ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);

            if (msg.type === "message" && msg.room_id === state.currentRoomId) {
                const lastMsg = messagesContainer.querySelector(".message:last-child");
                let isFirstInGroup = true;
                if (lastMsg) {
                    const lastUser = lastMsg.getAttribute("data-username");
                    if (lastUser === msg.username) isFirstInGroup = false;
                }
                appendMessage(msg, isFirstInGroup);
                scrollToBottom();
            }
            if (msg.type === "join") {
                if (msg.user_id && msg.username) {
                    state.users[msg.user_id] = {
                        username: msg.username,
                        avatar_color: msg.avatar_color || 0,
                        avatar_url: msg.avatar_url || null,
                        role: msg.role || "user",
                        about: msg.about || null,
                        about: msg.about || null
                    };
                    renderMembers();

                    // Update popout if open for this user
                    if (currentPopoutUserId === msg.user_id) {
                        renderUserPopoutContent(msg.user_id, state.users[msg.user_id]);
                    }
                }
            }
            else if (msg.type === "leave") {
                if (msg.user_id) {
                    delete state.users[msg.user_id];
                    cleanupRemotePeer(msg.user_id);
                    delete state.voice.members[msg.user_id];
                    renderVoiceMembers();
                    renderMembers();
                }
            }
            else if (msg.type === "room_deleted") {
                if (state.currentRoomId === msg.room_id) {
                    if (state.voice.joinedRoomId === msg.room_id) {
                        leaveVoiceRoom();
                    }
                    state.currentRoomId = null;
                    state.currentRoomName = null;
                    state.currentRoomKind = null;
                    messagesContainer.innerHTML = "";
                    messageInputArea.classList.add("hidden");
                    voiceRoomPanel.classList.add("hidden");
                    currentRoomName.textContent = "Sélectionnez un salon";
                    roomKindIcon.textContent = "#";
                    deleteRoomBtn.classList.add("hidden");
                    updateVoiceQuickStatus();
                }
                loadRooms();
            }
            else if (msg.type === "message_deleted") {
                if (msg.room_id === state.currentRoomId) {
                    const el = messagesContainer.querySelector(`.message[data-id="${msg.id}"]`);
                    if (el) el.remove();
                }
            }
            else if (msg.type === "typing") {
                if (msg.username !== state.username && msg.room_id === state.currentRoomId) {
                    showTypingIndicator(msg.username);
                }
            }
            else if (msg.type === "voice_join" || msg.type === "voice_leave" || msg.type === "voice_state" || msg.type === "voice_signal") {
                handleVoiceWsEvent(msg);
            }
        } catch (err) {
            console.error("WS error:", err);
        }
    };

    state.ws.onclose = () => {
        resetVoiceConnections();
        setTimeout(connectWebSocket, 3000);
    };
}

function wsSend(payload) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    state.ws.send(JSON.stringify(payload));
}

function updateVoiceButtons() {
    const inVoice = !!state.voice.joinedRoomId;
    joinVoiceBtn.classList.toggle("hidden", inVoice || state.currentRoomKind !== "voice");
    leaveVoiceBtn.classList.toggle("hidden", !inVoice);
    voiceMuteBtn.classList.toggle("hidden", !inVoice);
    voiceDeafenBtn.classList.toggle("hidden", !inVoice);

    const muteLabel = state.voice.muted ? "Réactiver micro" : "Muet";
    const deafenLabel = state.voice.deafened ? "Réactiver casque" : "Sourdine";
    voiceMuteBtn.textContent = muteLabel;
    voiceDeafenBtn.textContent = deafenLabel;
    muteBtn.title = muteLabel;
    deafenBtn.title = deafenLabel;
}

function renderMicMeter(level) {
    const bars = voiceMeterBars ? voiceMeterBars.querySelectorAll("span") : [];
    const clamped = Math.max(0, Math.min(1, level));
    const activeBars = Math.round(clamped * bars.length);
    bars.forEach((bar, idx) => {
        bar.classList.toggle("active", idx < activeBars);
    });

    if (!voiceMeterLabel) return;
    if (!state.voice.joinedRoomId) {
        voiceMeterLabel.textContent = "Micro inactif";
    } else if (state.voice.muted || state.voice.deafened) {
        voiceMeterLabel.textContent = "Micro coupé";
    } else if (activeBars === 0) {
        voiceMeterLabel.textContent = "Parle pour tester";
    } else {
        voiceMeterLabel.textContent = `Niveau micro ${Math.round(clamped * 100)}%`;
    }
}

function updateVoiceQuickStatus() {
    if (!voiceQuickStatus || !voiceStatusText) return;

    voiceQuickStatus.classList.remove("is-selected", "is-connected");

    if (state.voice.joinedRoomId) {
        const room = state.rooms.find((r) => r.id === state.voice.joinedRoomId);
        voiceQuickStatus.classList.add("is-connected");
        voiceStatusText.textContent = `Connecté : ${room ? room.name : "salon vocal"}`;
    } else if (state.currentRoomKind === "voice" && state.currentRoomName) {
        voiceQuickStatus.classList.add("is-selected");
        voiceStatusText.textContent = `Sélectionné : ${state.currentRoomName}`;
    } else {
        voiceStatusText.textContent = "Pas connecté à un salon vocal";
    }

    renderMicMeter(0);
}

function stopMicMeter() {
    if (micMeterAnim) {
        cancelAnimationFrame(micMeterAnim);
        micMeterAnim = null;
    }
    if (micMeterSource) {
        micMeterSource.disconnect();
        micMeterSource = null;
    }
    if (micMeterAnalyser) {
        micMeterAnalyser.disconnect();
        micMeterAnalyser = null;
    }
    if (micMeterAudioCtx) {
        micMeterAudioCtx.close().catch(() => { });
        micMeterAudioCtx = null;
    }
    micMeterData = null;
    renderMicMeter(0);
}

function startMicMeter(stream) {
    stopMicMeter();

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx || !stream) {
        renderMicMeter(0);
        return;
    }

    try {
        micMeterAudioCtx = new AudioCtx();
        micMeterAnalyser = micMeterAudioCtx.createAnalyser();
        micMeterAnalyser.fftSize = 512;
        micMeterAnalyser.smoothingTimeConstant = 0.82;
        micMeterSource = micMeterAudioCtx.createMediaStreamSource(stream);
        micMeterSource.connect(micMeterAnalyser);
        micMeterData = new Uint8Array(micMeterAnalyser.fftSize);

        const tick = () => {
            if (!micMeterAnalyser || !micMeterData) return;

            micMeterAnalyser.getByteTimeDomainData(micMeterData);
            let sum = 0;
            for (let i = 0; i < micMeterData.length; i++) {
                const normalized = (micMeterData[i] - 128) / 128;
                sum += normalized * normalized;
            }
            const rms = Math.sqrt(sum / micMeterData.length);
            const scaled = Math.min(1, rms * 7.5);

            if (state.voice.muted || state.voice.deafened || !state.voice.joinedRoomId) {
                renderMicMeter(0);
            } else {
                renderMicMeter(scaled);
            }

            micMeterAnim = requestAnimationFrame(tick);
        };

        micMeterAnim = requestAnimationFrame(tick);
    } catch (err) {
        console.error("Mic meter init error", err);
        renderMicMeter(0);
    }
}

function renderVoiceMembers() {
    voiceMembersList.innerHTML = "";
    const members = Object.values(state.voice.members);
    if (members.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Aucun membre connecté";
        voiceMembersList.appendChild(li);
        return;
    }

    members.sort((a, b) => a.username.localeCompare(b.username, "fr"));
    members.forEach((member) => {
        const li = document.createElement("li");
        const suffix = [];
        if (member.muted) suffix.push("muet");
        if (member.deafened) suffix.push("sourdine");
        const stateLabel = suffix.length ? suffix.join(" · ") : "en ligne";
        li.innerHTML = `
            <span>${escapeHtml(member.username)}${member.user_id === state.userId ? " (vous)" : ""}</span>
            <span class="voice-member-state">${escapeHtml(stateLabel)}</span>
        `;
        voiceMembersList.appendChild(li);
    });
}

function applyLocalTrackState() {
    if (!state.voice.localStream) return;
    const enabled = !state.voice.muted && !state.voice.deafened;
    state.voice.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
    });
}

function ensureVoiceMember(userId, username) {
    if (!state.voice.members[userId]) {
        state.voice.members[userId] = {
            user_id: userId,
            username: username || state.users[userId]?.username || "Utilisateur",
            muted: false,
            deafened: false,
        };
    }
}

function cleanupRemotePeer(userId) {
    const peer = state.voice.peers[userId];
    if (peer) {
        peer.onicecandidate = null;
        peer.ontrack = null;
        peer.close();
        delete state.voice.peers[userId];
    }

    const audioEl = state.voice.audioEls[userId];
    if (audioEl) {
        audioEl.srcObject = null;
        audioEl.remove();
        delete state.voice.audioEls[userId];
    }
}

function resetVoiceConnections() {
    Object.keys(state.voice.peers).forEach((userId) => cleanupRemotePeer(userId));
}

function createPeerConnection(remoteUserId, shouldCreateOffer) {
    if (state.voice.peers[remoteUserId]) {
        return state.voice.peers[remoteUserId];
    }

    const peer = new RTCPeerConnection(WEBRTC_CONFIG);
    state.voice.peers[remoteUserId] = peer;

    if (state.voice.localStream) {
        state.voice.localStream.getTracks().forEach((track) => {
            peer.addTrack(track, state.voice.localStream);
        });
    }

    peer.onicecandidate = (event) => {
        if (!event.candidate) return;
        wsSend({
            type: "voice_signal",
            room_id: state.voice.joinedRoomId,
            user_id: state.userId,
            target_user_id: remoteUserId,
            candidate: event.candidate,
        });
    };

    peer.ontrack = (event) => {
        let audioEl = state.voice.audioEls[remoteUserId];
        if (!audioEl) {
            audioEl = document.createElement("audio");
            audioEl.autoplay = true;
            audioEl.playsInline = true;
            document.body.appendChild(audioEl);
            state.voice.audioEls[remoteUserId] = audioEl;
        }
        audioEl.srcObject = event.streams[0];
        audioEl.muted = state.voice.deafened;
        audioEl.play().catch(() => {
            // autoplay can be blocked until interaction
        });
    };

    if (shouldCreateOffer) {
        peer.createOffer()
            .then((offer) => peer.setLocalDescription(offer))
            .then(() => {
                wsSend({
                    type: "voice_signal",
                    room_id: state.voice.joinedRoomId,
                    user_id: state.userId,
                    target_user_id: remoteUserId,
                    sdp: peer.localDescription,
                });
            })
            .catch((err) => console.error("Failed to create offer", err));
    }

    return peer;
}

async function handleVoiceSignal(msg) {
    if (msg.target_user_id !== state.userId) return;
    if (!state.voice.joinedRoomId || msg.room_id !== state.voice.joinedRoomId) return;
    if (!msg.user_id) return;

    const remoteUserId = msg.user_id;
    const peer = createPeerConnection(remoteUserId, false);

    if (msg.sdp) {
        await peer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        if (msg.sdp.type === "offer") {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            wsSend({
                type: "voice_signal",
                room_id: state.voice.joinedRoomId,
                user_id: state.userId,
                target_user_id: remoteUserId,
                sdp: peer.localDescription,
            });
        }
    } else if (msg.candidate) {
        await peer.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
}

function handleVoiceWsEvent(msg) {
    if (!msg.room_id) return;

    if (msg.type === "voice_join") {
        if (!msg.user_id || !msg.username) return;
        ensureVoiceMember(msg.user_id, msg.username);
        state.voice.members[msg.user_id].muted = !!msg.muted;
        state.voice.members[msg.user_id].deafened = !!msg.deafened;
        renderVoiceMembers();

        if (
            state.voice.joinedRoomId &&
            state.voice.joinedRoomId === msg.room_id &&
            msg.user_id !== state.userId
        ) {
            createPeerConnection(msg.user_id, true);
        }
        return;
    }

    if (msg.type === "voice_leave") {
        if (!msg.user_id) return;
        cleanupRemotePeer(msg.user_id);
        delete state.voice.members[msg.user_id];
        renderVoiceMembers();
        return;
    }

    if (msg.type === "voice_state") {
        if (!msg.user_id) return;
        ensureVoiceMember(msg.user_id, msg.username);
        state.voice.members[msg.user_id].muted = !!msg.muted;
        state.voice.members[msg.user_id].deafened = !!msg.deafened;
        renderVoiceMembers();
        return;
    }

    if (msg.type === "voice_signal") {
        handleVoiceSignal(msg).catch((err) => console.error("Voice signal error", err));
    }
}

async function joinVoiceRoom() {
    if (state.currentRoomKind !== "voice" || !state.currentRoomId) return;
    if (state.voice.joinedRoomId === state.currentRoomId) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Votre navigateur ne supporte pas l'audio WebRTC.");
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        state.voice.localStream = stream;
        state.voice.joinedRoomId = state.currentRoomId;
        state.voice.members = {};
        ensureVoiceMember(state.userId, state.username);
        state.voice.members[state.userId].muted = state.voice.muted;
        state.voice.members[state.userId].deafened = state.voice.deafened;

        applyLocalTrackState();
        startMicMeter(stream);
        renderVoiceMembers();
        updateVoiceButtons();
        updateVoiceQuickStatus();

        wsSend({
            type: "voice_join",
            room_id: state.currentRoomId,
            user_id: state.userId,
            username: state.username,
            muted: state.voice.muted,
            deafened: state.voice.deafened,
        });
    } catch (err) {
        alert("Impossible d'accéder au micro.");
        console.error(err);
    }
}

function leaveVoiceRoom() {
    if (!state.voice.joinedRoomId) return;

    wsSend({
        type: "voice_leave",
        room_id: state.voice.joinedRoomId,
        user_id: state.userId,
        username: state.username,
    });

    resetVoiceConnections();
    if (state.voice.localStream) {
        state.voice.localStream.getTracks().forEach((track) => track.stop());
    }
    stopMicMeter();

    state.voice.joinedRoomId = null;
    state.voice.localStream = null;
    state.voice.members = {};
    renderVoiceMembers();
    updateVoiceButtons();
    updateVoiceQuickStatus();
}

function toggleVoiceMute() {
    if (!state.voice.joinedRoomId) return;
    state.voice.muted = !state.voice.muted;
    applyLocalTrackState();
    ensureVoiceMember(state.userId, state.username);
    state.voice.members[state.userId].muted = state.voice.muted;
    renderVoiceMembers();
    updateVoiceButtons();
    updateVoiceQuickStatus();

    wsSend({
        type: "voice_state",
        room_id: state.voice.joinedRoomId,
        user_id: state.userId,
        username: state.username,
        muted: state.voice.muted,
        deafened: state.voice.deafened,
    });
}

function toggleVoiceDeafen() {
    if (!state.voice.joinedRoomId) return;
    state.voice.deafened = !state.voice.deafened;
    applyLocalTrackState();

    Object.values(state.voice.audioEls).forEach((audioEl) => {
        audioEl.muted = state.voice.deafened;
    });

    ensureVoiceMember(state.userId, state.username);
    state.voice.members[state.userId].deafened = state.voice.deafened;
    renderVoiceMembers();
    updateVoiceButtons();
    updateVoiceQuickStatus();

    wsSend({
        type: "voice_state",
        room_id: state.voice.joinedRoomId,
        user_id: state.userId,
        username: state.username,
        muted: state.voice.muted,
        deafened: state.voice.deafened,
    });
}

function renderMembers() {
    membersList.innerHTML = "";
    const entries = Object.entries(state.users);
    memberCount.textContent = entries.length;

    entries.forEach(([uid, u]) => {
        const li = document.createElement("li");
        const avatarContent = u.avatar_url
            ? `<img src="${API}${u.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`
            : u.username[0].toUpperCase();
        li.innerHTML = `
            <div class="member-avatar-wrapper">
                <div class="avatar avatar-bg-${u.avatar_color % 8}">
                    ${avatarContent}
                </div>
                <div class="status-dot online"></div>
            </div>
            <div class="name">${escapeHtml(u.username)}</div>
        `;
        li.addEventListener("contextmenu", (e) => showContextMenu(e, "user", uid, u.username));
        li.addEventListener("click", (e) => showUserPopout(e, uid, u));
        membersList.appendChild(li);
    });
}

function appendMessage(msg, isFirstInGroup = true) {
    const div = document.createElement("div");
    div.classList.add("message");
    div.setAttribute("data-username", msg.username);
    div.setAttribute("data-id", msg.id);
    if (isFirstInGroup) div.classList.add("first-in-group");

    div.addEventListener("contextmenu", (e) => showContextMenu(e, "message", msg.id, msg.username));

    const colorIndex = hashString(msg.username) % 8;
    const time = formatTime(msg.created_at);

    // Build message actions bar
    const actionsHtml = `
        <div class="message-actions">
            <button class="msg-action-btn" title="Réagir">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
            </button>
            <button class="msg-action-btn" title="Répondre">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 17 4 12 9 7"></polyline>
                    <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                </svg>
            </button>
            ${(state.role === "admin" || msg.username === state.username) ? `
            <button class="msg-action-btn danger" title="Supprimer" onclick="deleteMessageFromBtn('${msg.id}')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>` : ''}
        </div>
    `;

    // Build image HTML if present
    const imageHtml = msg.image_url ? `
        <div class="message-image-wrapper">
            <img class="message-image" src="${API}${msg.image_url}" alt="image" onclick="openLightbox('${API}${msg.image_url}')" />
        </div>
    ` : '';

    // Detect emoji-only messages for jumbo display
    const emojiClass = msg.content ? getEmojiClass(msg.content) : '';
    const contentHtml = msg.content ? `<div class="message-content${emojiClass ? ' ' + emojiClass : ''}">${escapeHtml(msg.content)}</div>` : '';

    // Avatar content — show profile image if available
    const avatarContent = msg.avatar_url
        ? `<img src="${API}${msg.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`
        : msg.username[0].toUpperCase();

    if (isFirstInGroup) {
        div.innerHTML = `
            ${actionsHtml}
            <div class="message-avatar avatar-bg-${colorIndex}">${avatarContent}</div>
            <div class="message-body">
                <div class="message-header">
                    <span class="message-username name-color-${colorIndex}">${escapeHtml(msg.username)}</span>
                    <span class="message-time">${time}</span>
                </div>
                ${contentHtml}
                ${imageHtml}
            </div>
        `;
    } else {
        div.innerHTML = `
            ${actionsHtml}
            <div class="message-avatar placeholder"></div>
            <div class="message-body">
                ${contentHtml}
                ${imageHtml}
            </div>
        `;
    }

    messagesContainer.appendChild(div);
}

// Expose for inline onclick
window.deleteMessageFromBtn = async function (msgId) {
    if (!confirm("Supprimer ce message ?")) return;
    try {
        const res = await fetch(`${API}/api/messages/${msgId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${state.token}` }
        });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || "Erreur");
        }
    } catch (e) { alert("Erreur réseau"); }
};

// ── Send Message ───────────────────────────────────────
let pendingImageUrl = null;
const fileInput = $("#file-input");
const attachBtn = $("#attach-btn");
const uploadPreview = $("#upload-preview");
const uploadPreviewImg = $("#upload-preview-img");
const uploadFilename = $("#upload-filename");
const uploadCancelBtn = $("#upload-cancel-btn");

// File attach button
attachBtn.addEventListener("click", () => fileInput.click());

// File selected
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadPreviewImg.src = e.target.result;
        uploadFilename.textContent = file.name;
        uploadPreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
});

// Cancel upload
uploadCancelBtn.addEventListener("click", () => {
    fileInput.value = "";
    pendingImageUrl = null;
    uploadPreview.classList.add("hidden");
});

messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = messageInput.value.trim();
    const file = fileInput.files[0];
    if (!content && !file) return;
    if (state.currentRoomKind !== "text") return;
    if (!state.currentRoomId || !state.ws) return;

    let imageUrl = null;

    // Upload image first if there is one
    if (file) {
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch(`${API}/api/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${state.token}` },
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                imageUrl = data.url;
            } else {
                const data = await res.json();
                alert(data.error || "Erreur d'upload");
                return;
            }
        } catch (err) {
            alert("Erreur réseau lors de l'upload");
            return;
        }
    }

    const msg = {
        type: "message",
        room_id: state.currentRoomId,
        user_id: state.userId,
        username: state.username,
        content: content || "",
        avatar_color: state.avatarColor
    };
    if (imageUrl) msg.image_url = imageUrl;

    state.ws.send(JSON.stringify(msg));
    messageInput.value = "";
    fileInput.value = "";
    uploadPreview.classList.add("hidden");
});

// ── Typing Indicator ───────────────────────────────────
let typingTimeout = null;
let isTyping = false;

messageInput.addEventListener("input", () => {
    if (!state.ws || !state.currentRoomId) return;
    if (!isTyping) {
        isTyping = true;
        state.ws.send(JSON.stringify({
            type: "typing",
            room_id: state.currentRoomId,
            username: state.username
        }));
    }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { isTyping = false; }, 3000);
});

let typingHideTimeout = null;
function showTypingIndicator(username) {
    typingText.textContent = `${username} est en train d'écrire...`;
    typingIndicator.classList.remove("hidden");
    clearTimeout(typingHideTimeout);
    typingHideTimeout = setTimeout(() => {
        typingIndicator.classList.add("hidden");
    }, 4000);
}

// ── Admin: Delete Room ─────────────────────────────────
deleteRoomBtn.addEventListener("click", async () => {
    if (!confirm(`Voulez-vous vraiment supprimer le salon #${state.currentRoomName} ?`)) return;
    try {
        const res = await fetch(`${API}/api/rooms/${state.currentRoomId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${state.token}` }
        });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || "Erreur lors de la suppression");
        }
    } catch (err) {
        alert("Erreur réseau");
    }
});

// ── Members Toggle ─────────────────────────────────────
membersToggleBtn.addEventListener("click", () => {
    membersVisible = !membersVisible;
    membersSidebar.style.display = membersVisible ? "" : "none";
});

joinVoiceBtn.addEventListener("click", () => {
    joinVoiceRoom();
});

leaveVoiceBtn.addEventListener("click", () => {
    leaveVoiceRoom();
});

voiceMuteBtn.addEventListener("click", () => {
    toggleVoiceMute();
});

voiceDeafenBtn.addEventListener("click", () => {
    toggleVoiceDeafen();
});

muteBtn.addEventListener("click", () => {
    toggleVoiceMute();
});

deafenBtn.addEventListener("click", () => {
    toggleVoiceDeafen();
});

// ── Chat Search (client-side filter) ───────────────────
chatSearch.addEventListener("input", () => {
    const query = chatSearch.value.toLowerCase();
    const messages = messagesContainer.querySelectorAll(".message");
    messages.forEach((msg) => {
        const content = msg.querySelector(".message-content");
        if (!content) return;
        if (query === "") {
            msg.style.display = "";
        } else {
            msg.style.display = content.textContent.toLowerCase().includes(query) ? "" : "none";
        }
    });
});

// ═══ Settings Logic ════════════════════════════════════

// Open settings
settingsBtn.addEventListener("click", () => {
    settingsModal.classList.remove("hidden");
    populateSettingsUI();
});

// Close settings
closeSettingsBtn.addEventListener("click", () => settingsModal.classList.add("hidden"));

// Close on ESC
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (!settingsModal.classList.contains("hidden")) {
            settingsModal.classList.add("hidden");
            return;
        }
        if (!userPopout.classList.contains("hidden")) {
            userPopout.classList.add("hidden");
            return;
        }
    }
});

// Tab navigation
document.querySelectorAll(".settings-nav-item[data-section]").forEach(tab => {
    tab.addEventListener("click", () => {
        // Mark active tab
        document.querySelectorAll(".settings-nav-item").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        // Show section
        document.querySelectorAll(".settings-section").forEach(s => s.classList.remove("active"));
        const target = document.getElementById(`section-${tab.dataset.section}`);
        if (target) target.classList.add("active");
    });
});

function populateSettingsUI() {
    const disc = `#${(hashString(state.username) % 9000) + 1000}`;

    // Mon Compte tab
    settingsAvatar.className = `profile-avatar avatar-bg-${state.avatarColor % 8}`;
    if (state.avatarUrl) {
        settingsAvatar.innerHTML = `<img src="${API}${state.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    } else {
        settingsAvatar.textContent = state.username[0].toUpperCase();
    }
    settingsUsernameDisplay.textContent = state.username;
    settingsDiscDisplay.textContent = disc;
    acctUsernameDisplay.textContent = state.username;
    settingsRoleBadge.textContent = (state.role || "USER").toUpperCase();
    $("#settings-banner").style.background = getAvatarBgColor(state.avatarColor);

    // Edit panel hidden
    editPanel.classList.add("hidden");
    settingsUsername.value = state.username;
    settingsAbout.value = state.about || "";

    // Profils tab
    previewAvatar.className = `preview-avatar avatar-bg-${state.avatarColor % 8}`;
    if (state.avatarUrl) {
        previewAvatar.innerHTML = `<img src="${API}${state.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    } else {
        previewAvatar.textContent = state.username[0].toUpperCase();
    }
    previewBanner.style.background = getAvatarBgColor(state.avatarColor);
    previewUsername.textContent = state.username;
    previewDisc.textContent = disc;
    previewAbout.textContent = state.about || "Aucune description.";
    profileAboutInput.value = state.about || "";
    renderColorPickerTo(profileColorPicker, state.avatarColor, (i) => {
        state.avatarColor = i;
        previewAvatar.className = `preview-avatar avatar-bg-${i}`;
        previewAvatar.innerHTML = state.avatarUrl ? `<img src="${API}${state.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : state.username[0].toUpperCase();
        previewBanner.style.background = getAvatarBgColor(i);
    });

    // Avatar upload buttons
    const rmBtn = $("#avatar-remove-btn");
    if (rmBtn) rmBtn.style.display = state.avatarUrl ? "inline-flex" : "none";
    const upStatus = $("#avatar-upload-status");
    if (upStatus) upStatus.textContent = "";

    // Apparence tab
    const savedTheme = prefs.theme;
    document.querySelectorAll('input[name="theme"]').forEach(r => {
        r.checked = r.value === savedTheme;
    });
    const slider = $("#font-size-slider");
    slider.value = prefs.fontSize;
    $("#font-size-display").textContent = prefs.fontSize + "px";

    // Accessibility tab
    $("#reduce-motion-toggle").checked = prefs.reduceMotion;
    $("#compact-mode-toggle").checked = prefs.compactMode;
}

function getAvatarBgColor(index) {
    const colors = ["#5865f2", "#57f287", "#feb347", "#ed4245", "#e91e63", "#9b59b6", "#1abc9c", "#e67e22"];
    return colors[index % 8];
}

function renderColorPickerTo(container, selectedIndex, onClick) {
    container.innerHTML = "";
    for (let i = 0; i < 8; i++) {
        const div = document.createElement("div");
        div.className = `color-option avatar-bg-${i}`;
        if (i === selectedIndex) div.classList.add("selected");
        if (onClick) {
            div.addEventListener("click", () => {
                onClick(i);
                // Re-render with the same callback to keep buttons clickable
                renderColorPickerTo(container, i, onClick);
            });
        }
        container.appendChild(div);
    }
}

// Account field edit buttons
document.querySelectorAll(".btn-field-edit").forEach(btn => {
    btn.addEventListener("click", () => {
        const field = btn.dataset.edit;
        editPanel.classList.remove("hidden");
        // Hide all optional form groups
        $("#fg-username").classList.add("hidden");
        $("#fg-about").classList.add("hidden");
        $("#fg-password").classList.add("hidden");
        $("#fg-avatar-color").classList.add("hidden");

        if (field === "username") {
            editPanelTitle.textContent = "Modifier le nom d'utilisateur";
            $("#fg-username").classList.remove("hidden");
            settingsUsername.value = state.username;
        } else if (field === "password") {
            editPanelTitle.textContent = "Changer le mot de passe";
            $("#fg-password").classList.remove("hidden");
            settingsPassword.value = "";
        }
    });
});

// "Modifier le profil" button — edit all at once
btnEditProfile.addEventListener("click", () => {
    editPanel.classList.remove("hidden");
    editPanelTitle.textContent = "Modifier le profil";
    $("#fg-username").classList.remove("hidden");
    $("#fg-about").classList.remove("hidden");
    $("#fg-password").classList.remove("hidden");
    $("#fg-avatar-color").classList.remove("hidden");
    settingsUsername.value = state.username;
    settingsAbout.value = state.about || "";
    settingsPassword.value = "";
    renderColorPickerTo(avatarColorPicker, state.avatarColor, (i) => {
        state.avatarColor = i;
        settingsAvatarColorInput.value = i;
        settingsAvatar.className = `profile-avatar avatar-bg-${i}`;
        settingsAvatar.innerHTML = state.avatarUrl ? `<img src="${API}${state.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : state.username[0].toUpperCase();
    });
    settingsAvatarColorInput.value = state.avatarColor;
});

cancelEditBtn.addEventListener("click", () => {
    editPanel.classList.add("hidden");
});

// Save profile form
updateProfileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    settingsFeedback.textContent = "";

    const newUsername = settingsUsername.value.trim();
    const newAbout = settingsAbout.value.trim();
    const newPassword = settingsPassword.value;
    const newColor = parseInt(settingsAvatarColorInput.value || state.avatarColor);

    const body = { avatar_color: newColor, about: newAbout };
    if (newUsername && newUsername !== state.username) body.username = newUsername;
    if (newPassword) body.password = newPassword;

    try {
        const res = await fetch(`${API}/api/users/me`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${state.token}`
            },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            settingsFeedback.textContent = "✓ Modifications enregistrées !";
            if (body.username) state.username = body.username;
            state.about = newAbout;
            state.avatarColor = newColor;
            localStorage.setItem("username", state.username);
            populateSettingsUI();
            updateUserPanel();
            connectWebSocket();
        } else {
            const data = await res.json();
            alert(data.error || "Erreur de mise à jour");
        }
    } catch (err) {
        alert("Erreur réseau");
    }
});

// Save profile (Profils tab)
saveProfileBtn.addEventListener("click", async () => {
    profileFeedback.textContent = "";
    const newAbout = profileAboutInput.value.trim();
    const newColor = state.avatarColor;

    const body = { avatar_color: newColor, about: newAbout };
    if (state.avatarUrl) body.avatar_url = state.avatarUrl;

    try {
        const res = await fetch(`${API}/api/users/me`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${state.token}`
            },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            profileFeedback.textContent = "\u2713 Profil mis \u00e0 jour !";
            state.about = newAbout;
            state.avatarColor = newColor;
            previewAbout.textContent = newAbout || "Aucune description.";
            updateUserPanel();
            populateSettingsUI();
            connectWebSocket();
        } else {
            const data = await res.json();
            alert(data.error || "Erreur de mise \u00e0 jour");
        }
    } catch (err) {
        alert("Erreur r\u00e9seau");
    }
});

// ── Avatar Upload (Profils tab) ────────────────────────
const avatarFileInput = $("#avatar-file-input");
const avatarUploadBtn = $("#avatar-upload-btn");
const avatarRemoveBtn = $("#avatar-remove-btn");
const avatarUploadStatus = $("#avatar-upload-status");

avatarUploadBtn.addEventListener("click", () => avatarFileInput.click());

avatarFileInput.addEventListener("change", async () => {
    const file = avatarFileInput.files[0];
    if (!file) return;

    avatarUploadStatus.textContent = "Upload en cours...";

    try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch(`${API}/api/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${state.token}` },
            body: formData
        });

        if (!uploadRes.ok) {
            const data = await uploadRes.json();
            avatarUploadStatus.textContent = data.error || "Erreur d'upload";
            return;
        }

        const uploadData = await uploadRes.json();
        const avatarUrl = uploadData.url;

        // Save to profile
        const saveRes = await fetch(`${API}/api/users/me`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${state.token}`
            },
            body: JSON.stringify({ avatar_url: avatarUrl })
        });

        if (saveRes.ok) {
            state.avatarUrl = avatarUrl;
            avatarUploadStatus.textContent = "\u2713 Avatar mis \u00e0 jour !";
            avatarRemoveBtn.style.display = "inline-flex";
            updateUserPanel();
            populateSettingsUI();
            connectWebSocket();
        } else {
            avatarUploadStatus.textContent = "Erreur lors de la sauvegarde";
        }
    } catch (err) {
        avatarUploadStatus.textContent = "Erreur r\u00e9seau";
    }
    avatarFileInput.value = "";
});

avatarRemoveBtn.addEventListener("click", async () => {
    try {
        const res = await fetch(`${API}/api/users/me`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${state.token}`
            },
            body: JSON.stringify({ avatar_url: "" })
        });
        if (res.ok) {
            state.avatarUrl = null;
            avatarRemoveBtn.style.display = "none";
            avatarUploadStatus.textContent = "\u2713 Avatar supprim\u00e9";
            updateUserPanel();
            populateSettingsUI();
            connectWebSocket();
        }
    } catch (err) {
        alert("Erreur r\u00e9seau");
    }
});

// Theme change
document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener("change", () => {
        savePref("theme", radio.value);
    });
});

// Font size slider
$("#font-size-slider").addEventListener("input", (e) => {
    const size = parseInt(e.target.value);
    $("#font-size-display").textContent = size + "px";
    savePref("fontSize", size);
});

// Accessibility toggles
$("#reduce-motion-toggle").addEventListener("change", (e) => {
    savePref("reduceMotion", e.target.checked);
});
$("#compact-mode-toggle").addEventListener("change", (e) => {
    savePref("compactMode", e.target.checked);
});

// ── Room Creation ──────────────────────────────────────
addRoomBtn.addEventListener("click", () => {
    createRoomModal.classList.remove("hidden");
    roomNameInput.value = "";
    roomKindInput.value = "text";
    roomNameInput.focus();
});
cancelRoomBtn.addEventListener("click", () => createRoomModal.classList.add("hidden"));

createRoomForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = roomNameInput.value.trim();
    const kind = roomKindInput.value === "voice" ? "voice" : "text";
    if (!name) return;

    try {
        const res = await fetch(`${API}/api/rooms`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${state.token}`,
            },
            body: JSON.stringify({ name, kind }),
        });
        if (res.ok) {
            createRoomModal.classList.add("hidden");
            await loadRooms();
        } else {
            const data = await res.json();
            alert(data.error || "Erreur");
        }
    } catch (err) { alert("Erreur réseau"); }
});

// ── User Popout Card ───────────────────────────────────
let currentPopoutUserId = null;

function renderUserPopoutContent(uid, user) {
    const colorIndex = user.avatar_color % 8;

    // Avatar
    popoutAvatar.className = `popout-avatar avatar-bg-${colorIndex}`;
    popoutAvatar.innerHTML = user.avatar_url
        ? `<img src="${API}${user.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`
        : user.username[0].toUpperCase();

    // Banner color
    popoutBanner.style.background = getAvatarBgColor(colorIndex);

    // Username & Disc
    popoutUsername.textContent = user.username;
    // Mock discriminator based on hash
    const disc = `#${(hashString(user.username) % 9000) + 1000}`;
    popoutDisc.textContent = disc;

    // Role display (using existing structure)
    const roleBadges = userPopout.querySelector("#popout-badges"); // This exists in HTML
    if (roleBadges) {
        roleBadges.innerHTML = `
        <div style="display:inline-flex;align-items:center;gap:4px;background:var(--background-secondary);padding:4px 8px;border-radius:4px;font-size:12px">
            <div style="width:8px;height:8px;border-radius:50%;background:${user.role === 'admin' ? '#ed4245' : '#99aab5'}"></div>
            ${user.role === 'admin' ? 'Admin' : 'Membre'}
        </div>`;
    }

    // About Me display
    const aboutSection = userPopout.querySelector("#popout-about-section");
    const aboutText = userPopout.querySelector("#popout-about-text");
    if (aboutSection && aboutText) {
        if (user.about && user.about.trim().length > 0) {
            aboutText.textContent = user.about;
            aboutSection.style.display = "block";
        } else {
            aboutSection.style.display = "none";
        }
    }
}

function showUserPopout(e, uid, user) {
    if (e) {
        e.stopPropagation();
        e.preventDefault(); // prevent triggering other clicks
    }

    currentPopoutUserId = uid;
    renderUserPopoutContent(uid, user);

    if (e) {
        const rect = e.currentTarget.getBoundingClientRect();
        // Position to the left of the members sidebar
        userPopout.style.top = `${Math.min(rect.top, window.innerHeight - 300)}px`;
        userPopout.style.right = `${window.innerWidth - rect.left + 8}px`;
        userPopout.style.left = "auto";
        userPopout.classList.remove("hidden");
    }
}

// Close popout on click outside
document.addEventListener("click", (e) => {
    if (!userPopout.contains(e.target) && !e.target.closest(".members-list li")) {
        userPopout.classList.add("hidden");
        currentPopoutUserId = null;
    }
});

// ── Context Menu Logic ─────────────────────────────────
let ctxTarget = null;

function showContextMenu(e, type, id, name) {
    e.preventDefault();
    e.stopPropagation();
    ctxTarget = { type, id, name };

    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.classList.remove("hidden");

    ctxHeaderTitle.textContent = type === "room" ? `#${name}` : name;

    ctxDeleteRoom.classList.add("hidden");
    ctxDeleteMessage.classList.add("hidden");
    ctxPromoteAdmin.classList.add("hidden");

    if (type === "room") {
        if (state.role === "admin") ctxDeleteRoom.classList.remove("hidden");
    } else if (type === "user") {
        if (state.role === "admin" && id !== state.userId) ctxPromoteAdmin.classList.remove("hidden");
    } else if (type === "message") {
        if (state.role === "admin" || name === state.username) {
            ctxDeleteMessage.classList.remove("hidden");
        }
    }
}

document.addEventListener("click", () => contextMenu.classList.add("hidden"));
contextMenu.addEventListener("click", (e) => e.stopPropagation());

ctxCopyId.addEventListener("click", () => {
    if (ctxTarget) {
        navigator.clipboard.writeText(ctxTarget.id);
        contextMenu.classList.add("hidden");
    }
});

ctxDeleteRoom.addEventListener("click", async () => {
    if (!ctxTarget || ctxTarget.type !== "room") return;
    contextMenu.classList.add("hidden");
    if (!confirm(`Supprimer le salon #${ctxTarget.name} ?`)) return;
    try {
        const res = await fetch(`${API}/api/rooms/${ctxTarget.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${state.token}` }
        });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || "Erreur");
        }
    } catch (e) { alert("Erreur réseau"); }
});

ctxPromoteAdmin.addEventListener("click", async () => {
    if (!ctxTarget || ctxTarget.type !== "user") return;
    contextMenu.classList.add("hidden");
    if (!confirm(`Promouvoir ${ctxTarget.name} comme Admin ?`)) return;
    try {
        const res = await fetch(`${API}/api/users/${ctxTarget.id}/role`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${state.token}`
            },
            body: JSON.stringify({ role: "admin" })
        });
        if (res.ok) {
            alert(`${ctxTarget.name} est maintenant Admin !`);
        } else {
            const data = await res.json();
            alert(data.error || "Erreur");
        }
    } catch (e) { alert("Erreur réseau"); }
});

ctxDeleteMessage.addEventListener("click", async () => {
    if (!ctxTarget || ctxTarget.type !== "message") return;
    contextMenu.classList.add("hidden");
    if (!confirm("Supprimer ce message ?")) return;
    try {
        const res = await fetch(`${API}/api/messages/${ctxTarget.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${state.token}` }
        });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || "Erreur");
        }
    } catch (e) { alert("Erreur réseau"); }
});

// ── Utility Functions ──────────────────────────────────
function escapeHtml(s) {
    if (!s) return "";
    return s.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

// Detect emoji-only messages → return CSS class for jumbo display
function getEmojiClass(text) {
    if (!text) return '';
    // Strip variation selectors, ZWJ, skin tone modifiers, then check if only emoji remain
    const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Regional_Indicator}{2}|[\u200D\uFE0E\uFE0F])+$/u;
    const trimmed = text.trim();
    if (!emojiRegex.test(trimmed)) return '';

    // Count emojis using Intl.Segmenter if available, fallback to spread
    let count;
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
        count = [...segmenter.segment(trimmed)].length;
    } else {
        count = [...trimmed].length;
    }

    if (count <= 3) return 'emoji-jumbo';
    if (count <= 6) return 'emoji-large';
    return '';
}

function formatTime(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    const today = new Date();
    const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();

    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Aujourd'hui à ${time}`;
    if (isYesterday(d)) return `Hier à ${time}`;
    return `${d.toLocaleDateString("fr-FR")} ${time}`;
}

function formatDateLabel(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    const today = new Date();

    if (d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()) {
        return "Aujourd'hui";
    }

    if (isYesterday(d)) return "Hier";

    return d.toLocaleDateString("fr-FR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function isYesterday(d) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear();
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// ── Init ───────────────────────────────────────────────
if (state.token) {
    enterApp();
} else {
    authModal.classList.remove("hidden");
    app.classList.add("hidden");
}
updateVoiceQuickStatus();

// ═══ Emoji Picker ══════════════════════════════════════
const EMOJI_DATA = {
    smileys: {
        name: "Smileys & Émotion",
        emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫥", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "🫠", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥵", "🥶", "🥴", "😵", "😵‍💫", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "🫤", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺", "🥹", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"]
    },
    people: {
        name: "Personnes & Corps",
        emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "👶", "👧", "🧒", "👦", "👩", "🧑", "👨", "👩‍🦱", "👨‍🦱", "👩‍🦰", "👨‍🦰", "👱‍♀️", "👱‍♂️", "👩‍🦳", "👨‍🦳", "👩‍🦲", "👨‍🦲"]
    },
    nature: {
        name: "Animaux & Nature",
        emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🌸", "💮", "🏵️", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🌱", "🪴", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🪹", "🪺"]
    },
    food: {
        name: "Nourriture & Boissons",
        emojis: ["🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🥭", "🍎", "🍏", "🍐", "🍑", "🍒", "🍓", "🫐", "🥝", "🍅", "🫒", "🥥", "🥑", "🍆", "🥔", "🥕", "🌽", "🌶️", "🫑", "🥒", "🥬", "🥦", "🧄", "🧅", "🍄", "🥜", "🫘", "🌰", "🍞", "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇", "🧀", "🍖", "🍗", "🥩", "🥓", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆", "🥚", "🍳", "🥘", "🍲", "🫕", "🥣", "🥗", "🍿", "🧈", "🧂", "🥫"]
    },
    activities: {
        name: "Activités",
        emojis: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "🤺", "⛹️", "🏊", "🚴", "🚵", "🧘", "🎮", "🕹️", "🎲", "🧩", "♟️", "🎯", "🎳", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🪘", "🎷", "🎺", "🪗", "🎸", "🪕", "🎻"]
    },
    objects: {
        name: "Objets",
        emojis: ["💡", "🔦", "🕯️", "🪔", "💻", "🖥️", "🖨️", "⌨️", "🖱️", "💾", "💿", "📀", "📱", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "⏱️", "⏲️", "⏰", "🕰️", "📡", "🔋", "🔌", "🛒", "⚙️", "🔧", "🔨", "🛠️", "🪛", "🔩", "🪜", "🧲", "💊", "💉", "🩹", "🩺", "🔬", "🔭", "📷", "📸", "📹", "🎥", "🎞️", "📽️", "📖", "📚", "📝", "✏️", "🖊️", "🖋️", "📌", "📎", "🔑", "🗝️", "🔒", "🔓"]
    },
    symbols: {
        name: "Symboles",
        emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️", "☣️", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️", "🆎", "🆑", "🅾️", "🆘", "⭕", "🛑", "⛔", "❌", "❗", "❓", "‼️", "⁉️", "✅", "☑️", "✔️", "➕", "➖", "➗", "✖️", "💲", "💱"]
    },
    flags: {
        name: "Drapeaux",
        emojis: ["🏳️", "🏴", "🏁", "🚩", "🏳️‍🌈", "🏳️‍⚧️", "🇫🇷", "🇺🇸", "🇬🇧", "🇩🇪", "🇪🇸", "🇮🇹", "🇯🇵", "🇰🇷", "🇨🇳", "🇧🇷", "🇷🇺", "🇮🇳", "🇦🇺", "🇨🇦", "🇲🇽", "🇦🇷", "🇨🇴", "🇵🇹", "🇳🇱", "🇧🇪", "🇨🇭", "🇸🇪", "🇳🇴", "🇩🇰", "🇫🇮", "🇵🇱", "🇦🇹", "🇮🇪", "🇬🇷", "🇹🇷", "🇸🇦", "🇦🇪", "🇪🇬", "🇿🇦", "🇳🇬", "🇰🇪", "🇲🇦", "🇹🇳", "🇻🇳", "🇹🇭", "🇮🇩", "🇲🇾", "🇵🇭", "🇸🇬", "🇳🇿", "🇨🇱", "🇵🇪", "🇺🇾", "🇵🇾", "🇪🇨", "🇧🇴", "🇻🇪", "🇨🇺", "🇭🇹"]
    }
};

const emojiPickerEl = $("#emoji-picker");
const emojiPickerBody = $("#emoji-picker-body");
const emojiSearch = $("#emoji-search");
const emojiBtn = $("#emoji-btn");

let currentEmojiCategory = "smileys";

function renderEmojiCategory(category) {
    currentEmojiCategory = category;
    emojiPickerBody.innerHTML = "";
    const cat = EMOJI_DATA[category];
    if (!cat) return;

    const title = document.createElement("div");
    title.className = "emoji-category-title";
    title.textContent = cat.name;
    emojiPickerBody.appendChild(title);

    cat.emojis.forEach(emoji => {
        const btn = document.createElement("button");
        btn.className = "emoji-item";
        btn.textContent = emoji;
        btn.addEventListener("click", () => insertEmoji(emoji));
        emojiPickerBody.appendChild(btn);
    });
}

function renderAllEmojisFiltered(query) {
    emojiPickerBody.innerHTML = "";
    const q = query.toLowerCase();
    let found = false;

    Object.values(EMOJI_DATA).forEach(cat => {
        // Simple search: match against emoji characters
        const matches = cat.emojis.filter(e => e.includes(q));
        if (matches.length > 0) {
            found = true;
            matches.forEach(emoji => {
                const btn = document.createElement("button");
                btn.className = "emoji-item";
                btn.textContent = emoji;
                btn.addEventListener("click", () => insertEmoji(emoji));
                emojiPickerBody.appendChild(btn);
            });
        }
    });

    if (!found) {
        // Show all emojis flattened
        Object.values(EMOJI_DATA).forEach(cat => {
            cat.emojis.forEach(emoji => {
                const btn = document.createElement("button");
                btn.className = "emoji-item";
                btn.textContent = emoji;
                btn.addEventListener("click", () => insertEmoji(emoji));
                emojiPickerBody.appendChild(btn);
            });
        });
    }
}

function insertEmoji(emoji) {
    messageInput.value += emoji;
    messageInput.focus();
}

// Toggle emoji picker
emojiBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = emojiPickerEl.classList.contains("hidden");
    if (isHidden) {
        emojiPickerEl.classList.remove("hidden");
        emojiSearch.value = "";
        renderEmojiCategory(currentEmojiCategory);
        emojiSearch.focus();
    } else {
        emojiPickerEl.classList.add("hidden");
    }
});

// Close emoji picker on click outside
document.addEventListener("click", (e) => {
    if (!emojiPickerEl.contains(e.target) && e.target !== emojiBtn) {
        emojiPickerEl.classList.add("hidden");
    }
});

// Category tabs
document.querySelectorAll(".emoji-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".emoji-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        renderEmojiCategory(tab.dataset.category);
        emojiSearch.value = "";
    });
});

// Search emojis
emojiSearch.addEventListener("input", () => {
    const q = emojiSearch.value.trim();
    if (q) {
        renderAllEmojisFiltered(q);
    } else {
        renderEmojiCategory(currentEmojiCategory);
    }
});

// ── Image Lightbox ─────────────────────────────────────
window.openLightbox = function (url) {
    const overlay = document.createElement("div");
    overlay.className = "image-lightbox";
    overlay.innerHTML = `<img src="${url}" />`;
    overlay.addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
};

// Close lightbox on ESC
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        const lb = document.querySelector(".image-lightbox");
        if (lb) lb.remove();
    }
});

// ── Drag & Drop Image Upload ───────────────────────────
const chatArea = document.querySelector(".chat-area");
chatArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
});

chatArea.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!state.currentRoomId) return;
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith("image/")) {
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event("change"));
    }
});

// ── Paste Image Upload ─────────────────────────────────
messageInput.addEventListener("paste", (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;
                fileInput.dispatchEvent(new Event("change"));
            }
            break;
        }
    }
});
