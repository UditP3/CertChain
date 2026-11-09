// Creates 3 sample PDFs and registers them so you can demo every verdict:
//   samples/genuine.pdf   -> registered            => "Registered and unaltered"
//   samples/tampered.pdf  -> same cert, name edited => "Not found"
//   samples/revoked.pdf   -> registered, then revoked => "Revoked"
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

function tinyPdf(name) {
  const text = `Certificate of Completion - ${name} - B.E. Computer Engineering`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    null, // content stream, filled below
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const stream = `BT /F1 14 Tf 30 100 Td (${text}) Tj ET`;
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { pdf += String(o).padStart(10, "0") + " 00000 n \n"; });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

async function main() {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "../frontend/config.js"), "utf8").replace(/^window\.CERTCHAIN = /, "").replace(/;\s*$/, ""));
  const reg = await hre.ethers.getContractAt("CertificateRegistry", cfg.address);
  const dir = path.join(__dirname, "../samples");
  fs.mkdirSync(dir, { recursive: true });

  const files = {
    genuine: tinyPdf("Udit Padhye"),
    tampered: tinyPdf("Udit Padhye (edited)"),
    revoked: tinyPdf("Revoked Student"),
  };
  for (const [k, buf] of Object.entries(files)) fs.writeFileSync(path.join(dir, k + ".pdf"), buf);

  const h = (b) => hre.ethers.sha256(b);
  await (await reg.issue(h(files.genuine), "")).wait();
  await (await reg.issue(h(files.revoked), "")).wait();
  await (await reg.revoke(h(files.revoked))).wait();
  console.log("Seeded samples/genuine.pdf, samples/revoked.pdf (tampered.pdf is intentionally NOT registered)");
}

main().catch((e) => { console.error(e); process.exit(1); });
