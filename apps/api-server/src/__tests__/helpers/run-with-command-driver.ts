/** Run test work with its command responder; stop idle polling when work settles. */
export async function runWithCommandDriver<Result, DriverResult>(
  work: () => Promise<Result>,
  drive: (isFinished: () => boolean) => Promise<DriverResult>,
): Promise<[Result, DriverResult]> {
  let finished = false;
  const result = work().finally(() => { finished = true; });
  return Promise.all([result, drive(() => finished)]);
}
