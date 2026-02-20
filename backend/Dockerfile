# --- Étape de Build ---
FROM rust:1.88-slim as builder

RUN apt-get update && apt-get install -y \
    pkg-config libssl-dev libsqlite3-dev build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

WORKDIR /app/backend
ENV SQLX_OFFLINE=true

# ON FORCE la compilation du binaire à partir de main.rs
# On lui donne un nom explicite pour être sûr de le retrouver
RUN cargo build --release --bin backend

# --- Étape Runtime ---
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y libsqlite3-0 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Le binaire se trouve ICI. Si /app/backend/target échoue, 
# c'est qu'il est dans /app/target (remonte d'un cran via le COPY . .)
COPY --from=builder /app/backend/target/release/backend ./voxium-backend

EXPOSE 8080
CMD ["./voxium-backend"]