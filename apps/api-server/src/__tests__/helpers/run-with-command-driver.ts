/** Run test work with its command responder; stop idle polling when work settles. */
export async function runWithCommandDriver<Result, DriverResult>(
  work: () => Promise<Result>,
  drive: (isFinished: () => boolean) => Promise<DriverResult>,
): Promise<[Result, DriverResult]> {
  let finished = false;
  const result = work().finally(() => { finished = true; });
  return Promise.all([result, drive(() => finished)]);
}

/** Preserve bounded polling while avoiding a final idle wait after producer completion. */
export async function waitForTestCommand<Command>(
  commands: readonly Command[], index: number, maxPolls: number, isFinished: () => boolean,
): Promise<Command | undefined> {
  for (let polls = 0; polls < maxPolls && commands.length <= index && !isFinished(); polls += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  }
  return commands[index];
}

export type TestCommandTrace = { base: string; args: Record<string, unknown> };

/** Share queue iteration as well as polling; individual harnesses still own their replies. */
export async function driveTestCommands<Command>(
  commands: readonly Command[], maxCommands: number, maxPolls: number, isFinished: () => boolean,
  answer: (command: Command, seen: TestCommandTrace[], cursors: Record<string, number>) => Promise<void>,
): Promise<TestCommandTrace[]> {
  const seen: TestCommandTrace[] = [];
  const cursors: Record<string, number> = {};
  for (let index = 0; index < maxCommands; index += 1) {
    const command = await waitForTestCommand(commands, index, maxPolls, isFinished);
    if (!command) break;
    await answer(command, seen, cursors);
  }
  return seen;
}
