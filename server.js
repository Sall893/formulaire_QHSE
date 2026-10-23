const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const os = require('os');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3008;

let inMemoryConfig = null;

// Configuration (chargée depuis les variables d'environnement Vercel / .env)
function loadConfig() {
  if (inMemoryConfig) return inMemoryConfig;
  return {
    recipientEmail: process.env.RECIPIENT_EMAIL || 'anta.gaye@power-techservices.com',
    smtpHost: process.env.SMTP_HOST || 'mail.power-techservices.com',
    smtpPort: process.env.SMTP_PORT || '465',
    smtpUser: process.env.SMTP_USER || 'anta.gaye@power-techservices.com',
    smtpPass: process.env.SMTP_PASS || 'Powertech2526',
    smtpSecure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    fromEmail: process.env.FROM_EMAIL || '"Signalement HSE Powertech" <anta.gaye@power-techservices.com>'
  };
}

function saveConfig(cfg) {
  inMemoryConfig = { ...loadConfig(), ...cfg };
}

// Récupération de l'IP locale pour le QR code
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Initialisation du transporteur Nodemailer
let etherealAccount = null;

async function getTransporter() {
  const config = loadConfig();

  // Si SMTP configuré
  if (config.smtpHost && config.smtpUser && config.smtpPass) {
    const isSsl = config.smtpSecure || config.smtpPort === '465' || parseInt(config.smtpPort, 10) === 465;
    return {
      transporter: nodemailer.createTransport({
        host: config.smtpHost,
        port: parseInt(config.smtpPort, 10) || (isSsl ? 465 : 587),
        secure: isSsl,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000
      }),
      isTest: false,
      from: config.fromEmail || config.smtpUser
    };
  }

  // Sinon, compte de test Ethereal (permet de visualiser l'email en 1 clic sans bloquer)
  if (!etherealAccount) {
    etherealAccount = await nodemailer.createTestAccount();
    console.log('--- Compte Ethereal Test Initialisé ---');
    console.log('Utilisateur:', etherealAccount.user);
  }

  return {
    transporter: nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass
      }
    }),
    isTest: true,
    from: '"Alerte HSE Powertech" <alerte-hse@powertech-group.com>'
  };
}

// Multer pour l'upload d'images en mémoire (compatible Vercel Serverless)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB par image
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers images sont acceptés.'));
    }
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ROUTE : Santé / information API
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Powertech Engineering Group - API HSE',
    version: '1.0.0',
    ref: 'F-HSE-SD',
    recipient: 'anta.gaye@power-techservices.com'
  });
});

// ROUTE : Obtenir la configuration actuelle
app.get('/api/config', (req, res) => {
  const config = loadConfig();
  const localIp = getLocalIp();
  res.json({
    recipientEmail: config.recipientEmail,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpUser: config.smtpUser,
    hasSmtpConfig: Boolean(config.smtpHost && config.smtpUser && config.smtpPass),
    localIp,
    port: PORT,
    fullUrl: `http://${localIp}:${PORT}`
  });
});

// ROUTE : Mettre à jour la configuration
app.post('/api/config', (req, res) => {
  try {
    const current = loadConfig();
    const updated = {
      ...current,
      recipientEmail: req.body.recipientEmail?.trim() || current.recipientEmail,
      smtpHost: req.body.smtpHost !== undefined ? req.body.smtpHost.trim() : current.smtpHost,
      smtpPort: req.body.smtpPort !== undefined ? req.body.smtpPort.trim() : current.smtpPort,
      smtpUser: req.body.smtpUser !== undefined ? req.body.smtpUser.trim() : current.smtpUser,
      smtpPass: req.body.smtpPass !== undefined && req.body.smtpPass !== '' ? req.body.smtpPass.trim() : current.smtpPass,
      smtpSecure: req.body.smtpSecure !== undefined ? Boolean(req.body.smtpSecure) : current.smtpSecure
    };
    saveConfig(updated);
    res.json({ success: true, message: 'Configuration mise à jour avec succès.', config: {
      recipientEmail: updated.recipientEmail,
      smtpHost: updated.smtpHost,
      smtpPort: updated.smtpPort,
      smtpUser: updated.smtpUser,
      hasSmtpConfig: Boolean(updated.smtpHost && updated.smtpUser && updated.smtpPass)
    }});
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ROUTE : Générer le QR Code de l'application
app.get('/api/qrcode', async (req, res) => {
  try {
    const localIp = getLocalIp();
    const url = req.query.url || `http://${localIp}:${PORT}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
    res.json({ url, qrcode: qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Erreur génération QR code' });
  }
});

const inMemoryDeclarations = [];

// ROUTE : Lister les déclarations (en mémoire)
app.get('/api/declarations', (req, res) => {
  res.json([...inMemoryDeclarations].reverse());
});

// ROUTE : Soumettre une déclaration
app.post('/api/declarations', upload.array('photos', 10), async (req, res) => {
  try {
    const {
      modeDeclaration,
      declarantName,
      departement,
      siteChantier,
      dateDeclaration,
      descriptionSituation,
      actionsCorrectives,
      gravite
    } = req.body;

    if (!descriptionSituation || !descriptionSituation.trim()) {
      return res.status(400).json({ success: false, error: 'La description de la situation dangereuse est obligatoire.' });
    }

    const config = loadConfig();
    const id = `SD-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const now = new Date();
    const createdAt = now.toISOString();
    const formattedDate = dateDeclaration || now.toLocaleDateString('fr-FR');

    const isAnonymous = modeDeclaration === 'Anonyme';
    const nomAffiche = isAnonymous ? 'Anonyme' : (declarantName?.trim() || 'Non précisé');

    // Photos reçues en mémoire
    const photoCount = (req.files || []).length;

    const declarationRecord = {
      id,
      refDocument: 'F-HSE-SD',
      version: '01',
      createdAt,
      dateDeclaration: formattedDate,
      modeDeclaration: isAnonymous ? 'Anonyme' : 'Nominative',
      declarantName: nomAffiche,
      departement: departement?.trim() || 'Non spécifié',
      siteChantier: siteChantier?.trim() || 'Non spécifié',
      gravite: gravite || 'Moyenne',
      descriptionSituation: descriptionSituation.trim(),
      actionsCorrectives: actionsCorrectives?.trim() || 'Aucune action immédiate proposée',
      photosCount: photoCount
    };

    inMemoryDeclarations.push(declarationRecord);
    if (inMemoryDeclarations.length > 50) inMemoryDeclarations.shift();

    // Préparation de l'envoi d'e-mail direct (zéro base de données)
    let emailResult = { sent: false };
    try {
      let { transporter, isTest, from } = await getTransporter();

      const graviteColor = {
        'Faible': '#10b981',
        'Moyenne': '#f59e0b',
        'Élevée': '#f97316',
        'Critique': '#ef4444'
      }[gravite] || '#f59e0b';

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
            .header-bar { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 25px 30px; color: #ffffff; }
            .header-bar h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
            .header-bar .meta { font-size: 13px; opacity: 0.9; }
            .badge-alert { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; background: ${graviteColor}; color: white; margin-top: 8px; }
            .slogan-box { background: #fff1f2; border-left: 4px solid #e11d48; padding: 12px 20px; font-style: italic; color: #be123c; font-weight: 600; font-size: 14px; }
            .content { padding: 30px; }
            .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; color: #0284c7; border-bottom: 2px solid #e0f2fe; padding-bottom: 6px; margin: 25px 0 15px 0; letter-spacing: 0.5px; }
            .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .info-grid td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .info-grid td.label { font-weight: 600; color: #64748b; width: 38%; }
            .info-grid td.value { font-weight: 500; color: #0f172a; }
            .text-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; margin-bottom: 15px; }
            .photos-alert { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 10px 15px; border-radius: 6px; font-size: 13px; font-weight: 600; margin-top: 10px; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header-bar">
              <div style="font-size: 12px; text-transform: uppercase; opacity: 0.85; margin-bottom: 4px;">POWERTECH ENGINEERING GROUP • HSE</div>
              <h1>Formulaire de Déclaration de Situation Dangereuse</h1>
              <div class="meta">Réf : <strong>F-HSE-SD</strong> | Version : 01 | Déclaration N° <strong>${id}</strong></div>
              <div><span class="badge-alert">Gravité : ${declarationRecord.gravite}</span></div>
            </div>

            <div class="slogan-box">
              « Je vois, je scanne, je signale » — Signalement reçu le ${formattedDate} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>

            <div class="content">
              <div class="section-title">Partie 1 : Identification du déclarant</div>
              <table class="info-grid">
                <tr>
                  <td class="label">Mode de déclaration :</td>
                  <td class="value"><strong>${declarationRecord.modeDeclaration}</strong></td>
                </tr>
                <tr>
                  <td class="label">Prénom & Nom :</td>
                  <td class="value">${declarationRecord.declarantName}</td>
                </tr>
                <tr>
                  <td class="label">Département :</td>
                  <td class="value">${declarationRecord.departement}</td>
                </tr>
                <tr>
                  <td class="label">Site / Chantier concerné :</td>
                  <td class="value"><strong>${declarationRecord.siteChantier}</strong></td>
                </tr>
                <tr>
                  <td class="label">Date de la déclaration :</td>
                  <td class="value">${declarationRecord.dateDeclaration}</td>
                </tr>
              </table>

              <div class="section-title">Partie 2 : Déclaration de la situation dangereuse</div>
              <div style="font-weight: 600; font-size: 13px; color: #475569; margin-bottom: 6px;">Description détaillée des faits observés :</div>
              <div class="text-box">${declarationRecord.descriptionSituation}</div>

              <div style="font-weight: 600; font-size: 13px; color: #475569; margin-bottom: 6px;">Actions correctives suggérées / apportées :</div>
              <div class="text-box">${declarationRecord.actionsCorrectives}</div>

              ${photoCount > 0 ? `
                <div class="photos-alert">
                  <strong>${photoCount} photo(s) jointe(s)</strong> à cette déclaration (visibles en pièces jointes de cet e-mail).
                </div>
              ` : '<div style="font-size: 13px; color: #94a3b8; font-style: italic;">Aucune photo jointe.</div>'}
            </div>

            <div class="footer">
              Ce message a été généré automatiquement par le formulaire officiel HSE de Powertech Engineering Group.<br>
              Pour toute question ou action immédiate, contactez le département Qualité, Hygiène, Sécurité & Environnement.
            </div>
          </div>
        </body>
        </html>
      `;

      // Pièces jointes photos en mémoire directe (compatible Vercel Serverless)
      const attachments = (req.files || []).map(file => ({
        filename: file.originalname || 'photo.jpg',
        content: file.buffer,
        contentType: file.mimetype
      }));

      const mailOptions = {
        from: from,
        to: config.recipientEmail,
        subject: `⚠️ [HSE] Signalement Situation Dangereuse - ${declarationRecord.siteChantier} (${id})`,
        html: emailHtml,
        attachments
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        emailResult = {
          sent: true,
          messageId: info.messageId,
          recipient: config.recipientEmail,
          isTest,
          previewUrl: isTest ? nodemailer.getTestMessageUrl(info) : null
        };
      } catch (smtpErr) {
        console.error('Erreur SMTP direct, bascule automatique sur compte de test:', smtpErr.message);
        // Fallback test account
        const testAcc = await nodemailer.createTestAccount();
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAcc.user, pass: testAcc.pass }
        });
        const info = await fallbackTransporter.sendMail(mailOptions);
        emailResult = {
          sent: true,
          messageId: info.messageId,
          recipient: config.recipientEmail,
          isTest: true,
          smtpWarning: smtpErr.message,
          previewUrl: nodemailer.getTestMessageUrl(info)
        };
      }

      if (emailResult.previewUrl) {
        console.log('--- Email de test envoyé ! ---');
        console.log('Lien de prévisualisation:', emailResult.previewUrl);
      }
    } catch (mailErr) {
      console.error('Erreur lors de l envoi email:', mailErr);
      emailResult = {
        sent: false,
        error: mailErr.message
      };
    }

    res.json({
      success: true,
      id,
      declaration: declarationRecord,
      email: emailResult
    });

  } catch (err) {
    console.error('Erreur submission:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ROUTE : Test d'envoi d'e-mail
app.post('/api/test-email', async (req, res) => {
  try {
    const config = loadConfig();
    const targetEmail = req.body.email || config.recipientEmail;
    const { transporter, isTest, from } = await getTransporter();

    const info = await transporter.sendMail({
      from,
      to: targetEmail,
      subject: '✅ Test de notification HSE - Powertech Engineering Group',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #0284c7;">Test de réception des alertes HSE Powertech</h2>
          <p>Félicitations ! La liaison e-mail pour la déclaration des situations dangereuses fonctionne parfaitement.</p>
          <p><strong>Destinataire configuré :</strong> ${targetEmail}</p>
          <p><strong>Date & heure :</strong> ${new Date().toLocaleString('fr-FR')}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #64748b;">« Je vois, je scanne, je signale » — Powertech Engineering Group</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: `E-mail de test envoyé à ${targetEmail}`,
      isTest,
      previewUrl: isTest ? nodemailer.getTestMessageUrl(info) : null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`=======================================================`);
    console.log(`🚀 Formulaire HSE Powertech actif sur le port ${PORT}`);
    console.log(`👉 Local :   http://localhost:${PORT}`);
    console.log(`👉 Réseau :  http://${localIp}:${PORT} (pour smartphones/QR)`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
