/** Isolated verification regressions: no application database or real accounts. */
import express from "express";
import request from "supertest";

const mockFindOne = jest.fn();
const mockQuery = jest.fn();
const mockEnrollment = {
  getEnrollmentByUserAndCourse: jest.fn(),
  recordLessonProgressCompletion: jest.fn(),
  getEnrollment: jest.fn(),
};
jest.mock("../database/connection.js", () => ({
  AppDataSource: {
    getRepository: () => ({ findOne: mockFindOne }),
    query: (...args: any[]) => mockQuery(...args),
  },
}));
jest.mock(
  "@o4o/lms-core",
  () => ({
    Course: class Course {},
    Enrollment: class Enrollment {},
    CourseStatus: { PUBLISHED: "published" },
    CourseVisibility: { PUBLIC: "public" },
    EnrollmentStatus: {
      APPROVED: "approved",
      IN_PROGRESS: "in_progress",
      COMPLETED: "completed",
    },
  }),
  { virtual: true },
);
jest.mock("../modules/lms/services/EnrollmentService.js", () => ({
  EnrollmentService: { getInstance: () => mockEnrollment },
}));
jest.mock("../modules/auth/services/role-assignment.service.js", () => ({
  roleAssignmentService: {},
}));

import { EnrollmentController } from "../modules/lms/controllers/EnrollmentController.js";
import { requireEnrollment } from "../modules/lms/middleware/requireEnrollment.js";
const courseId = "aaaaaaaa-0000-4000-8000-000000000001";
const lessonId = "bbbbbbbb-0000-4000-8000-000000000001";
function progressApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { id: "learner" };
    next();
  });
  app.post(
    "/courses/:courseId/progress",
    EnrollmentController.updateLessonProgress,
  );
  return app;
}
beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockResolvedValue([{ service_key: "lecture" }]);
  mockFindOne.mockResolvedValue({
    id: lessonId,
    courseId,
    type: "video",
    videoDuration: 100,
  });
  mockEnrollment.getEnrollment.mockResolvedValue({ id: "enrollment" });
});

describe("progress requires an approved enrollment before any progress/certificate chain", () => {
  it.each(["pending", "rejected", "cancelled", "expired", undefined])(
    "denies %s with no completion or lesson lookup",
    async (status) => {
      mockEnrollment.getEnrollmentByUserAndCourse.mockResolvedValue({
        id: "enrollment",
        status,
      });
      const app = progressApp();
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await request(app)
          .post(`/courses/${courseId}/progress`)
          .send({ lessonId, completed: true, progressRatio: 1 });
        expect(response.status).toBe(403);
      }
      expect(
        mockEnrollment.recordLessonProgressCompletion,
      ).not.toHaveBeenCalled();
      expect(mockFindOne).not.toHaveBeenCalled();
      expect(mockEnrollment.getEnrollment).not.toHaveBeenCalled();
    },
  );
  it.each(["approved", "in_progress", "completed"])(
    "preserves %s completion",
    async (status) => {
      mockEnrollment.getEnrollmentByUserAndCourse.mockResolvedValue({
        id: "enrollment",
        status,
      });
      const response = await request(progressApp())
        .post(`/courses/${courseId}/progress`)
        .send({ lessonId, completed: true, progressRatio: 0.7 });
      expect(response.status).toBe(200);
      expect(
        mockEnrollment.recordLessonProgressCompletion,
      ).toHaveBeenCalledWith("learner", courseId, lessonId);
    },
  );
  it("still denies a cross-service resource before checking enrollment", async () => {
    mockQuery.mockResolvedValue([{ service_key: "neture" }]);
    const response = await request(progressApp())
      .post(`/courses/${courseId}/progress?serviceKey=lecture`)
      .send({ lessonId, completed: true });
    expect(response.status).toBe(404);
    expect(mockEnrollment.getEnrollmentByUserAndCourse).not.toHaveBeenCalled();
    expect(
      mockEnrollment.recordLessonProgressCompletion,
    ).not.toHaveBeenCalled();
  });
});

describe("async enrollment middleware never escapes the Express error chain", () => {
  function appFor(
    options: Parameters<typeof requireEnrollment>[0],
    route: string,
  ) {
    const app = express();
    app.use((req: any, _res, next) => {
      req.user = { id: "learner" };
      next();
    });
    app.get(route, requireEnrollment(options), (_req, res) => {
      res.json({ success: true });
    });
    app.get("/health", (_req, res) => {
      res.json({ ready: true });
    });
    app.use(
      (
        err: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        res.status(503).json({ error: err.message });
      },
    );
    return app;
  }
  it("malformed lesson UUID returns 400 and a subsequent request succeeds", async () => {
    mockFindOne.mockRejectedValue(
      Object.assign(new Error("invalid uuid"), { code: "22P02" }),
    );
    const app = appFor({ checkLesson: true }, "/lessons/:id");
    const response = await request(app).get("/lessons/not-a-uuid");
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_RESOURCE_ID");
    expect((await request(app).get("/health")).status).toBe(200);
  });
  it.each([
    [{ checkLesson: true }, "/lessons/:id", `/lessons/${lessonId}`, false],
    [{ checkQuiz: true }, "/quizzes/:quizId", `/quizzes/${lessonId}`, true],
    [
      { checkAssignment: true },
      "/assignments/:assignmentId",
      `/assignments/${lessonId}`,
      true,
    ],
    [{}, "/courses/:courseId", `/courses/${courseId}`, false],
  ] as const)(
    "forwards database failure for %j and keeps serving",
    async (options, route, url, query) => {
      const error = new Error("database unavailable");
      if (query) mockQuery.mockRejectedValue(error);
      else mockFindOne.mockRejectedValue(error);
      const app = appFor(options, route);
      const response = await request(app).get(url);
      expect(response.status).toBe(503);
      expect(response.body.error).toBe(error.message);
      expect((await request(app).get("/health")).body.ready).toBe(true);
    },
  );
});
