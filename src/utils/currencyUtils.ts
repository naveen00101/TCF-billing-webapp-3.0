export const formatIndianCurrencyShort = (value: number): string => {
  if (value < 10000) {
    return value.toLocaleString('en-IN');
  } else if (value >= 10000 && value < 100000) {
    const k = value / 1000;
    return Number.isInteger(k) ? `${k}K` : `${Number(k.toFixed(2))}K`;
  } else if (value >= 100000 && value < 10000000) {
    const l = value / 100000;
    return Number.isInteger(l) ? `${l}L` : `${Number(l.toFixed(2))}L`;
  } else {
    const cr = value / 10000000;
    return Number.isInteger(cr) ? `${cr}Cr` : `${Number(cr.toFixed(2))}Cr`;
  }
};

export const formatIndianCurrencyFull = (value: number): string => {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
