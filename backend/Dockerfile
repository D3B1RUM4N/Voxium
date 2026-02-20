# --- Étape de Build ---
FROM rust:1.88-slim as builder

RUN apt-get update && apt-get install -y \
    pkg-config libssl-dev libsqlite3-dev build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

WORKDIR /app/backend
ENV SQLX_OFFLINE=true

# ON FORCE LA COMPILATION DU BINAIRE "backend"
RUN cargo build --release --bin backend

# --- Étape Runtime ---
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y libsqlite3-0 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Utilisation du chemin absolu généré par Cargo
# On cherche le fichier 'backend' dans le dossier release
COPY --from=builder /app/backend/target/release/backend ./voxium-backend

EXPOSE 8080
CMD ["./voxium-backend"]