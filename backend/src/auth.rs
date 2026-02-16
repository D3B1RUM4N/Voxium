use actix_web::{web, HttpRequest, HttpResponse};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row};
use uuid::Uuid;

// ── Models ──────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,       // user id
    pub username: String,
    pub role: String,      // "user" or "admin"
    pub exp: usize,
}

#[derive(Debug, Deserialize)]
pub struct AuthPayload {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user_id: String,
    pub username: String,
    pub role: String,
    pub avatar_color: i32,
    pub about: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfile {
    pub username: Option<String>,
    pub about: Option<String>,
    pub avatar_color: Option<i32>,
    pub password: Option<String>,
    pub avatar_url: Option<String>,
}

// ── JWT helpers ─────────────────────────────────────────

fn jwt_secret() -> String {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| "default_secret".into())
}

pub fn create_token(user_id: &str, username: &str, role: &str) -> String {
    let expiration = Utc::now()
        .checked_add_signed(chrono::Duration::days(7))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        role: role.to_string(),
        exp: expiration,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret().as_bytes()),
    )
    .expect("token creation failed")
}

pub fn validate_token(token: &str) -> Option<Claims> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret().as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .ok()
}

/// Extract claims from the Authorization header.
pub fn extract_claims(req: &HttpRequest) -> Option<Claims> {
    let auth_header = req.headers().get("Authorization")?.to_str().ok()?;
    let token = auth_header.strip_prefix("Bearer ")?;
    validate_token(token)
}

// ── Handlers ────────────────────────────────────────────

pub async fn register(
    pool: web::Data<SqlitePool>,
    body: web::Json<AuthPayload>,
) -> HttpResponse {
    let username = body.username.trim();
    if username.is_empty() || body.password.len() < 4 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Username must be non-empty and password at least 4 characters"
        }));
    }

    // Check if duplicate
    let exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE username = ?")
        .bind(username)
        .fetch_one(pool.get_ref())
        .await
        .unwrap_or(0);

    if exists > 0 {
        return HttpResponse::Conflict().json(serde_json::json!({
            "error": "Username already taken"
        }));
    }

    let id = Uuid::new_v4().to_string();
    let password_hash = hash(&body.password, DEFAULT_COST).expect("hash failed");
    let role = "user"; // Default role

    sqlx::query("INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)")
        .bind(&id)
        .bind(username)
        .bind(&password_hash)
        .bind(role)
        .execute(pool.get_ref())
        .await
        .expect("insert user failed");

    let token = create_token(&id, username, role);

    HttpResponse::Ok().json(AuthResponse {
        token,
        user_id: id,
        username: username.to_string(),
        role: role.to_string(),
        avatar_color: 0,
        about: "".to_string(),
        avatar_url: None,
    })
}

pub async fn login(
    pool: web::Data<SqlitePool>,
    body: web::Json<AuthPayload>,
) -> HttpResponse {
    // We select all user fields now
    let row = sqlx::query("SELECT id, password_hash, role, avatar_color, about, avatar_url FROM users WHERE username = ?")
        .bind(&body.username)
        .fetch_optional(pool.get_ref())
        .await
        .expect("query failed");

    if let Some(row) = row {
        let id: String = row.get("id");
        let password_hash: String = row.get("password_hash");
        let role: String = row.get("role");
        let avatar_color: i32 = row.try_get("avatar_color").unwrap_or(0);
        let about: String = row.try_get("about").unwrap_or_default();
        let avatar_url: Option<String> = row.try_get("avatar_url").unwrap_or(None);

        if verify(&body.password, &password_hash).unwrap_or(false) {
            let token = create_token(&id, &body.username, &role);
            HttpResponse::Ok().json(AuthResponse {
                token,
                user_id: id,
                username: body.username.clone(),
                role,
                avatar_color,
                about,
                avatar_url,
            })
        } else {
            HttpResponse::Unauthorized().json(serde_json::json!({ "error": "Invalid password" }))
        }
    } else {
        HttpResponse::Unauthorized().json(serde_json::json!({ "error": "User not found" }))
    }
}

pub async fn get_me(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().finish(),
    };

    let row = sqlx::query("SELECT username, role, avatar_color, about FROM users WHERE id = ?")
        .bind(&claims.sub)
        .fetch_optional(pool.get_ref())
        .await
        .unwrap_or(None);

    if let Some(row) = row {
         let username: String = row.get("username");
         let role: String = row.get("role");
         let avatar_color: i32 = row.try_get("avatar_color").unwrap_or(0);
         let about: String = row.try_get("about").unwrap_or_default();
         let avatar_url: Option<String> = row.try_get("avatar_url").unwrap_or(None);

         HttpResponse::Ok().json(serde_json::json!({
             "user_id": claims.sub,
             "username": username,
             "role": role,
             "avatar_color": avatar_color,
             "about": about,
             "avatar_url": avatar_url,
         }))
    } else {
        HttpResponse::NotFound().finish()
    }
}

pub async fn update_profile(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    body: web::Json<UpdateProfile>,
    broadcaster: web::Data<crate::ws::Broadcaster>,
) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().finish(),
    };

    // ... existing update logic ...
    // Build UPDATE dynamically — avoid Separated API which can produce broken SQL
    let mut set_clauses: Vec<&str> = Vec::new();
    let mut password_hash_val: Option<String> = None;

    if let Some(username) = &body.username {
        if !username.trim().is_empty() {
            set_clauses.push("username = ?");
        }
    }
    if body.about.is_some() {
        set_clauses.push("about = ?");
    }
    if body.avatar_color.is_some() {
        set_clauses.push("avatar_color = ?");
    }
    if let Some(password) = &body.password {
        if password.len() >= 4 {
            password_hash_val = Some(hash(password, DEFAULT_COST).expect("hash failed"));
            set_clauses.push("password_hash = ?");
        }
    }
    if body.avatar_url.is_some() {
        set_clauses.push("avatar_url = ?");
    }

    if set_clauses.is_empty() {
        return HttpResponse::Ok().json(serde_json::json!({ "status": "no changes" }));
    }

    let sql = format!("UPDATE users SET {} WHERE id = ?", set_clauses.join(", "));
    let mut query = sqlx::query(&sql);

    // Bind values in the same order as set_clauses
    if let Some(username) = &body.username {
        if !username.trim().is_empty() {
            query = query.bind(username.trim().to_string());
        }
    }
    if let Some(about) = &body.about {
        query = query.bind(about.clone());
    }
    if let Some(color) = body.avatar_color {
        query = query.bind(color);
    }
    if let Some(ph) = &password_hash_val {
        query = query.bind(ph.clone());
    }
    if let Some(avatar_url) = &body.avatar_url {
        query = query.bind(avatar_url.clone());
    }

    query = query.bind(&claims.sub);

    match query.execute(pool.get_ref()).await {
        Ok(_) => {
            // Fetch updated user to broadcast
            let user_row = sqlx::query("SELECT username, role, about, avatar_color, avatar_url FROM users WHERE id = ?")
                .bind(&claims.sub)
                .fetch_optional(pool.get_ref())
                .await
                .unwrap_or(None);

            if let Some(row) = user_row {
                 use sqlx::Row;
                 let username: String = row.get("username");
                 let role: String = row.get("role");
                 let about: String = row.get("about");
                 let avatar_color: i32 = row.try_get("avatar_color").unwrap_or(0);
                 let avatar_url: Option<String> = row.try_get("avatar_url").unwrap_or(None);

                 let event = serde_json::json!({
                     "type": "join", // handled as upsert by frontend
                     "user_id": claims.sub,
                     "username": username,
                     "role": role,
                     "about": about,
                     "avatar_color": avatar_color,
                     "avatar_url": avatar_url
                 });
                 let _ = broadcaster.send(event.to_string());
            }

            HttpResponse::Ok().json(serde_json::json!({ "status": "updated" }))
        },
        Err(e) => {
            eprintln!("Profile update error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({ "error": "Update failed (username might be taken)" }))
        }
    }
}

#[derive(Deserialize)]
pub struct UpdateRole {
    pub role: String,
}

/// PATCH /api/users/{id}/role — Promote/Demote user (Admin only)
pub async fn update_user_role(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<UpdateRole>,
    broadcaster: web::Data<crate::ws::Broadcaster>,
) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().finish(),
    };

    if claims.role != "admin" {
        return HttpResponse::Forbidden().json(serde_json::json!({ "error": "Admin only" }));
    }

    let target_id = path.into_inner();
    let new_role = &body.role;

    if new_role != "admin" && new_role != "user" {
         return HttpResponse::BadRequest().json(serde_json::json!({ "error": "Invalid role" }));
    }

    let result = sqlx::query("UPDATE users SET role = ? WHERE id = ?")
        .bind(new_role)
        .bind(&target_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => {
            // Fetch updated user to broadcast
            let user_row = sqlx::query("SELECT username, role, about, avatar_color, avatar_url FROM users WHERE id = ?")
                .bind(&target_id)
                .fetch_optional(pool.get_ref())
                .await
                .unwrap_or(None);

            if let Some(row) = user_row {
                 use sqlx::Row;
                 let username: String = row.get("username");
                 let role: String = row.get("role");
                 let about: String = row.get("about");
                 let avatar_color: i32 = row.try_get("avatar_color").unwrap_or(0);
                 let avatar_url: Option<String> = row.try_get("avatar_url").unwrap_or(None);

                 let event = serde_json::json!({
                     "type": "join", // handled as upsert by frontend
                     "user_id": target_id,
                     "username": username,
                     "role": role,
                     "about": about,
                     "avatar_color": avatar_color,
                     "avatar_url": avatar_url
                 });
                 let _ = broadcaster.send(event.to_string());
            }
            HttpResponse::Ok().json(serde_json::json!({ "status": "role updated" }))
        },
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}

/// DELETE /api/users/{id} — Delete a user (Admin only)
pub async fn delete_user(
    req: HttpRequest,
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().finish(),
    };

    if claims.role != "admin" {
        return HttpResponse::Forbidden().json(serde_json::json!({ "error": "Admin only" }));
    }

    let target_id = path.into_inner();

    // Delete messages first
    let _ = sqlx::query("DELETE FROM messages WHERE user_id = ?")
        .bind(&target_id)
        .execute(pool.get_ref())
        .await;

    // Delete user
    let result = sqlx::query("DELETE FROM users WHERE id = ?")
        .bind(&target_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({ "status": "deleted" }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({ "error": "User not found" }))
            }
        }
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}
