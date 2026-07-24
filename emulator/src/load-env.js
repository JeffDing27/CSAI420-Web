import path from "node:path";
import { config } from "dotenv";

export function getDefaultEnvFilePath() {
  const currentWorkingDirectory = process.cwd();
  const emulatorDirectory = currentWorkingDirectory.endsWith(
    `${path.sep}emulator`,
  )
    ? currentWorkingDirectory
    : path.join(currentWorkingDirectory, "emulator");

  return path.join(emulatorDirectory, ".env");
}

export function loadEmulatorEnv(options = {}) {
  return config({
    override: options.override ?? false,
    path:
      options.path ?? process.env.STEDI_SIM_ENV_FILE ?? getDefaultEnvFilePath(),
  });
}
