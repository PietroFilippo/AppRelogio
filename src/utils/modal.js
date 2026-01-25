export function showModal({ title, content, onSave }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content">
      <h2>${title}</h2>
      ${content}
      <div class="modal-actions">
        <button class="modal-btn cancel">Cancel</button>
        <button class="modal-btn save">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    document.body.removeChild(overlay);
  };

  overlay.querySelector('.cancel').onclick = close;
  overlay.querySelector('.save').onclick = () => {
    onSave(overlay);
    close();
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  return overlay;
}
