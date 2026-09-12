import { Modal, Button } from '../../components/ui/index.js';
import { FileText, Download, ExternalLink } from 'lucide-react';

export const ReceiptPreviewModal = ({ isOpen, onClose, attachments = [] }) => {
  if (!isOpen || !attachments.length) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receipt & Documents" size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {attachments.map((att) => {
          const isImage = att.mimeType?.startsWith('image/');
          const fileUrl = att.url || `/uploads/${att.filename}`;

          return (
            <div
              key={att._id || att.id || att.filename}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                  <FileText size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={att.originalName}
                  >
                    {att.originalName}
                  </span>
                </div>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.75rem',
                    color: 'var(--color-primary)',
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={14} /> Open
                </a>
              </div>

              {isImage ? (
                <div
                  style={{
                    maxHeight: '340px',
                    overflow: 'hidden',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={fileUrl}
                    alt={att.originalName}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '340px',
                      objectFit: 'contain',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    padding: '1.5rem',
                    textAlign: 'center',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem'
                  }}
                >
                  Document preview ({att.mimeType || 'file'}). Click "Open" to view or download.
                </div>
              )}
            </div>
          );
        })}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
