// A MOCK of a payment provider's browser SDK (like Stripe.js / Cardcom hosted fields).
// In a real integration the card details are sent ONLY to the provider, which returns a one-time
// token; our server receives just that token and charges with it (IPaymentGateway on the server).
// Nothing here is sent anywhere – no money moves.
//
// Test cards:
//   4242 4242 4242 4242 -> approved
//   4000 0000 0000 0002 -> declined (the server's MockPaymentGateway declines "decline" tokens)

export interface CardDetails {
  holderName: string;
  number: string; // may contain spaces
  expiry: string; // MM/YY
  cvv: string;
}

export const TEST_CARDS = {
  approved: '4242 4242 4242 4242',
  declined: '4000 0000 0000 0002',
};

export class CardValidationError extends Error {}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

/** "4242424242424242" -> "4242 4242 4242 4242" */
export function formatCardNumber(value: string) {
  return digitsOnly(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** "1228" -> "12/28" */
export function formatExpiry(value: string) {
  const d = digitsOnly(value).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** The Luhn checksum every real card number passes */
export function isValidCardNumber(value: string) {
  const d = digitsOnly(value);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export function isValidExpiry(value: string) {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const endOfMonth = new Date(year, month, 1); // first day of the NEXT month
  return endOfMonth.getTime() > Date.now();
}

export async function tokenizeCard(card: CardDetails): Promise<{ token: string; last4: string }> {
  // A provider SDK makes a network call – simulate a short delay
  await new Promise((r) => setTimeout(r, 450));

  const number = digitsOnly(card.number);
  if (!isValidCardNumber(number)) throw new CardValidationError('מספר הכרטיס אינו תקין');
  if (!isValidExpiry(card.expiry)) throw new CardValidationError('תוקף הכרטיס אינו תקין');
  if (!/^\d{3,4}$/.test(card.cvv)) throw new CardValidationError('קוד האבטחה אינו תקין');

  const last4 = number.slice(-4);
  const random = Math.random().toString(36).slice(2, 12);
  const declined = number === digitsOnly(TEST_CARDS.declined);
  return { token: `tok_mock_${declined ? 'decline_' : ''}${last4}_${random}`, last4 };
}
