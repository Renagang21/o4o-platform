import { Request, Response, Router } from 'express';
import type { DataSource, Repository } from 'typeorm';
import { UserNote } from '../entities/index.js';
import type { LifestyleNoteRequestDto } from '../dto/index.js';

/**
 * LifestyleController
 * 생활 기록 API 컨트롤러
 */
export class LifestyleController {
  private noteRepo: Repository<UserNote>;

  constructor(private dataSource: DataSource) {
    this.noteRepo = dataSource.getRepository(UserNote);
  }

  /**
   * 생활 기록 추가
   * POST /diabetes/lifestyle
   */
  async createNote(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const body = req.body as LifestyleNoteRequestDto;

      if (!body.noteType || !body.timestamp) {
        res.status(400).json({ error: 'noteType and timestamp are required' });
        return;
      }

      const note = this.noteRepo.create({
        userId,
        noteType: body.noteType,
        timestamp: new Date(body.timestamp),
        content: body.content,

        // 식사 관련
        mealType: body.mealType,
        carbsGrams: body.carbsGrams,
        calories: body.calories,
        foodItems: body.foodItems,

        // 운동 관련
        exerciseDurationMinutes: body.exerciseDurationMinutes,
        exerciseIntensity: body.exerciseIntensity,
        exerciseType: body.exerciseType,

        // 약물/인슐린 관련
        medicationName: body.medicationName,
        dosage: body.dosage,
        dosageUnit: body.dosageUnit,
        insulinType: body.insulinType,

        // 수면 관련
        sleepDurationMinutes: body.sleepDurationMinutes,
        sleepQuality: body.sleepQuality,

        // 기타
        stressLevel: body.stressLevel,
        mood: body.mood,
        glucoseAtTime: body.glucoseAtTime,
        tags: body.tags,
      });

      const saved = await this.noteRepo.save(note);

      res.status(201).json({
        success: true,
        note: {
          id: saved.id,
          noteType: saved.noteType,
          timestamp: saved.timestamp.toISOString(),
        },
      });
    } catch (error) {
      console.error('[LifestyleController] CreateNote error:', error);
      res.status(500).json({ error: 'Failed to create note' });
    }
  }

  /**
   * 생활 기록 조회
   * GET /diabetes/lifestyle/:userId
   */
  async getNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const { startDate, endDate, noteType, limit, offset } = req.query;

      const queryBuilder = this.noteRepo
        .createQueryBuilder('note')
        .where('note.userId = :userId', { userId });

      if (startDate && endDate) {
        queryBuilder.andWhere('note.timestamp BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string),
        });
      }

      if (noteType) {
        queryBuilder.andWhere('note.noteType = :noteType', { noteType });
      }

      queryBuilder.orderBy('note.timestamp', 'DESC');

      if (limit) {
        queryBuilder.take(parseInt(limit as string));
      }

      if (offset) {
        queryBuilder.skip(parseInt(offset as string));
      }

      const [notes, total] = await queryBuilder.getManyAndCount();

      res.json({
        total,
        count: notes.length,
        notes: notes.map((n) => ({
          id: n.id,
          noteType: n.noteType,
          timestamp: n.timestamp.toISOString(),
          content: n.content,
          // 조건부 필드 포함
          ...(n.mealType && { mealType: n.mealType, carbsGrams: n.carbsGrams }),
          ...(n.exerciseType && {
            exerciseType: n.exerciseType,
            exerciseDurationMinutes: n.exerciseDurationMinutes,
          }),
          ...(n.medicationName && { medicationName: n.medicationName, dosage: n.dosage }),
          ...(n.insulinType && { insulinType: n.insulinType, dosage: n.dosage }),
          ...(n.glucoseAtTime && { glucoseAtTime: n.glucoseAtTime }),
        })),
      });
    } catch (error) {
      console.error('[LifestyleController] GetNotes error:', error);
      res.status(500).json({ error: 'Failed to get notes' });
    }
  }

  /**
   * 생활 기록 상세 조회
   * GET /diabetes/lifestyle/note/:noteId
   */
  async getNote(req: Request, res: Response): Promise<void> {
    try {
      const { noteId } = req.params;

      const note = await this.noteRepo.findOne({ where: { id: noteId } });

      if (!note) {
        res.status(404).json({ error: 'Note not found' });
        return;
      }

      res.json(note);
    } catch (error) {
      console.error('[LifestyleController] GetNote error:', error);
      res.status(500).json({ error: 'Failed to get note' });
    }
  }

  /**
   * 생활 기록 수정
   * PUT /diabetes/lifestyle/note/:noteId
   */
  async updateNote(req: Request, res: Response): Promise<void> {
    try {
      const { noteId } = req.params;
      const body = req.body;

      const note = await this.noteRepo.findOne({ where: { id: noteId } });

      if (!note) {
        res.status(404).json({ error: 'Note not found' });
        return;
      }

      // 업데이트 가능한 필드들
      Object.assign(note, {
        content: body.content ?? note.content,
        carbsGrams: body.carbsGrams ?? note.carbsGrams,
        calories: body.calories ?? note.calories,
        foodItems: body.foodItems ?? note.foodItems,
        exerciseDurationMinutes: body.exerciseDurationMinutes ?? note.exerciseDurationMinutes,
        exerciseIntensity: body.exerciseIntensity ?? note.exerciseIntensity,
        dosage: body.dosage ?? note.dosage,
        sleepQuality: body.sleepQuality ?? note.sleepQuality,
        stressLevel: body.stressLevel ?? note.stressLevel,
        mood: body.mood ?? note.mood,
        tags: body.tags ?? note.tags,
      });

      const saved = await this.noteRepo.save(note);

      res.json({
        success: true,
        note: saved,
      });
    } catch (error) {
      console.error('[LifestyleController] UpdateNote error:', error);
      res.status(500).json({ error: 'Failed to update note' });
    }
  }

  /**
   * 생활 기록 삭제
   * DELETE /diabetes/lifestyle/note/:noteId
   */
  async deleteNote(req: Request, res: Response): Promise<void> {
    try {
      const { noteId } = req.params;

      const result = await this.noteRepo.delete(noteId);

      if (result.affected === 0) {
        res.status(404).json({ error: 'Note not found' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[LifestyleController] DeleteNote error:', error);
      res.status(500).json({ error: 'Failed to delete note' });
    }
  }

  /**
   * 라우터 생성
   */
  createRouter(): Router {
    const router = Router();

    router.post('/', this.createNote.bind(this));
    router.post('/:userId', this.createNote.bind(this));
    router.get('/:userId', this.getNotes.bind(this));
    router.get('/note/:noteId', this.getNote.bind(this));
    router.put('/note/:noteId', this.updateNote.bind(this));
    router.delete('/note/:noteId', this.deleteNote.bind(this));

    return router;
  }
}
