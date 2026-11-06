import { z } from 'zod';
import {
  MEMBER_REGISTRATION_FIELDS,
  MEMBER_REGISTRATION_TYPES,
  registrationFieldKeys,
  type MemberRegistrationInput,
} from '@o4o/types';

const types = Object.keys(MEMBER_REGISTRATION_TYPES) as [
  keyof typeof MEMBER_REGISTRATION_TYPES,
  ...Array<keyof typeof MEMBER_REGISTRATION_TYPES>,
];
const fields = Object.fromEntries(
  Object.entries(MEMBER_REGISTRATION_FIELDS).map(([key, field]) => [
    key,
    z
      .string()
      .trim()
      .max(field.max)
      .refine(
        (value) =>
          ![...value].some(
            (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
          ),
      )
      .optional(),
  ]),
);
/** Signup data is not a role-assignment payload. Unknown and cross-type fields are rejected. */
export const memberRegistrationSchema = z
  .object({ type: z.enum(types), fields: z.object(fields).strict() })
  .strict()
  .superRefine((input, ctx) => {
    const allowed = registrationFieldKeys(input.type);
    for (const key of Object.keys(input.fields))
      if (!allowed.includes(key as (typeof allowed)[number]))
        ctx.addIssue({
          code: 'custom',
          path: ['fields', key],
          message: '해당 가입 유형의 입력 항목이 아닙니다.',
        });
  });
export function validateRegistration(
  input: unknown,
  complete = false,
): MemberRegistrationInput {
  const value = memberRegistrationSchema.parse(
    input,
  ) as MemberRegistrationInput;
  const f = value.fields;
  if (f.businessNumber !== undefined)
    f.businessNumber = f.businessNumber.replace(/[ -]/g, '');
  const issue = (key: string, message: string) => {
    throw new z.ZodError([{ code: 'custom', path: ['fields', key], message }]);
  };
  if (complete) {
    const required =
      value.type === 'pharmacist'
        ? ['licenseNumber']
        : value.type === 'pharmacy_owner'
          ? ['licenseNumber', 'businessName', 'businessNumber']
          : value.type === 'supplier' || value.type === 'partner'
            ? ['businessName', 'businessNumber']
            : [];
    for (const key of required)
      if (!f[key as keyof typeof f])
        issue(key, '필수 가입 정보를 입력해 주세요.');
  }
  if (f.businessNumber && !/^\d{10}$/.test(f.businessNumber))
    issue('businessNumber', '사업자등록번호 10자리를 입력해 주세요.');
  for (const key of [
    'contactEmail',
    'managerEmail',
    'taxInvoiceEmail',
  ] as const)
    if (f[key] && !z.string().email().safeParse(f[key]).success)
      issue(key, '이메일을 확인해 주세요.');
  if (
    f.businessEntityType &&
    !['individual', 'corporation'].includes(f.businessEntityType)
  )
    issue('businessEntityType', '개인사업자 또는 법인사업자를 선택해 주세요.');
  if (
    f.businessStartDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(f.businessStartDate) ||
      Number.isNaN(Date.parse(f.businessStartDate)) ||
      new Date(f.businessStartDate).toISOString().slice(0, 10) !==
        f.businessStartDate)
  )
    issue('businessStartDate', '개업일을 확인해 주세요.');
  if (
    f.businessRegistrationDocumentId &&
    !z.string().uuid().safeParse(f.businessRegistrationDocumentId).success
  )
    issue(
      'businessRegistrationDocumentId',
      '사업자등록증을 다시 선택해 주세요.',
    );
  return value;
}
