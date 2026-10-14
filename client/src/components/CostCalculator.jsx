import { useMemo, useState } from 'react';
import { useI18n } from '../i18n.jsx';

const renovationTypes = {
  flooring: { label: 'Flooring', rate: 200 },
  kitchen: { label: 'Kitchen Expansion', rate: 500, base: 20_000 },
  painting: { label: 'Painting', rate: 80 },
};

const qualityMultipliers = {
  standard: 1,
  premium: 1.5,
  luxury: 2,
};

export default function CostCalculator() {
  const { t, locale } = useI18n();
  const [renovationType, setRenovationType] = useState('flooring');
  const [area, setArea] = useState('');
  const [quality, setQuality] = useState('standard');

  const estimatedCost = useMemo(() => {
    const squareMeters = Number(area);
    if (!Number.isFinite(squareMeters) || squareMeters <= 0) return 0;

    const renovation = renovationTypes[renovationType];
    return ((renovation.base || 0) + renovation.rate * squareMeters) * qualityMultipliers[quality];
  }, [area, renovationType, quality]);

  return (
    <section className="calculator-section" aria-labelledby="cost-calculator-title">
      <div className="calculator-card container">
        <div className="calculator-card__heading">
          <div>
            <p className="eyebrow"><span className="eyebrow__line" /> {t('A helpful first estimate')}</p>
            <h2 id="cost-calculator-title">{t('Plan with a little more clarity.')}</h2>
          </div>
          <span className="calculator-card__icon" aria-hidden="true">＋</span>
        </div>
        <div className="calculator-card__content">
          <form className="calculator-form" onSubmit={(event) => event.preventDefault()}>
            <label className="form-field">
              <span>{t('Renovation type')}</span>
              <select value={renovationType} onChange={(event) => setRenovationType(event.target.value)}>
                {Object.entries(renovationTypes).map(([value, { label }]) => (
                  <option key={value} value={value}>{t(label)}</option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>{t('Area')} <small>{t('(square meters)')}</small></span>
              <input
                type="number"
                min="0"
                step="any"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                placeholder={t('Enter area')}
              />
            </label>

            <label className="form-field">
              <span>{t('Material quality')}</span>
              <select value={quality} onChange={(event) => setQuality(event.target.value)}>
                <option value="standard">{t('Standard (×1)')}</option>
                <option value="premium">{t('Premium (×1.5)')}</option>
                <option value="luxury">{t('Luxury (×2)')}</option>
              </select>
            </label>
          </form>

          <div className="calculator-total" aria-live="polite">
            <span className="calculator-total__label">{t('Estimated total')}</span>
            <strong dir="ltr">{estimatedCost.toLocaleString(locale, {
              style: 'currency',
              currency: 'ILS',
              maximumFractionDigits: 2,
            })}</strong>
            <small>{t('ILS · Estimate only, final costs may vary')}</small>
          </div>
        </div>
      </div>
    </section>
  );
}
