import assert from 'node:assert/strict';
import { test } from 'node:test';
import { maskCooperativeAccounts } from './mask-cooperative-accounts.mjs';

test('emits only runner masking commands for both raw and normalized selectors', () => {
  const lines = [];
  maskCooperativeAccounts({ inputs: { operator_email: ' Operator@Example.invalid ', member_email: 'member@example.invalid' } }, line => lines.push(line));
  assert.deepEqual(lines, ['::add-mask:: Operator@Example.invalid ', '::add-mask::operator@example.invalid', '::add-mask::member@example.invalid']);
});
test('escapes workflow command metacharacters and never emits an injected second command', () => {
  const lines = [];
  maskCooperativeAccounts({ inputs: { operator_email: '\noperator%name@example.invalid\r', member_email: 'member@example.invalid' } }, line => lines.push(line));
  assert.equal(lines[0], '::add-mask::%0Aoperator%25name@example.invalid%0D');
  assert.ok(lines.every(line => !line.includes('\n') && !line.includes('\r')));
});
test('rejects missing or malformed selectors before printing either account', () => {
  for (const input of [undefined, {}, { operator_email: 'operator@example.invalid' }, { operator_email: 'operator@example.invalid', member_email: 'invalid\n::warning::value' }]) {
    const lines = [];
    assert.throws(() => maskCooperativeAccounts({ inputs: input }, line => lines.push(line)), /COOP_ACCOUNT_SELECTORS_REQUIRED/);
    assert.deepEqual(lines, []);
  }
});
