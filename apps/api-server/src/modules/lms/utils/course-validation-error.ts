/** Expected course input validation; infrastructure failures remain server errors. */
export class CourseValidationError extends Error {
  readonly code = "COURSE_VALIDATION_ERROR";
}
