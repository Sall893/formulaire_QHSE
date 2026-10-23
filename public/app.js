// ========================================================
// POWERTECH ENGINEERING GROUP - APPLICATION FRONTEND HSE
// Logique interactive, gestion des photos, envoi e-mail & PDF
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
  // --- ÉLÉMENTS DU DOM ---
  const hseForm = document.getElementById('hseForm');
  const radioAnonyme = document.getElementById('radioAnonyme');
  const radioNominative = document.getElementById('radioNominative');
  const inputDeclarantName = document.getElementById('inputDeclarantName');
  const inputDate = document.getElementById('inputDate');
  const metaTodayDate = document.getElementById('metaTodayDate');
  const gravitySelector = document.getElementById('gravitySelector');
  const hiddenGravite = document.getElementById('hiddenGravite');
  const btnSubmitForm = document.getElementById('btnSubmitForm');
  const btnSubmitText = document.getElementById('btnSubmitText');
  const lblConfiguredEmail = document.getElementById('lblConfiguredEmail');

  // Upload photos
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const cameraInput = document.getElementById('cameraInput');
  const btnTriggerFilePicker = document.getElementById('btnTriggerFilePicker');
  const btnTriggerCamera = document.getElementById('btnTriggerCamera');
  const previewContainer = document.getElementById('previewContainer');

  // Modals
  const successModal = document.getElementById('successModal');
  const qrModal = document.getElementById('qrModal');
  const configModal = document.getElementById('configModal');
  const historyModal = document.getElementById('historyModal');

  const btnOpenQrModal = document.getElementById('btnOpenQrModal');
  const btnOpenConfigModal = document.getElementById('btnOpenConfigModal');
  const btnOpenHistoryModal = document.getElementById('btnOpenHistoryModal');
  const btnPrintPdf = document.getElementById('btnPrintPdf');
  const btnSuccessDownloadPdf = document.getElementById('btnSuccessDownloadPdf');
  const btnNewDeclaration = document.getElementById('btnNewDeclaration');

  // Tableau des fichiers photos sélectionnés
  let selectedFiles = [];
  let currentDeclarationData = null;

  // --- INITIALISATION DE LA DATE DU JOUR ---
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const formattedIso = `${yyyy}-${mm}-${dd}`;
  const formattedFr = `${dd}/${mm}/${yyyy}`;

  if (inputDate) inputDate.value = formattedIso;
  if (metaTodayDate) metaTodayDate.textContent = formattedFr;

  // --- CHARGEMENT DE LA CONFIGURATION (E-MAIL DESTINATAIRE) ---
  async function loadAppConfig() {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (lblConfiguredEmail) {
        lblConfiguredEmail.textContent = data.recipientEmail || 'Non configuré';
      }
      const cfgRecipientInput = document.getElementById('cfgRecipientEmail');
      const cfgSmtpHost = document.getElementById('cfgSmtpHost');
      const cfgSmtpPort = document.getElementById('cfgSmtpPort');
      const cfgSmtpUser = document.getElementById('cfgSmtpUser');

      if (cfgRecipientInput) cfgRecipientInput.value = data.recipientEmail || '';
      if (cfgSmtpHost) cfgSmtpHost.value = data.smtpHost || '';
      if (cfgSmtpPort) cfgSmtpPort.value = data.smtpPort || '587';
      if (cfgSmtpUser) cfgSmtpUser.value = data.smtpUser || '';
    } catch (err) {
      console.error('Erreur chargement config:', err);
    }
  }
  loadAppConfig();

  // --- GESTION DU MODE ANONYME VS NOMINATIF ---
  function updateDeclarantMode() {
    if (radioAnonyme.checked) {
      inputDeclarantName.disabled = true;
      inputDeclarantName.value = '';
      inputDeclarantName.placeholder = 'Mode anonyme activé (Votre nom ne sera pas transmis)';
      inputDeclarantName.style.backgroundColor = '#f1f5f9';
    } else {
      inputDeclarantName.disabled = false;
      inputDeclarantName.placeholder = 'Entrez votre prénom et nom';
      inputDeclarantName.style.backgroundColor = '#ffffff';
      inputDeclarantName.focus();
    }
  }

  radioAnonyme.addEventListener('change', updateDeclarantMode);
  radioNominative.addEventListener('change', updateDeclarantMode);
  updateDeclarantMode();

  // --- GESTION DU NIVEAU DE GRAVITÉ ---
  if (gravitySelector) {
    gravitySelector.querySelectorAll('.pro-gravity-card, .gravity-tile, .gravity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        gravitySelector.querySelectorAll('.pro-gravity-card, .gravity-tile, .gravity-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        hiddenGravite.value = btn.getAttribute('data-val');
      });
    });
  }

  // --- GESTION DES PHOTOS (UPLOAD & APERÇU) ---
  btnTriggerFilePicker.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  btnTriggerCamera.addEventListener('click', (e) => {
    e.stopPropagation();
    cameraInput.click();
  });

  dropZone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleAddedFiles(files);
  });

  fileInput.addEventListener('change', (e) => {
    handleAddedFiles(e.target.files);
    fileInput.value = '';
  });

  cameraInput.addEventListener('change', (e) => {
    handleAddedFiles(e.target.files);
    cameraInput.value = '';
  });

  function handleAddedFiles(files) {
    if (!files || !files.length) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        // Empêcher les doublons stricts (même nom et taille)
        if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
          selectedFiles.push(file);
        }
      } else {
        alert(`Le fichier "${file.name}" n'est pas une image acceptée.`);
      }
    }
    renderPhotoPreviews();
  }

  function renderPhotoPreviews() {
    previewContainer.innerHTML = '';
    selectedFiles.forEach((file, index) => {
      const card = document.createElement('div');
      card.className = 'preview-card';

      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = file.name;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'preview-remove-btn';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'Supprimer cette photo';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFiles.splice(index, 1);
        renderPhotoPreviews();
      });

      const nameBadge = document.createElement('div');
      nameBadge.className = 'preview-name';
      nameBadge.textContent = file.name;

      card.appendChild(img);
      card.appendChild(removeBtn);
      card.appendChild(nameBadge);
      previewContainer.appendChild(card);
    });
  }

  // --- SOUMISSION DU FORMULAIRE ---
  hseForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validation des champs obligatoires
    const siteVal = document.getElementById('inputSite').value.trim();
    const descVal = document.getElementById('inputDescription').value.trim();

    if (!siteVal) {
      alert('Veuillez renseigner le site ou chantier concerné.');
      document.getElementById('inputSite').focus();
      return;
    }

    if (!descVal) {
      alert('Veuillez décrire la situation dangereuse observée.');
      document.getElementById('inputDescription').focus();
      return;
    }

    if (radioNominative.checked && !inputDeclarantName.value.trim()) {
      alert('En mode nominatif, veuillez renseigner votre Prénom & Nom.');
      inputDeclarantName.focus();
      return;
    }

    // Construction du FormData
    const formData = new FormData(hseForm);
    // Supprimer les champs 'photos' existants du form
    formData.delete('photos');
    // Ajouter tous les fichiers de selectedFiles
    selectedFiles.forEach(file => {
      formData.append('photos', file, file.name);
    });

    // État de chargement
    btnSubmitForm.disabled = true;
    btnSubmitText.innerHTML = '<span class="spinner"></span> Envoi en cours...';

    try {
      const response = await fetch('/api/declarations', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        currentDeclarationData = result;

        // Mise à jour de la modale de succès
        document.getElementById('recapId').textContent = result.id;
        document.getElementById('recapSite').textContent = result.declaration.siteChantier;
        document.getElementById('recapMode').textContent = result.declaration.modeDeclaration;
        document.getElementById('recapDate').textContent = `${result.declaration.dateDeclaration} (${result.declaration.gravite})`;
        document.getElementById('recapRecipient').textContent = result.email.recipient || 'anta.gaye@power-techservices.com';

        const emailStatusBanner = document.getElementById('emailStatusBanner');
        if (emailStatusBanner) {
          emailStatusBanner.style.display = 'block';
          if (result.email && result.email.sent) {
            emailStatusBanner.style.background = '#ecfdf5';
            emailStatusBanner.style.border = '1px solid #10b981';
            emailStatusBanner.style.color = '#065f46';
            emailStatusBanner.innerHTML = `<strong>E-mail délivré avec succès !</strong><br>Le signalement avec photos a été envoyé à <strong>${result.email.recipient}</strong>.`;
          } else {
            emailStatusBanner.style.background = '#fef2f2';
            emailStatusBanner.style.border = '1px solid #ef4444';
            emailStatusBanner.style.color = '#991b1b';
            emailStatusBanner.innerHTML = `<strong>Échec d'envoi de l'e-mail :</strong><br>${result.email?.error || 'Identifiants SMTP incorrects sur mail.power-techservices.com'}.<br><span style="font-size: 11.5px; opacity: 0.9;">Vérifiez le mot de passe de la boîte mail.</span>`;
          }
        }

        openModal(successModal);

        // Réinitialiser le formulaire
        hseForm.reset();
        selectedFiles = [];
        renderPhotoPreviews();
        inputDate.value = formattedIso;
        updateDeclarantMode();
      } else {
        alert(`Erreur : ${result.error || 'Impossible d envoyer la déclaration.'}`);
      }
    } catch (err) {
      console.error('Erreur soumission:', err);
      alert('Une erreur réseau est survenue lors de l envoi. Vérifiez votre connexion.');
    } finally {
      btnSubmitForm.disabled = false;
      btnSubmitText.innerHTML = 'Envoyer';
    }
  });

  // --- EXPORT PDF OFFICIEL ---
  function exportOfficialPdf() {
    const element = document.querySelector('.official-form-sheet');
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `F-HSE-SD_Declaration_${new Date().toISOString().slice(0,10)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (window.html2pdf) {
      window.html2pdf().set(opt).from(element).save();
    } else {
      window.print();
    }
  }

  if (btnPrintPdf) btnPrintPdf.addEventListener('click', exportOfficialPdf);
  if (btnSuccessDownloadPdf) btnSuccessDownloadPdf.addEventListener('click', exportOfficialPdf);

  if (btnNewDeclaration) {
    btnNewDeclaration.addEventListener('click', () => {
      closeModal(successModal);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- QR CODE CHANTIER (« Je vois, je scanne, je signale ») ---
  if (btnOpenQrModal) {
    btnOpenQrModal.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/qrcode');
        const data = await res.json();
        document.getElementById('qrCodeImage').src = data.qrcode;
        document.getElementById('qrUrlDisplay').textContent = `Lien direct : ${data.url}`;
        openModal(qrModal);
      } catch (err) {
        alert('Erreur lors de la génération du QR Code.');
      }
    });
  }

  // --- CONFIGURATION E-MAIL & SMTP ---
  if (btnOpenConfigModal) {
    btnOpenConfigModal.addEventListener('click', () => {
      openModal(configModal);
    });
  }

  document.getElementById('btnSaveConfig').addEventListener('click', async () => {
    const recipientEmail = document.getElementById('cfgRecipientEmail').value.trim();
    const smtpHost = document.getElementById('cfgSmtpHost').value.trim();
    const smtpPort = document.getElementById('cfgSmtpPort').value.trim();
    const smtpUser = document.getElementById('cfgSmtpUser').value.trim();
    const smtpPass = document.getElementById('cfgSmtpPass').value.trim();

    if (!recipientEmail) {
      alert('Veuillez renseigner l adresse e-mail de réception.');
      return;
    }

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail, smtpHost, smtpPort, smtpUser, smtpPass })
      });
      const data = await res.json();
      if (data.success) {
        alert('Configuration enregistrée avec succès !');
        if (lblConfiguredEmail) lblConfiguredEmail.textContent = data.config.recipientEmail;
        closeModal(configModal);
      } else {
        alert(`Erreur : ${data.error}`);
      }
    } catch (err) {
      alert('Erreur de communication avec le serveur.');
    }
  });

  // Bouton de test d'e-mail
  document.getElementById('btnTestEmail').addEventListener('click', async () => {
    const testEmail = document.getElementById('cfgRecipientEmail').value.trim();
    if (!testEmail) {
      alert('Veuillez spécifier une adresse e-mail pour le test.');
      return;
    }

    const btn = document.getElementById('btnTestEmail');
    const origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Envoi du test...';

    try {
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });
      const data = await res.json();
      if (data.success) {
        if (data.previewUrl) {
          alert(`Test réussi ! E-mail envoyé en mode test.\nLien de prévisualisation : ${data.previewUrl}`);
          window.open(data.previewUrl, '_blank');
        } else {
          alert(`Test réussi ! E-mail envoyé avec succès à ${testEmail}.`);
        }
      } else {
        alert(`Échec du test : ${data.error}`);
      }
    } catch (err) {
      alert('Erreur réseau lors du test e-mail.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = origText;
    }
  });

  // --- REGISTRE / HISTORIQUE DES DÉCLARATIONS ---
  if (btnOpenHistoryModal) {
    btnOpenHistoryModal.addEventListener('click', async () => {
      await loadHistory();
      openModal(historyModal);
    });
  }

  async function loadHistory(query = '') {
    const container = document.getElementById('historyListContainer');
    const countBadge = document.getElementById('historyCount');
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #94a3b8;">Chargement des déclarations...</div>';

    try {
      const res = await fetch('/api/declarations');
      const list = await res.json();

      const filtered = list.filter(item => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          item.id.toLowerCase().includes(q) ||
          item.siteChantier.toLowerCase().includes(q) ||
          item.departement.toLowerCase().includes(q) ||
          item.descriptionSituation.toLowerCase().includes(q)
        );
      });

      countBadge.textContent = `${filtered.length} signalement(s)`;

      if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">Aucune déclaration enregistrée pour le moment.</div>';
        return;
      }

      container.innerHTML = '';
      filtered.forEach(item => {
        const card = document.createElement('div');
        card.style.cssText = 'background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;';

        const graviteBadgeColor = {
          'Faible': '#10b981',
          'Moyenne': '#f59e0b',
          'Élevée': '#f97316',
          'Critique': '#ef4444'
        }[item.gravite] || '#0284c7';

        let photosHtml = '';
        if (item.photos && item.photos.length > 0) {
          photosHtml = `
            <div style="display: flex; gap: 8px; margin-top: 10px; overflow-x: auto; padding-bottom: 4px;">
              ${item.photos.map(p => `
                <a href="${p.url}" target="_blank" title="Voir la photo originale">
                  <img src="${p.url}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;">
                </a>
              `).join('')}
            </div>
          `;
        }

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
            <div>
              <strong style="font-size: 14px; color: #0284c7;">${item.id}</strong> — 
              <span style="font-weight: 700; color: #0f172a;">${item.siteChantier}</span>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="background: ${graviteBadgeColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">
                ${item.gravite}
              </span>
              <span style="font-size: 12px; color: #64748b;">${item.dateDeclaration}</span>
            </div>
          </div>
          <div style="font-size: 12.5px; color: #475569; margin-bottom: 6px;">
            Déclarant: <strong>${item.declarantName}</strong> (${item.modeDeclaration}) | Département: <strong>${item.departement}</strong>
          </div>
          <div style="font-size: 13px; color: #1e293b; background: white; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 6px;">
            ${item.descriptionSituation}
          </div>
          ${item.actionsCorrectives ? `
            <div style="font-size: 12px; color: #0369a1; background: #f0f9ff; padding: 6px 10px; border-radius: 4px;">
              <strong>Action suggérée :</strong> ${item.actionsCorrectives}
            </div>
          ` : ''}
          ${photosHtml}
        `;

        container.appendChild(card);
      });
    } catch (err) {
      container.innerHTML = '<div style="color: #dc2626; text-align: center; padding: 20px;">Erreur lors du chargement de l historique.</div>';
    }
  }

  const searchHistory = document.getElementById('searchHistory');
  if (searchHistory) {
    searchHistory.addEventListener('input', (e) => loadHistory(e.target.value.trim()));
  }

  // --- GESTION DES MODALES (OUVERTURE / FERMETURE) ---
  function openModal(modal) {
    modal.classList.add('active');
  }

  function closeModal(modal) {
    modal.classList.remove('active');
  }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      const target = document.getElementById(modalId);
      if (target) closeModal(target);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay);
      }
    });
  });
});
