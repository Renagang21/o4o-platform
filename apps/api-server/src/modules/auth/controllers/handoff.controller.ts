/** Public route facade. Internal handlers own issuance, exchange and service catalog operations. */
import { HandoffIssuanceController } from './handoff-issuance.controller.js';
import { HandoffExchangeController } from './handoff-exchange.controller.js';
import { HandoffCatalogController } from './handoff-catalog.controller.js';
export class HandoffController {
  static generateHandoff = HandoffIssuanceController.generateHandoff;
  static exchangeHandoff = HandoffExchangeController.exchangeHandoff;
  static joinService = HandoffCatalogController.joinService;
  static getServices = HandoffCatalogController.getServices;
}
