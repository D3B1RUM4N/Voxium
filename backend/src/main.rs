mod auth;
mod db;
mod messages;
mod rooms;
mod uploads;
mod ws;

use actix_cors::Cors;
use actix_files::Files;
use actix_web::{web, App, HttpResponse, HttpServer};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();

    let pool = db::init_db().await;
    let broadcaster = ws::create_broadcaster();
    let online_users = ws::create_online_users();

    // Ensure uploads directory exists
    std::fs::create_dir_all("uploads").ok();

    println!("🚀 Backend running at http://127.0.0.1:8080");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(broadcaster.clone()))
            .app_data(web::Data::new(online_users.clone()))
            .route("/api/health", web::get().to(|| async {
                HttpResponse::Ok().json(serde_json::json!({ "status": "ok" }))
            }))
            // Auth
            .route("/api/register", web::post().to(auth::register))
            .route("/api/login", web::post().to(auth::login))
            .route("/api/users/me", web::get().to(auth::get_me))
            .route("/api/users/me", web::patch().to(auth::update_profile))
            .route("/api/users/{id}", web::delete().to(auth::delete_user))
            .route("/api/users/{id}/role", web::patch().to(auth::update_user_role))
            // Rooms
            .route("/api/rooms", web::get().to(rooms::list_rooms))
            .route("/api/rooms", web::post().to(rooms::create_room))
            .route("/api/rooms/{id}", web::delete().to(rooms::delete_room))
            // Messages
            .route("/api/messages/{id}", web::delete().to(messages::delete_message))
            .route("/api/rooms/{room_id}/messages", web::get().to(messages::get_messages))
            // Uploads
            .route("/api/upload", web::post().to(uploads::upload_image))
            // Serve uploaded files
            .service(Files::new("/uploads", "uploads"))
            // WebSocket
            .route("/ws", web::get().to(ws::ws_handler))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
