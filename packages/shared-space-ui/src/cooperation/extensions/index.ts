import { createCooperationRegistry, findCooperationExtension } from '../core';
import { pharmacyExtension } from './pharmacy';
import { megapharmExtension } from './megapharm';
import { carepharmExtension } from './carepharm';
import { pharmcoopExtension } from './pharmcoop';

/** Composition root: the core does not import any business extension. */
export const COOPERATION_EXTENSIONS = createCooperationRegistry([
  pharmacyExtension, megapharmExtension, carepharmExtension, pharmcoopExtension,
]);
export const getCooperationExtension = (key: string) => findCooperationExtension(COOPERATION_EXTENSIONS, key);
