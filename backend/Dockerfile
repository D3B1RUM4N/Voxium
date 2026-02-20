# --- Étape de Build ---
FROM rust:1.88-slim as builder

RUN apt-get update && apt-get install -y \
    pkg-config libssl-dev libsqlite3-dev build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

WORKDIR /app/backend
ENV SQLX_OFFLINE=true

# On compile explicitement le binaire
RUN cargo build --release --bin backend

# --- COMMANDE DE DEBUG (Si ça rate, regarde les logs Portainer ici) ---
RUN find /app -name "backend" -type f -perm -u+x

# --- Étape Runtime ---
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y libsqlite3-0 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# On utilise l'astuce du chemin relatif avec wildcard pour ne pas se rater
# Docker va copier le premier fichier 'backend' qu'il trouve dans un dossier 'release'
COPY --from=builder /app/**/target/release/backend ./voxium-backend

EXPOSE 8080
CMD ["./voxium-backend"]