FROM rust:1.88-slim as builder
RUN apt-get update && apt-get install -y pkg-config libssl-dev libsqlite3-dev build-essential && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
WORKDIR /app/backend
ENV SQLX_OFFLINE=true
RUN cargo build --release --bin backend

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y libsqlite3-0 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# On utilise le chemin confirmé par le find
COPY --from=builder /app/target/release/backend ./voxium-backend
# On s'assure que les dossiers attendus existent pour éviter un crash au démarrage
RUN mkdir -p /app/uploads /app/data
EXPOSE 8080
CMD ["./voxium-backend"]