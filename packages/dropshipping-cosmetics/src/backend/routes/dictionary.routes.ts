/**
 * Dictionary Routes
 *
 * REST API endpoints for cosmetics dictionary management
 * (Skin Types, Concerns, Ingredients, Categories)
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { DictionaryService } from '../services/dictionary.service.js';
import { DictionaryController } from '../controllers/dictionary.controller.js';

export function createDictionaryRoutes(dataSource: DataSource): Router {
  const router = Router();
  const dictionaryService = new DictionaryService(dataSource);
  const dictionaryController = new DictionaryController(dictionaryService);

  // ====== Skin Types ======

  router.get('/dictionary/skin-types', (req, res) =>
    dictionaryController.listSkinTypes(req, res)
  );

  router.get('/dictionary/skin-types/:id', (req, res) =>
    dictionaryController.getSkinTypeById(req, res)
  );

  router.post('/dictionary/skin-types', (req, res) =>
    dictionaryController.createSkinType(req, res)
  );

  router.put('/dictionary/skin-types/:id', (req, res) =>
    dictionaryController.updateSkinType(req, res)
  );

  router.delete('/dictionary/skin-types/:id', (req, res) =>
    dictionaryController.deleteSkinType(req, res)
  );

  // ====== Concerns ======

  router.get('/dictionary/concerns', (req, res) =>
    dictionaryController.listConcerns(req, res)
  );

  router.get('/dictionary/concerns/:id', (req, res) =>
    dictionaryController.getConcernById(req, res)
  );

  router.post('/dictionary/concerns', (req, res) =>
    dictionaryController.createConcern(req, res)
  );

  router.put('/dictionary/concerns/:id', (req, res) =>
    dictionaryController.updateConcern(req, res)
  );

  router.delete('/dictionary/concerns/:id', (req, res) =>
    dictionaryController.deleteConcern(req, res)
  );

  // ====== Ingredients ======

  router.get('/dictionary/ingredients', (req, res) =>
    dictionaryController.listIngredients(req, res)
  );

  router.get('/dictionary/ingredients/:id', (req, res) =>
    dictionaryController.getIngredientById(req, res)
  );

  router.post('/dictionary/ingredients', (req, res) =>
    dictionaryController.createIngredient(req, res)
  );

  router.put('/dictionary/ingredients/:id', (req, res) =>
    dictionaryController.updateIngredient(req, res)
  );

  router.delete('/dictionary/ingredients/:id', (req, res) =>
    dictionaryController.deleteIngredient(req, res)
  );

  // ====== Categories ======

  router.get('/dictionary/categories', (req, res) =>
    dictionaryController.listCategories(req, res)
  );

  router.get('/dictionary/categories/:id', (req, res) =>
    dictionaryController.getCategoryById(req, res)
  );

  router.post('/dictionary/categories', (req, res) =>
    dictionaryController.createCategory(req, res)
  );

  router.put('/dictionary/categories/:id', (req, res) =>
    dictionaryController.updateCategory(req, res)
  );

  router.delete('/dictionary/categories/:id', (req, res) =>
    dictionaryController.deleteCategory(req, res)
  );

  return router;
}
