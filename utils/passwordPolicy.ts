export type PasswordRuleId = 'len' | 'upper' | 'lower' | 'digit' | 'symbol';

export type PasswordCheck = { id: PasswordRuleId; label: string; ok: boolean };

const MIN_LEN = 8;

export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { id: 'len', label: `At least ${MIN_LEN} characters`, ok: password.length >= MIN_LEN },
    { id: 'upper', label: 'One uppercase letter', ok: /[A-Z]/.test(password) },
    { id: 'lower', label: 'One lowercase letter', ok: /[a-z]/.test(password) },
    { id: 'digit', label: 'One number', ok: /[0-9]/.test(password) },
    { id: 'symbol', label: 'One symbol (e.g. !@#$%)', ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function passwordMeetsPolicy(password: string): boolean {
  return getPasswordChecks(password).every((c) => c.ok);
}
