FROM rust:1.88-slim as builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libsqlite3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

WORKDIR /app/backend

ENV SQLX_OFFLINE=true

RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/backend/target/release/backend ./voxium-backend

# Si tu as besoin du binaire make_admin, décommente la ligne suivante :
# COPY --from=builder /app/backend/target/release/make_admin ./make_admin

EXPOSE 8080

CMD ["./voxium-backend"]