import { createCooperationRegistry, findCooperationExtension } from '../core';
import { pharmacyExtension } from './pharmacy';
import { drugstoreExtension } from './drugstore';
import { carepharmExtension } from './carepharm';
import { pharmcoopExtension } from './pharmcoop';

/** Composition root: the core does not import any business extension. */
export const COOPERATION_EXTENSIONS = createCooperationRegistry([
  pharmacyExtension, drugstoreExtension, carepharmExtension, pharmcoopExtension,
]);
export const getCooperationExtension = (key: string) => findCooperationExtension(COOPERATION_EXTENSIONS, key);
