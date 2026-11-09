// Headless version of what the browser does: hash file bytes, call verify().
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "../frontend/config.js"), "utf8").replace(/^window\.CERTCHAIN = /, "").replace(/;\s*$/, ""));
  const reg = await hre.ethers.getContractAt("CertificateRegistry", cfg.address);
  for (const name of ["genuine", "tampered", "revoked"]) {
    const bytes = fs.readFileSync(path.join(__dirname, "../samples", name + ".pdf"));
    const [exists, revoked] = await reg.verify(hre.ethers.sha256(bytes));
    console.log(name.padEnd(9), "->", !exists ? "NOT FOUND" : revoked ? "REVOKED" : "VALID");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
