const fs = require("node:fs");
const path = require("node:path");

const pairs = [
  ["src/renderer/index.html", "dist/renderer/index.html"],
  ["src/renderer/ui/styles.css", "dist/renderer/ui/styles.css"],
  ["src/renderer/ui/tokens.css", "dist/renderer/ui/tokens.css"],
  ["src/assets/icon.png", "dist/assets/icon.png"],
];

for (const [src, dest] of pairs) {
  const srcPath = path.join(__dirname, "..", src);
  const destPath = path.join(__dirname, "..", dest);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
}

const dirs = [["src/renderer/ui/fonts", "dist/renderer/ui/fonts"]];

for (const [src, dest] of dirs) {
  const srcPath = path.join(__dirname, "..", src);
  const destPath = path.join(__dirname, "..", dest);
  fs.mkdirSync(destPath, { recursive: true });
  for (const file of fs.readdirSync(srcPath)) {
    fs.copyFileSync(path.join(srcPath, file), path.join(destPath, file));
  }
}
