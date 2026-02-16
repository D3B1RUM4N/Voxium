window.VoxiumContext = (() => {
    function createContextController(deps) {
        const dom = deps.dom;
        const getState = deps.getState;

        let ctxTarget = null;

        function setRoomSettingsFeedback(message, isError = false) {
            if (!dom.roomSettingsFeedback) return;
            dom.roomSettingsFeedback.textContent = message || "";
            dom.roomSettingsFeedback.style.color = isError ? "var(--red)" : "var(--green)";
        }

        function closeRoomSettingsModal() {
            dom.roomSettingsModal?.classList.add("hidden");
            setRoomSettingsFeedback("");
        }

        function getPrivateRoleFallback() {
            const state = getState();
            const roles = Array.isArray(state.serverRoles) ? state.serverRoles : [];
            const firstPrivate = roles.find((role) => role.name && role.name !== "user");
            return firstPrivate?.name || "admin";
        }

        function syncRoomPrivacyButtons(roleName) {
            const mode = (roleName || "user") === "user" ? "public" : "private";
            dom.roomPrivacyPublicBtn?.classList.toggle("active", mode === "public");
            dom.roomPrivacyPrivateBtn?.classList.toggle("active", mode === "private");
        }

        function applyRoomPrivacyMode(mode) {
            if (!dom.roomSettingsRequiredRole) return;
            if (mode === "public") {
                dom.roomSettingsRequiredRole.value = "user";
                syncRoomPrivacyButtons("user");
                return;
            }

            if (dom.roomSettingsRequiredRole.value && dom.roomSettingsRequiredRole.value !== "user") {
                syncRoomPrivacyButtons(dom.roomSettingsRequiredRole.value);
                return;
            }

            const privateRole = getPrivateRoleFallback();
            dom.roomSettingsRequiredRole.value = privateRole;
            syncRoomPrivacyButtons(privateRole);
        }

        async function openRoomSettingsModal(roomId) {
            const state = getState();
            if (state.role !== "admin") return;
            const room = state.rooms.find((r) => r.id === roomId);
            if (!room || !dom.roomSettingsModal || !dom.roomSettingsRequiredRole || !dom.roomSettingsName || !dom.roomSettingsKind) return;

            dom.roomSettingsModal.classList.remove("hidden");
            setRoomSettingsFeedback("Chargement...");

            dom.roomSettingsName.value = room.name || "";
            dom.roomSettingsKind.value = room.kind === "voice" ? "voice" : "text";

            try {
                const res = await fetch(`${deps.API}/api/server/roles`, {
                    headers: { Authorization: `Bearer ${state.token}` }
                });
                const data = await res.json().catch(() => []);
                if (!res.ok) {
                    setRoomSettingsFeedback(data.error || "Impossible de charger les rôles", true);
                    return;
                }

                state.serverRoles = Array.isArray(data) ? data : [];

                dom.roomSettingsRequiredRole.innerHTML = "";
                state.serverRoles.forEach((role) => {
                    const opt = document.createElement("option");
                    opt.value = role.name;
                    opt.textContent = role.name;
                    dom.roomSettingsRequiredRole.appendChild(opt);
                });
                const hasRole = state.serverRoles.some((role) => role.name === room.required_role);
                dom.roomSettingsRequiredRole.value = hasRole ? room.required_role : (state.serverRoles[0]?.name || "user");
                syncRoomPrivacyButtons(dom.roomSettingsRequiredRole.value);
                setRoomSettingsFeedback("");
            } catch (err) {
                setRoomSettingsFeedback("Erreur réseau", true);
            }
        }

        function showContextMenu(e, type, id, name) {
            const state = getState();
            e.preventDefault();
            e.stopPropagation();
            ctxTarget = { type, id, name };

            dom.contextMenu.style.left = `${e.pageX}px`;
            dom.contextMenu.style.top = `${e.pageY}px`;
            dom.contextMenu.classList.remove("hidden");

            dom.ctxHeaderTitle.textContent = type === "room" ? `#${name}` : name;

            dom.ctxDeleteRoom.classList.add("hidden");
            dom.ctxRoomSettings.classList.add("hidden");
            dom.ctxDeleteMessage.classList.add("hidden");
            dom.ctxPromoteAdmin.classList.add("hidden");
            dom.ctxPurgeUserMessages.classList.add("hidden");

            if (type === "room") {
                if (state.role === "admin") {
                    dom.ctxDeleteRoom.classList.remove("hidden");
                    dom.ctxRoomSettings.classList.remove("hidden");
                }
            } else if (type === "user") {
                if (state.role === "admin" && id !== state.userId) {
                    dom.ctxPromoteAdmin.classList.remove("hidden");
                    dom.ctxPurgeUserMessages.classList.remove("hidden");
                }
            } else if (type === "message") {
                if (state.role === "admin" || name === state.username) {
                    dom.ctxDeleteMessage.classList.remove("hidden");
                }
            }
        }

        function bindEvents() {
            document.addEventListener("click", () => dom.contextMenu.classList.add("hidden"));
            dom.contextMenu.addEventListener("click", (e) => e.stopPropagation());

            dom.ctxCopyId.addEventListener("click", () => {
                if (ctxTarget) {
                    navigator.clipboard.writeText(ctxTarget.id);
                    dom.contextMenu.classList.add("hidden");
                }
            });

            dom.ctxDeleteRoom.addEventListener("click", async () => {
                const state = getState();
                if (!ctxTarget || ctxTarget.type !== "room") return;
                dom.contextMenu.classList.add("hidden");
                if (!confirm(`Supprimer le salon #${ctxTarget.name} ?`)) return;
                try {
                    const res = await fetch(`${deps.API}/api/rooms/${ctxTarget.id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${state.token}` }
                    });
                    if (!res.ok) {
                        const data = await res.json();
                        alert(data.error || "Erreur");
                    }
                } catch (e) { alert("Erreur réseau"); }
            });

            dom.ctxRoomSettings.addEventListener("click", async () => {
                if (!ctxTarget || ctxTarget.type !== "room") return;
                dom.contextMenu.classList.add("hidden");
                await openRoomSettingsModal(ctxTarget.id);
            });

            if (dom.roomSettingsCancelBtn) {
                dom.roomSettingsCancelBtn.addEventListener("click", () => {
                    closeRoomSettingsModal();
                });
            }

            if (dom.roomSettingsModal) {
                dom.roomSettingsModal.addEventListener("click", (event) => {
                    if (event.target === dom.roomSettingsModal) {
                        closeRoomSettingsModal();
                    }
                });
            }

            if (dom.roomSettingsRequiredRole) {
                dom.roomSettingsRequiredRole.addEventListener("change", () => {
                    syncRoomPrivacyButtons(dom.roomSettingsRequiredRole.value);
                });
            }

            if (dom.roomPrivacyPublicBtn) {
                dom.roomPrivacyPublicBtn.addEventListener("click", () => {
                    applyRoomPrivacyMode("public");
                });
            }

            if (dom.roomPrivacyPrivateBtn) {
                dom.roomPrivacyPrivateBtn.addEventListener("click", () => {
                    applyRoomPrivacyMode("private");
                });
            }

            if (dom.roomSettingsForm) {
                dom.roomSettingsForm.addEventListener("submit", async (event) => {
                    const state = getState();
                    event.preventDefault();
                    if (!ctxTarget || ctxTarget.type !== "room") return;

                    const roomName = (dom.roomSettingsName?.value || "").trim();
                    const roomKind = (dom.roomSettingsKind?.value || "text").trim();
                    const requiredRole = dom.roomSettingsRequiredRole?.value;
                    if (!roomName || !requiredRole) return;

                    try {
                        const res = await fetch(`${deps.API}/api/rooms/${ctxTarget.id}`, {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${state.token}`,
                            },
                            body: JSON.stringify({
                                name: roomName,
                                kind: roomKind,
                                required_role: requiredRole,
                            }),
                        });

                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                            setRoomSettingsFeedback(data.error || "Erreur", true);
                            return;
                        }

                        const targetRoom = state.rooms.find((r) => r.id === ctxTarget.id);
                        if (targetRoom) {
                            targetRoom.name = roomName;
                            targetRoom.kind = roomKind === "voice" ? "voice" : "text";
                            targetRoom.required_role = requiredRole;
                            if (state.currentRoomId === targetRoom.id) {
                                state.currentRoomName = targetRoom.name;
                                state.currentRoomKind = targetRoom.kind;
                                if (dom.currentRoomName) {
                                    dom.currentRoomName.textContent = targetRoom.name;
                                }
                                if (dom.messageInput) {
                                    dom.messageInput.placeholder = `Envoyer un message dans #${targetRoom.name}`;
                                }
                                deps.updateRoomModeUI(targetRoom.kind, targetRoom.name);
                                if (targetRoom.kind === "text") {
                                    await deps.loadMessages(targetRoom.id);
                                }
                            }
                        }
                        deps.renderRooms();
                        setRoomSettingsFeedback("Salon mis à jour.");
                        setTimeout(() => closeRoomSettingsModal(), 350);
                    } catch (err) {
                        setRoomSettingsFeedback("Erreur réseau", true);
                    }
                });
            }

            dom.ctxPromoteAdmin.addEventListener("click", async () => {
                const state = getState();
                if (!ctxTarget || ctxTarget.type !== "user") return;
                dom.contextMenu.classList.add("hidden");
                if (!confirm(`Promouvoir ${ctxTarget.name} comme Admin ?`)) return;
                try {
                    const res = await fetch(`${deps.API}/api/users/${ctxTarget.id}/role`, {
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

            dom.ctxDeleteMessage.addEventListener("click", async () => {
                const state = getState();
                if (!ctxTarget || ctxTarget.type !== "message") return;
                dom.contextMenu.classList.add("hidden");
                if (!confirm("Supprimer ce message ?")) return;
                try {
                    const res = await fetch(`${deps.API}/api/messages/${ctxTarget.id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${state.token}` }
                    });
                    if (!res.ok) {
                        const data = await res.json();
                        alert(data.error || "Erreur");
                    }
                } catch (e) { alert("Erreur réseau"); }
            });

            dom.ctxPurgeUserMessages.addEventListener("click", async () => {
                const state = getState();
                if (!ctxTarget || ctxTarget.type !== "user") return;
                dom.contextMenu.classList.add("hidden");
                if (!confirm(`Supprimer tous les messages de ${ctxTarget.name} ?`)) return;
                try {
                    const res = await fetch(`${deps.API}/api/users/${ctxTarget.id}/messages`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${state.token}` }
                    });
                    if (!res.ok) {
                        const data = await res.json();
                        alert(data.error || "Erreur");
                    }
                } catch (e) {
                    alert("Erreur réseau");
                }
            });
        }

        return {
            showContextMenu,
            closeRoomSettingsModal,
            bindEvents,
        };
    }

    return {
        createContextController,
    };
})();