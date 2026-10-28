import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authClient } from "@o4o/auth-client";
type Review = {
  course: {
    title: string;
    description: string;
    status: string;
    isPaid: boolean;
    requiresApproval: boolean;
  };
  curriculum: {
    id: string;
    title: string;
    description: string;
    hasQuiz: boolean;
    hasAssignment: boolean;
  }[];
};
export default function CentralLectureReview({
  courseId,
}: {
  courseId: string;
}) {
  const [review, setReview] = useState<Review | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    setReview(null);
    setError("");
    void authClient.api
      .get(`/lms/operator/courses/${encodeURIComponent(courseId)}/review`)
      .then((r) => {
        if (!r.data?.data?.course || !Array.isArray(r.data?.data?.curriculum))
          throw new Error();
        if (alive) setReview(r.data.data);
      })
      .catch(() => {
        if (alive) setError("강의 검토 자료를 불러오지 못했습니다.");
      });
    return () => {
      alive = false;
    };
  }, [courseId]);
  return (
    <section>
      <Link to="/operations/lecture/courses">강의 심사 목록</Link>
      {error && <p role="alert">{error}</p>}
      {review && (
        <>
          <h2 className="text-xl font-bold">{review.course.title}</h2>
          <p>{review.course.description}</p>
          <p>
            {review.course.status} · {review.course.isPaid ? "유료" : "무료"} ·{" "}
            {review.course.requiresApproval ? "수강 승인 필요" : "일반 수강"}
          </p>
          <ol>
            {review.curriculum.map((lesson) => (
              <li className="my-4" key={lesson.id}>
                <h3>{lesson.title}</h3>
                <p>{lesson.description}</p>
                <p>
                  {lesson.hasQuiz ? "평가 있음" : ""}{" "}
                  {lesson.hasAssignment ? "과제 있음" : ""}
                </p>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
