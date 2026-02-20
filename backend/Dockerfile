# --- Étape de Build ---
FROM rust:1.88-slim as builder

# Installation des dépendances système
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libsqlite3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

WORKDIR /app/backend

# On garde notre sécurité pour SQLx
ENV SQLX_OFFLINE=true

RUN cargo build --release

# --- Étape Runtime ---
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y libsqlite3-0 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/backend/target/release/voxium-backend . 

EXPOSE 8080
CMD ["./voxium-backend"]