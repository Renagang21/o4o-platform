import type { FunctionComponent } from '@/components/registry/function';

export const profile: FunctionComponent = (props, _context) => {
  const data = props.data || {};

  return {
    type: 'ProfileForm',
    props: {
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      avatar: data.avatar,
      bio: data.bio,
      address: data.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
      preferences: data.preferences || {
        newsletter: false,
        notifications: false,
      },
    },
  };
};
