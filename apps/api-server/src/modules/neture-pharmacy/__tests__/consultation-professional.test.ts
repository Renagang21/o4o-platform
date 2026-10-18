import { consultationProfessionalConfirmed, confirmOwnerPharmacist } from '../services/consultation-professional.js';
import { saveStaffFeatures } from '../services/staff-feature-permissions.js';
it('uses an explicit boolean confirmation and treats failed reads as unavailable', async () => {
  const query = jest.fn().mockResolvedValue([{ confirmed: true }]);
  expect(await consultationProfessionalConfirmed({ query }, 'user', 'store')).toBe(true);
  query.mockResolvedValue([{ confirmed: false }]);
  expect(await consultationProfessionalConfirmed({ query }, 'user', 'store')).toBe(false);
  query.mockResolvedValue([{ confirmed: 'true' }]);
  await expect(consultationProfessionalConfirmed({ query }, 'user', 'store')).rejects.toMatchObject({ httpStatus: 503 });
  query.mockRejectedValue(new Error('private'));
  await expect(consultationProfessionalConfirmed({ query }, 'user', 'store')).rejects.toMatchObject({ code: 'PROFESSIONAL_ACCESS_UNAVAILABLE' });
});
it('does not let a staff user confirm their own professional use through the owner path', async () => {
  const query = jest.fn().mockResolvedValue([[], 0]);
  await expect(confirmOwnerPharmacist({ query }, 'staff', 'store', true)).rejects.toMatchObject({ httpStatus: 403 });
  await expect(confirmOwnerPharmacist({ query }, 'owner', 'store', 'yes')).rejects.toMatchObject({ httpStatus: 400 });
});
it('requires the owner confirmation when assigning a professional feature and keeps legacy staff permission unchanged', async () => {
  const query = jest.fn().mockResolvedValue([[{ user_id: 'staff' }], 1]);
  await expect(saveStaffFeatures({ query }, 'store', 'staff', ['multilingual-consultation'], ['multilingual-consultation']))
    .rejects.toMatchObject({ code: 'PHARMACIST_CONFIRMATION_REQUIRED' });
  expect(query).not.toHaveBeenCalled();
  await expect(saveStaffFeatures({ query }, 'store', 'staff', ['multilingual-consultation'], ['multilingual-consultation'], false, true)).resolves.toMatchObject({ serviceFeatures: ['multilingual-consultation'] });
  expect(query.mock.calls[0][1]).toEqual(['store', 'staff', '["multilingual-consultation"]', 'staff', true]);
});
