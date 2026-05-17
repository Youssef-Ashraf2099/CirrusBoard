import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

const candidates = [
  process.env.DOTENV_CONFIG_PATH,
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(process.cwd(), "../../.env"),
];

for (const candidate of candidates) {
  if (candidate && fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}
