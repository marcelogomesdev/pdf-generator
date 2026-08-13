(() => {
  'use strict';

  const STORAGE_KEY = 'pdfGeneratorDraft';
  const THEME_KEY = 'pdfGeneratorTheme';
  const form = document.getElementById('documentForm');
  const preview = document.getElementById('documentPreview');
  const saveStatus = document.getElementById('saveStatus');
  const downloadButton = document.getElementById('downloadButton');
  const modal = document.getElementById('confirmModal');

  const fields = {
    documentTitle: document.getElementById('documentTitle'),
    authorName: document.getElementById('authorName'),
    recipientName: document.getElementById('recipientName'),
    documentDate: document.getElementById('documentDate'),
    referenceNumber: document.getElementById('referenceNumber'),
    introText: document.getElementById('introText'),
    bodyText: document.getElementById('bodyText'),
    closingText: document.getElementById('closingText'),
    accentColor: document.getElementById('accentColor'),
    accentColorText: document.getElementById('accentColorText'),
    fontFamily: document.getElementById('fontFamily'),
    fontSize: document.getElementById('fontSize'),
    showSignature: document.getElementById('showSignature')
  };

  const previewFields = {
    title: document.getElementById('previewDocumentTitle'),
    author: document.getElementById('previewAuthor'),
    recipient: document.getElementById('previewRecipient'),
    date: document.getElementById('previewDate'),
    reference: document.getElementById('previewReference'),
    intro: document.getElementById('previewIntro'),
    body: document.getElementById('previewBody'),
    closing: document.getElementById('previewClosing'),
    signature: document.getElementById('previewSignature'),
    signatureBlock: document.getElementById('signatureBlock')
  };

  let zoom = 0.75;
  let saveTimer;

  function todayISO() {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().split('T')[0];
  }

  function formatDate(value) {
    if (!value) return 'Data';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
  }

  function safeText(value, fallback) {
    return value.trim() || fallback;
  }

  function updatePreview() {
    const title = safeText(fields.documentTitle.value, 'Título do documento');
    const author = safeText(fields.authorName.value, 'Nome ou empresa');
    const recipient = fields.recipientName.value.trim();
    const reference = fields.referenceNumber.value.trim();
    const intro = fields.introText.value.trim();
    const body = fields.bodyText.value.trim();

    previewFields.title.textContent = title;
    previewFields.author.textContent = author;
    previewFields.signature.textContent = author;
    previewFields.recipient.textContent = recipient ? `Para: ${recipient}` : 'Destinatário';
    previewFields.date.textContent = formatDate(fields.documentDate.value);
    previewFields.reference.textContent = reference || 'DOCUMENTO';
    previewFields.intro.textContent = intro || 'A introdução do seu documento aparecerá aqui.';
    previewFields.body.textContent = body || 'O conteúdo principal será exibido nesta área conforme você preencher o formulário. Use parágrafos para organizar as informações com clareza.';
    previewFields.closing.textContent = fields.closingText.value.trim();
    previewFields.intro.classList.toggle('placeholder-text', !intro);
    previewFields.body.classList.toggle('placeholder-text', !body);
    previewFields.signatureBlock.hidden = !fields.showSignature.checked;

    preview.style.setProperty('--accent', fields.accentColor.value);
    preview.classList.remove('font-inter', 'font-merriweather', 'font-arial', 'size-small', 'size-medium', 'size-large');
    preview.classList.add(`font-${fields.fontFamily.value}`, `size-${fields.fontSize.value}`);

    const selectedTemplate = form.elements.template.value;
    preview.classList.remove('template-modern', 'template-classic', 'template-minimal');
    preview.classList.add(`template-${selectedTemplate}`);

    document.querySelectorAll('.template-option').forEach(option => {
      option.classList.toggle('active', option.querySelector('input').checked);
    });

    updateCounters();
  }

  function updateCounters() {
    document.getElementById('introCounter').textContent = `${fields.introText.value.length}/300`;
    document.getElementById('bodyCounter').textContent = `${fields.bodyText.value.length}/1800`;
    document.getElementById('closingCounter').textContent = `${fields.closingText.value.length}/300`;
  }

  function getDraft() {
    return {
      template: form.elements.template.value,
      documentTitle: fields.documentTitle.value,
      authorName: fields.authorName.value,
      recipientName: fields.recipientName.value,
      documentDate: fields.documentDate.value,
      referenceNumber: fields.referenceNumber.value,
      introText: fields.introText.value,
      bodyText: fields.bodyText.value,
      closingText: fields.closingText.value,
      accentColor: fields.accentColor.value,
      fontFamily: fields.fontFamily.value,
      fontSize: fields.fontSize.value,
      showSignature: fields.showSignature.checked
    };
  }

  function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getDraft()));
    saveStatus.classList.add('visible');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveStatus.classList.remove('visible'), 1800);
  }

  function loadDraft() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      fields.documentDate.value = todayISO();
      return;
    }

    try {
      const draft = JSON.parse(raw);
      Object.entries(draft).forEach(([key, value]) => {
        if (key === 'template') {
          const radio = form.querySelector(`input[name="template"][value="${value}"]`);
          if (radio) radio.checked = true;
        } else if (key === 'showSignature') {
          fields.showSignature.checked = Boolean(value);
        } else if (fields[key] && key !== 'accentColorText') {
          fields[key].value = value;
        }
      });
      fields.accentColorText.value = fields.accentColor.value.toUpperCase();
      showToast('Rascunho restaurado com sucesso.', 'success');
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      fields.documentDate.value = todayISO();
    }
  }

  function validateField(field) {
    const error = document.querySelector(`[data-error-for="${field.id}"]`);
    if (!error) return true;
    const valid = field.value.trim().length > 0;
    field.classList.toggle('invalid', !valid);
    field.setAttribute('aria-invalid', String(!valid));
    error.textContent = valid ? '' : 'Este campo é obrigatório.';
    return valid;
  }

  function validateForm() {
    const requiredFields = [fields.documentTitle, fields.authorName, fields.introText, fields.bodyText];
    const results = requiredFields.map(validateField);
    if (results.includes(false)) {
      requiredFields.find(field => field.classList.contains('invalid'))?.focus();
      showToast('Preencha os campos obrigatórios antes de gerar o PDF.', 'error');
      return false;
    }
    return true;
  }

  async function generatePDF() {
    if (!validateForm()) return;
    if (typeof html2pdf === 'undefined') {
      showToast('Não foi possível carregar a biblioteca de PDF. Verifique sua conexão.', 'error');
      return;
    }

    const originalText = downloadButton.innerHTML;
    downloadButton.disabled = true;
    downloadButton.textContent = 'Gerando PDF...';

    const filenameBase = fields.documentTitle.value.trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'documento';

    const originalTransform = preview.style.transform;
    const originalMargin = preview.style.marginBottom;
    preview.style.transform = 'none';
    preview.style.marginBottom = '0';

    const options = {
      margin: 0,
      filename: `${filenameBase}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await html2pdf().set(options).from(preview).save();
      showToast('PDF gerado e baixado com sucesso.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Ocorreu um erro ao gerar o PDF.', 'error');
    } finally {
      preview.style.transform = originalTransform;
      preview.style.marginBottom = originalMargin;
      downloadButton.disabled = false;
      downloadButton.innerHTML = originalText;
    }
  }

  function clearForm() {
    form.reset();
    fields.documentDate.value = todayISO();
    fields.accentColor.value = '#4f46e5';
    fields.accentColorText.value = '#4F46E5';
    document.querySelector('input[name="template"][value="modern"]').checked = true;
    document.querySelectorAll('.invalid').forEach(field => field.classList.remove('invalid'));
    document.querySelectorAll('.field-error').forEach(error => error.textContent = '');
    localStorage.removeItem(STORAGE_KEY);
    updatePreview();
    closeModal();
    showToast('Formulário e rascunho limpos.', 'success');
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  function openModal() {
    modal.hidden = false;
    document.getElementById('cancelClear').focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.getElementById('clearButton').focus();
  }

  function applyZoom() {
    preview.style.transform = `scale(${zoom})`;
    preview.style.marginBottom = `${-(1123 * (1 - zoom))}px`;
    document.getElementById('zoomValue').textContent = `${Math.round(zoom * 100)}%`;
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }

  form.addEventListener('input', event => {
    if (event.target.matches('[required]')) validateField(event.target);
    updatePreview();
    saveDraft();
  });

  form.addEventListener('change', () => {
    updatePreview();
    saveDraft();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    generatePDF();
  });

  fields.accentColor.addEventListener('input', () => {
    fields.accentColorText.value = fields.accentColor.value.toUpperCase();
  });

  fields.accentColorText.addEventListener('input', () => {
    const value = fields.accentColorText.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      fields.accentColor.value = value;
      updatePreview();
      saveDraft();
    }
  });

  document.getElementById('clearButton').addEventListener('click', openModal);
  document.getElementById('cancelClear').addEventListener('click', closeModal);
  document.getElementById('confirmClear').addEventListener('click', clearForm);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });

  document.getElementById('zoomIn').addEventListener('click', () => {
    zoom = Math.min(1, zoom + 0.05);
    applyZoom();
  });
  document.getElementById('zoomOut').addEventListener('click', () => {
    zoom = Math.max(0.5, zoom - 0.05);
    applyZoom();
  });

  document.getElementById('themeToggle').addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveDraft();
      showToast('Rascunho salvo.', 'success');
    }
  });

  const savedTheme = localStorage.getItem(THEME_KEY);
  const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(savedTheme || preferredTheme);
  loadDraft();
  updatePreview();
  applyZoom();
})();
