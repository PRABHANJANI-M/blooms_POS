/** Converts a rupee amount to words, Indian style (lakh / crore). */
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigits = (n: number): string => (n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ' ' + ones[n % 10] : ''}`);

const threeDigits = (n: number): string => {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ones[h]} Hundred` : '', r ? twoDigits(r) : ''].filter(Boolean).join(' ');
};

export const numberToWords = (amount: number): string => {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;
  const parts = [
    crore ? `${threeDigits(crore)} Crore` : '',
    lakh ? `${twoDigits(lakh)} Lakh` : '',
    thousand ? `${twoDigits(thousand)} Thousand` : '',
    rest ? threeDigits(rest) : '',
  ].filter(Boolean);
  const rupeePart = parts.length ? `${parts.join(' ')} Rupees` : '';
  const paisePart = paise ? `${twoDigits(paise)} Paise` : '';
  return [rupeePart, paisePart].filter(Boolean).join(' and ') + ' Only';
};
