# Formulaire de Déclaration de Situations Dangereuses — Powertech Engineering Group

Application web officielle conforme à la fiche **REF : F-HSE-SD (Version 01)**.
Permet aux employés et techniciens sur chantier ou en atelier de signaler en quelques secondes toute situation dangereuse (« Je vois, je scanne, je signale ») avec photos, et transmet automatiquement un e-mail officiel complet au responsable HSE.

---

## 🚀 Démarrage rapide

1. **Installer les dépendances :**
   ```bash
   npm install
   ```

2. **Démarrer l'application :**
   ```bash
   npm start
   # ou en mode développement :
   npm run dev
   ```

3. **Accéder à l'application :**
   - **Sur ordinateur :** [http://localhost:3008](http://localhost:3008)
   - **Sur smartphone (même réseau Wi-Fi) :** Utilisez l'adresse réseau affichée dans la console ou scannez le QR code généré.

---

## 📧 Configuration de l'e-mail de réception

Vous pouvez configurer l'e-mail où vous recevez les signalements de deux manières :

### Option 1 : Directement depuis l'application Web (Recommandé)
- Cliquez sur le bouton **« ⚙️ Configuration E-mail »** en haut à droite.
- Entrez votre adresse e-mail (ex: `votre-email@powertech-group.com` ou `votre-nom@gmail.com`).
- Vous pouvez également tester la réception immédiatement avec le bouton **« Envoyer un e-mail de test »**.

### Option 2 : Dans le fichier `.env`
Ouvrez le fichier `.env` à la racine :
```env
PORT=3008
RECIPIENT_EMAIL=votre-adresse@powertech-group.com

# Configuration SMTP (Optionnel si vous souhaitez utiliser votre propre serveur / Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-compte@gmail.com
SMTP_PASS=votre-mot-de-passe-d-application
```
> *Remarque : Si aucun serveur SMTP n'est renseigné, le système utilise automatiquement un mode test sécurisé (Ethereal Email) avec un lien d'aperçu direct dans la notification de confirmation.*

---

## 📱 Affiche & QR Code Chantier (« Je vois, je scanne, je signale »)

- Cliquez sur **« 📱 Affiche & QR Code Chantier »** dans la barre de navigation.
- Un QR code haute définition est généré automatiquement avec le logo Powertech et les consignes.
- Cliquez sur **« Imprimer l'affiche QR »** pour l'afficher sur vos chantiers, ateliers et panneaux d'affichage HSE.

---

## 📋 Registre & Fiche PDF

- **Export PDF officiel :** Cliquez sur **« Exporter en PDF / Imprimer »** pour générer la fiche officielle prête pour l'archivage qualité.
- **Registre des signalements :** Cliquez sur **« 📋 Registre des Signalements »** pour consulter l'historique de tous les signalements, filtrer par chantier, voir les photos et suivre les actions correctives.
