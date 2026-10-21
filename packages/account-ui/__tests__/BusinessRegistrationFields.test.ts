import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BusinessRegistrationFields } from '../src/components/BusinessRegistrationFields.js';
import { getBusinessEntityTypeLabel, isSelectableBusinessEntityType } from '../../types/src/business-registration.js';

jest.mock('@o4o/types', () => jest.requireActual('../../types/src/business-registration.js'), { virtual: true });

describe('invoice business entity selection', () => {
  it.each(['individual', 'corporation'])('keeps the explicit %s choice selected', (businessEntityType) => {
    const html = renderToStaticMarkup(createElement(BusinessRegistrationFields, {
      value: { businessEntityType }, onChange: jest.fn(),
    }));
    expect(html).toContain(`value="${businessEntityType}" selected=""`);
    expect(html).toContain('사업자 구분');
    expect(html).toContain('세금계산서 발행에 사용할 개인·법인 구분입니다.');
    expect(html).not.toMatch(/option value="(?:simple_taxpayer|general_taxpayer|tax_exempt|non_profit|other)"/);
  });
  it.each(['simple_taxpayer', 'general_taxpayer', 'tax_exempt', 'non_profit', 'other'])(
    'does not infer individual/corporation from legacy %s', (businessEntityType) => {
      const onChange = jest.fn();
      const html = renderToStaticMarkup(createElement(BusinessRegistrationFields, {
        value: { businessEntityType }, onChange,
      }));
      expect(html).toContain('value="" selected=""');
      expect(html).toContain('다시 선택해 주세요.');
      expect(onChange).not.toHaveBeenCalled();
      expect(isSelectableBusinessEntityType(businessEntityType)).toBe(false);
      expect(getBusinessEntityTypeLabel(businessEntityType)).not.toBe(businessEntityType);
    },
  );
  it('requires only the entity selection when other registration fields are optional', () => {
    const html = renderToStaticMarkup(createElement(BusinessRegistrationFields, {
      value: {}, onChange: jest.fn(),
    }));
    expect(html).toMatch(/<select[^>]+required=""/);
    expect(html).not.toMatch(/<input[^>]+required=""/);
    expect(isSelectableBusinessEntityType(undefined)).toBe(false);
    expect(isSelectableBusinessEntityType(null)).toBe(false);
    expect(isSelectableBusinessEntityType('individual')).toBe(true);
    expect(isSelectableBusinessEntityType('corporation')).toBe(true);
  });
});
