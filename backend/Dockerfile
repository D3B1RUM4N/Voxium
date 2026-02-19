# --- Étape 1 : Compilation ---
FROM rust:1.75-slim as builder

# Mise à jour et installation des dépendances critiques
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libsqlite3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# On copie tout le dépôt pour respecter le contexte Portainer
COPY . .

# On se déplace dans le dossier backend pour compiler
WORKDIR /app/backend

# On force la compilation
RUN cargo build --release

# --- Étape 2 : Runtime ---
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Récupération de l'exécutable
COPY --from=builder /app/backend/target/release/backend /app/voxium-backend

# Dossiers pour la persistance
RUN mkdir -p /app/uploads /app/data

EXPOSE 8080

CMD ["./voxium-backend"]