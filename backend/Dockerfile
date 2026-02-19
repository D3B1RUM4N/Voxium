# --- Étape 1 : Compilation ---
FROM rust:1.75-slim as builder

# Installation des dépendances système
RUN apt-get update && apt-get install -y pkg-config libssl-dev libsqlite3-dev build-essential

WORKDIR /app

# Copie de tout le dépôt pour avoir accès aux fichiers nécessaires
COPY . .

WORKDIR /app/backend

# Compilation en mode "Release"
RUN cargo build --release

# --- Étape 2 : Runtime ---
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y libsqlite3-0 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# On récupère l'exécutable compilé
COPY --from=builder /app/backend/target/release/backend /app/voxium-backend

# Création des dossiers pour les volumes et la DB
RUN mkdir -p /app/uploads /app/data

# Port par défaut
EXPOSE 8080

CMD ["./voxium-backend"]