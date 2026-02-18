============================================
  Voxium v0.1.0 - Guide d'installation
============================================

PREREQUIS
---------
- Windows 10 ou 11 (64-bit)
- Microsoft WebView2 Runtime (pre-installe sur Windows 10/11 recents)
  Si besoin: https://developer.microsoft.com/microsoft-edge/webview2/

INSTALLATION
------------
1. Extraire le ZIP dans un dossier (ex: C:\Voxium\)
2. Double-cliquer sur "Voxium.exe"
3. C'est tout !

L'application lance automatiquement le serveur local en arriere-plan.
Un seul exe, rien d'autre a installer.

FICHIERS
--------
  Voxium.exe      - L'application (tout-en-un)
  README.txt      - Ce fichier

NOTES
-----
- La base de donnees (voxium.db) sera creee automatiquement au 
  premier lancement dans le meme dossier que Voxium.exe.

- Un dossier "uploads/" sera cree automatiquement pour stocker
  les fichiers uploades (avatars, images, etc).

- Le serveur local tourne sur http://127.0.0.1:8080 par defaut.

CONFIGURATION AVANCEE (optionnel)
----------------------------------
Vous pouvez creer un fichier ".env" dans le meme dossier que
Voxium.exe pour personnaliser :

  PORT=8080
  JWT_SECRET=votre-secret-ici
  DATABASE_URL=sqlite:voxium.db

CONNEXION DISCORD
-----------------
Pour utiliser les fonctionnalites Discord (vocal, messages Discord),
connectez-vous avec votre token Discord dans les parametres de l'app.

PROBLEMES ?
-----------
- "WebView2 not found" : Installez WebView2 Runtime (lien ci-dessus)
- Port 8080 occupe : Creez un fichier .env avec PORT=8081

============================================
  https://github.com/Pouare514/Voxium
============================================
