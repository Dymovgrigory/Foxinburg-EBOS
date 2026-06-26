# Test Plan — Teacher role (PR #2 + PR #3)

Environment: local frontend http://localhost:5173 against local backend (latest `main`).
Login: teacher@foxinburg.ru / Qwe123!@# (role = teacher).

## Test 1 (PRIMARY, PR #3) — Tasks "Ответственный" dropdown is populated for teacher
Code refs: `frontend/src/pages/TasksPage.tsx:58` (teacher → `usersApi.listStudents()`), modal Select `:317-322`.

Steps:
1. Navigate to `/tasks` (nav "Задачи").
2. Click "+ Создать задачу" / "Новая задача" button to open the create modal.
3. Open the "Ответственный" select.

Pass/fail:
- PASS: the select contains at least one real student name (e.g. a seeded student) in addition to "Не назначен".
- FAIL (broken state): the select contains ONLY "Не назначен" (empty), which is exactly what the bug produced when `/users` 403'd.

## Test 2 (PRIMARY continuation) — Create a task assigned to a student
Steps:
4. Fill "Название" = "Devin QA — назначить ученику".
5. Select a student in "Ответственный".
6. Save.

Pass/fail:
- PASS: toast "Задача создана" (or no error), modal closes, the new task appears in the list with "Ответственный: <student name>".
- FAIL: 403/error toast, or task saved with no assignee.

## Test 3 (Regression, PR #2) — Courses page has no "Новый курс" button for teacher
Code refs: `CoursesPage.tsx` canManage gate.
Steps: navigate to `/courses`.
Pass/fail:
- PASS: page renders course list, NO "Новый курс" button visible (teacher lacks COURSE_CREATE).
- FAIL: "Новый курс" button visible (would 403 on click).

## Test 4 (Regression, PR #2) — Students page loads for teacher
Code refs: `StudentsPage.tsx` uses `/users/students`.
Steps: navigate to `/students`.
Pass/fail:
- PASS: page loads with a student table (or proper empty state), NO error toast, NO 403.
- FAIL: error toast / empty broken page (old behavior from `/users` 403).
