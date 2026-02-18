window.VoxiumVideo = (() => {
    function createVideoShareController(deps) {
        const dom = deps.dom;
        const getState = deps.getState;

        function getScreenQualityPreset(value) {
            if (value === "720") return { width: 1280, height: 720 };
            if (value === "1080") return { width: 1920, height: 1080 };
            if (value === "1440") return { width: 2560, height: 1440 };
            return null;
        }

        function getScreenCaptureConstraints() {
            const state = getState();
            const qualityValue = state.voice.screenQuality || "auto";
            const fpsValue = Number.parseInt(state.voice.screenFps || "30", 10);
            const preset = getScreenQualityPreset(qualityValue);

            const video = {
                cursor: "always",
            };

            if (preset) {
                video.width = { ideal: preset.width };
                video.height = { ideal: preset.height };
            }

            if (Number.isFinite(fpsValue) && fpsValue > 0) {
                video.frameRate = { ideal: fpsValue, max: fpsValue };
            }

            return { video, audio: false };
        }

        function getScreenTrackConstraints() {
            const state = getState();
            const qualityValue = state.voice.screenQuality || "auto";
            const fpsValue = Number.parseInt(state.voice.screenFps || "30", 10);
            const preset = getScreenQualityPreset(qualityValue);

            const constraints = {};
            if (preset) {
                constraints.width = { ideal: preset.width };
                constraints.height = { ideal: preset.height };
            }
            if (Number.isFinite(fpsValue) && fpsValue > 0) {
                constraints.frameRate = { ideal: fpsValue, max: fpsValue };
            }
            return constraints;
        }

        async function applyScreenTrackConstraints(track) {
            if (!track) return;
            const constraints = getScreenTrackConstraints();
            if (Object.keys(constraints).length === 0) return;
            try {
                await track.applyConstraints(constraints);
            } catch (err) {
                console.warn("Impossible d'appliquer exactement la qualité/FPS demandés", err);
            }
        }

        function syncScreenShareSettingsUI() {
            const state = getState();
            if (dom.voiceScreenQualitySelect) {
                dom.voiceScreenQualitySelect.value = state.voice.screenQuality || "1080";
            }
            if (dom.voiceScreenFpsSelect) {
                dom.voiceScreenFpsSelect.value = state.voice.screenFps || "30";
            }
        }

        function updateScreenShareSettingsFromUI() {
            const state = getState();
            const quality = dom.voiceScreenQualitySelect ? dom.voiceScreenQualitySelect.value : (state.voice.screenQuality || "1080");
            const fps = dom.voiceScreenFpsSelect ? dom.voiceScreenFpsSelect.value : (state.voice.screenFps || "30");
            state.voice.screenQuality = quality;
            state.voice.screenFps = fps;
            localStorage.setItem("voiceScreenQuality", quality);
            localStorage.setItem("voiceScreenFps", fps);
        }

        function getScreenProfileLabel(quality, fps) {
            const qualityLabel = quality === "auto" ? "Auto" : `${quality}p`;
            return `${qualityLabel} • ${fps} FPS`;
        }

        function updateVoiceScreensVisibility() {
            if (!dom.voiceScreensWrap || !dom.voiceScreensGrid) return;
            dom.voiceScreensWrap.classList.remove("hidden");
        }

        function removeRemoteScreenTile(userId) {
            const state = getState();
            if (!dom.voiceScreensGrid) return;
            const tile = state.voice.remoteScreenEls[userId];
            if (tile) {
                tile.remove();
                delete state.voice.remoteScreenEls[userId];
            }
            updateVoiceScreensVisibility();
        }

        function syncRemoteScreenTile(userId, stream) {
            const state = getState();
            if (!dom.voiceScreensGrid) return;
            const hasLiveVideo = !!stream && stream.getVideoTracks().some((track) => track.readyState === "live");
            if (!hasLiveVideo) {
                removeRemoteScreenTile(userId);
                return;
            }

            let tile = state.voice.remoteScreenEls[userId];
            if (!tile) {
                tile = document.createElement("div");
                tile.className = "voice-screen-tile";

                const video = document.createElement("video");
                video.className = "voice-screen-video";
                video.autoplay = true;
                video.playsInline = true;

                const label = document.createElement("span");
                label.className = "voice-screen-label";

                const meta = document.createElement("span");
                meta.className = "voice-screen-meta";

                tile.appendChild(video);
                tile.appendChild(label);
                tile.appendChild(meta);
                dom.voiceScreensGrid.appendChild(tile);
                state.voice.remoteScreenEls[userId] = tile;
            }

            tile.classList.toggle("is-self", userId === state.userId);

            const video = tile.querySelector("video");
            const label = tile.querySelector(".voice-screen-label");
            const meta = tile.querySelector(".voice-screen-meta");
            if (video && video.srcObject !== stream) {
                video.srcObject = stream;
            }
            if (video) {
                video.play().catch(() => { });
            }

            const username = state.voice.members[userId]?.username || state.users[userId]?.username || "Utilisateur";
            if (label) {
                label.textContent = userId === state.userId
                    ? "Vous partagez votre écran"
                    : `${username} partage son écran`;
            }

            if (meta) {
                if (userId === state.userId) {
                    meta.textContent = getScreenProfileLabel(state.voice.screenQuality || "auto", state.voice.screenFps || "30");
                    meta.classList.remove("hidden");
                } else {
                    meta.textContent = "";
                    meta.classList.add("hidden");
                }
            }

            updateVoiceScreensVisibility();
        }

        function handleScreenSettingsChange() {
            const state = getState();
            updateScreenShareSettingsFromUI();
            if (state.voice.screenSharing && state.voice.screenStream) {
                syncRemoteScreenTile(state.userId, state.voice.screenStream);
            }
            if (state.voice.screenSharing && state.voice.screenTrack) {
                applyScreenTrackConstraints(state.voice.screenTrack);
            }
        }

        async function startScreenShare() {
            const state = getState();
            if (!state.voice.joinedRoomId) return;
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                alert("Le partage d'écran n'est pas supporté sur cet appareil.");
                return;
            }
            if (state.voice.screenTrack) return;

            try {
                updateScreenShareSettingsFromUI();
                const displayStream = await navigator.mediaDevices.getDisplayMedia(getScreenCaptureConstraints());
                const screenTrack = displayStream.getVideoTracks()[0];
                if (!screenTrack) return;

                await applyScreenTrackConstraints(screenTrack);

                state.voice.screenStream = displayStream;
                state.voice.screenTrack = screenTrack;
                state.voice.screenSharing = true;

                syncRemoteScreenTile(state.userId, displayStream);

                screenTrack.onended = () => {
                    stopScreenShare(true).catch((err) => console.error("Screen stop error", err));
                };

                Object.entries(state.voice.peers).forEach(([remoteUserId, peer]) => {
                    const sender = peer.addTrack(screenTrack, displayStream);
                    state.voice.screenSenders[remoteUserId] = sender;
                });

                await Promise.all(
                    Object.keys(state.voice.peers).map((remoteUserId) =>
                        deps.renegotiatePeer(remoteUserId).catch((err) => {
                            console.error("Renegotiation error", err);
                        })
                    )
                );

                deps.ensureVoiceMember(state.userId, state.username);
                state.voice.members[state.userId].screenSharing = true;
                deps.renderVoiceMembers();
                deps.updateVoiceButtons();
                deps.broadcastVoiceState();
            } catch (err) {
                console.error(err);
                alert("Impossible de démarrer le partage d'écran.");
            }
        }

        async function stopScreenShare(shouldBroadcast = true, shouldRenegotiate = true) {
            const state = getState();
            if (!state.voice.screenTrack && !state.voice.screenStream && !state.voice.screenSharing) return;

            Object.entries(state.voice.peers).forEach(([remoteUserId, peer]) => {
                const explicitSender = state.voice.screenSenders[remoteUserId];
                const sender = explicitSender || peer.getSenders().find((s) => s.track && s.track.kind === "video");
                if (sender) {
                    try {
                        peer.removeTrack(sender);
                    } catch (err) {
                        console.error("removeTrack error", err);
                    }
                }
                delete state.voice.screenSenders[remoteUserId];
            });

            if (state.voice.screenStream) {
                state.voice.screenStream.getTracks().forEach((track) => track.stop());
            } else if (state.voice.screenTrack) {
                state.voice.screenTrack.stop();
            }

            state.voice.screenStream = null;
            state.voice.screenTrack = null;
            state.voice.screenSharing = false;
            removeRemoteScreenTile(state.userId);

            deps.ensureVoiceMember(state.userId, state.username);
            state.voice.members[state.userId].screenSharing = false;
            deps.renderVoiceMembers();
            deps.updateVoiceButtons();

            if (shouldRenegotiate) {
                await Promise.all(
                    Object.keys(state.voice.peers).map((remoteUserId) =>
                        deps.renegotiatePeer(remoteUserId).catch((err) => {
                            console.error("Renegotiation error", err);
                        })
                    )
                );
            }

            if (shouldBroadcast) {
                deps.broadcastVoiceState();
            }
        }

        function toggleVoiceScreenShare() {
            const state = getState();
            if (!state.voice.joinedRoomId) return;
            if (state.voice.screenSharing) {
                stopScreenShare(true).catch((err) => console.error("Screen stop error", err));
            } else {
                startScreenShare().catch((err) => console.error("Screen start error", err));
            }
        }

        return {
            getScreenQualityPreset,
            getScreenCaptureConstraints,
            getScreenTrackConstraints,
            applyScreenTrackConstraints,
            syncScreenShareSettingsUI,
            updateScreenShareSettingsFromUI,
            getScreenProfileLabel,
            updateVoiceScreensVisibility,
            removeRemoteScreenTile,
            syncRemoteScreenTile,
            handleScreenSettingsChange,
            startScreenShare,
            stopScreenShare,
            toggleVoiceScreenShare,
        };
    }

    return {
        createVideoShareController,
    };
})();