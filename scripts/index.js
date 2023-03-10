import { writeFileSync } from "fs";
import { readdir } from "fs/promises";
readdir("./src").then(names => names
  .filter(name => name != "index.ts")
  .forEach((name, index) => writeFileSync("./src/index.ts", `export * from "./${name.replace(".ts", "")}"\n`, { flag: index == 0 ? "w" : "a" }))
);

