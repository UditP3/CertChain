const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const reg = await (await hre.ethers.getContractFactory("CertificateRegistry")).deploy();
  await reg.waitForDeployment();
  const address = await reg.getAddress();
  console.log("CertificateRegistry deployed to:", address);

  // Hand the address + ABI to the frontend so you never copy-paste by hand.
  const artifact = await hre.artifacts.readArtifact("CertificateRegistry");
  const out = `window.CERTCHAIN = ${JSON.stringify({ address, abi: artifact.abi, chainId: 31337, rpc: "http://127.0.0.1:8545" })};\n`;
  fs.writeFileSync(path.join(__dirname, "../frontend/config.js"), out);
  console.log("Wrote frontend/config.js");
}

main().catch((e) => { console.error(e); process.exit(1); });
