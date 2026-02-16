use sqlx::sqlite::SqlitePoolOptions;
use sqlx::Row;
use std::io::{self, Write};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let current_dir = std::env::current_dir()?;
    println!("📂 Dossier actuel : {:?}", current_dir);
    println!("🔗 URL Base de données : {}", database_url);

    let pool = SqlitePoolOptions::new()
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    print!("Entrez le pseudo a promouvoir Admin: ");
    io::stdout().flush()?;

    let mut username = String::new();
    io::stdin().read_line(&mut username)?;
    let username = username.trim();

    if username.is_empty() {
        println!("Pseudo vide !");
        return Ok(());
    }

    let result = sqlx::query("UPDATE users SET role = 'admin' WHERE username = ?")
        .bind(username)
        .execute(&pool)
        .await?;

    if result.rows_affected() > 0 {
        println!("✅ Succès : {} est maintenant Admin !", username);
    } else {
        println!("❌ Erreur : Utilisateur '{}' introuvable.", username);
        println!("Utilisateurs disponibles :");
        let rows = sqlx::query("SELECT username FROM users")
            .fetch_all(&pool)
            .await?;
        for row in rows {
            let u: String = sqlx::Row::get(&row, "username");
            println!(" - {}", u);
        }
    }

    Ok(())
}
