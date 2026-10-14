import { useEffect, useState } from 'react';
import { useI18n } from '../i18n.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';

export default function ProjectImage({ url, token, alt, ...props }) {
  const { t } = useI18n();
  const [objectUrl, setObjectUrl] = useState('');

  useEffect(() => {
    if (!url) return undefined;
    let active = true;
    let localUrl;
    fetch(url.startsWith('http') ? url : `${API_BASE_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      if (!response.ok) throw new Error('Image unavailable');
      return response.blob();
    }).then((blob) => {
      localUrl = URL.createObjectURL(blob);
      if (active) setObjectUrl(localUrl);
      else URL.revokeObjectURL(localUrl);
    }).catch(() => { if (active) setObjectUrl(''); });
    return () => { active = false; if (localUrl) URL.revokeObjectURL(localUrl); };
  }, [url, token]);

  return objectUrl ? <img src={objectUrl} alt={alt} {...props} /> : <div className="admin-project__placeholder" aria-label={alt}>{t('Image')}</div>;
}
