use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Message {
    pub id: String,
    pub room_id: String,
    pub user_id: String,
    pub username: String,
    pub content: String,
    pub created_at: String,
    pub image_url: Option<String>,
    pub avatar_url: Option<String>,
}

/// GET /api/rooms/{room_id}/messages — Fetch message history
pub async fn get_messages(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> HttpResponse {
    let room_id = path.into_inner();

    let messages = sqlx::query_as::<_, Message>(
        "SELECT m.id, m.room_id, m.user_id, m.username, m.content, m.created_at, m.image_url, u.avatar_url \
         FROM messages m LEFT JOIN users u ON m.user_id = u.id \
         WHERE m.room_id = ? ORDER BY m.created_at ASC LIMIT 200"
    )
    .bind(&room_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    HttpResponse::Ok().json(messages)
}

/// DELETE /api/messages/{id}
pub async fn delete_message(
    req: actix_web::HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    broadcaster: web::Data<crate::ws::Broadcaster>,
) -> HttpResponse {
    use crate::auth::extract_claims;

    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().finish(),
    };

    let message_id = path.into_inner();

    // 1. Fetch message to check ownership and get room_id
    let msg = sqlx::query_as::<_, Message>("SELECT * FROM messages WHERE id = ?")
        .bind(&message_id)
        .fetch_optional(pool.get_ref())
        .await
        .unwrap_or(None);

    let msg = match msg {
        Some(m) => m,
        None => return HttpResponse::NotFound().json(serde_json::json!({ "error": "Message not found" })),
    };

    // 2. Check permissions
    if msg.user_id != claims.sub && claims.role != "admin" {
        return HttpResponse::Forbidden().json(serde_json::json!({ "error": "You can only delete your own messages" }));
    }

    // 3. Delete uploaded image if any
    if let Some(ref url) = msg.image_url {
        let path = url.trim_start_matches('/');
        std::fs::remove_file(path).ok();
    }

    // 4. Delete from DB
    let _ = sqlx::query("DELETE FROM messages WHERE id = ?")
        .bind(&message_id)
        .execute(pool.get_ref())
        .await;

    // 5. Broadcast
    let event = serde_json::json!({
        "type": "message_deleted",
        "id": message_id,
        "room_id": msg.room_id
    });
    let _ = broadcaster.send(event.to_string());

    HttpResponse::Ok().json(serde_json::json!({ "status": "deleted" }))
}
