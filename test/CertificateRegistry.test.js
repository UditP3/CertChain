const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateRegistry", () => {
  let reg, owner, uni, stranger;
  const hash = ethers.sha256(ethers.toUtf8Bytes("certificate-pdf-bytes"));

  beforeEach(async () => {
    [owner, uni, stranger] = await ethers.getSigners();
    reg = await (await ethers.getContractFactory("CertificateRegistry")).deploy();
  });

  it("owner is the first issuer", async () => {
    expect(await reg.isIssuer(owner.address)).to.equal(true);
  });

  it("whitelisted issuer can issue and anyone can verify", async () => {
    await reg.addIssuer(uni.address);
    await reg.connect(uni).issue(hash, "bafy-test-cid");
    const [exists, revoked, issuer, , cid] = await reg.connect(stranger).verify(hash);
    expect(exists).to.equal(true);
    expect(revoked).to.equal(false);
    expect(issuer).to.equal(uni.address);
    expect(cid).to.equal("bafy-test-cid");
  });

  it("rejects non-issuers (the 'who may write?' problem)", async () => {
    await expect(reg.connect(stranger).issue(hash, "")).to.be.revertedWithCustomError(reg, "NotIssuer");
  });

  it("rejects duplicate hashes", async () => {
    await reg.issue(hash, "");
    await expect(reg.issue(hash, "")).to.be.revertedWithCustomError(reg, "AlreadyIssued");
  });

  it("unknown hash verifies as non-existent (tampered file case)", async () => {
    const tampered = ethers.sha256(ethers.toUtf8Bytes("certificate-pdf-bytes!"));
    const [exists] = await reg.verify(tampered);
    expect(exists).to.equal(false);
  });

  it("revocation works, only by the original issuer", async () => {
    await reg.addIssuer(uni.address);
    await reg.issue(hash, "");
    await expect(reg.connect(uni).revoke(hash)).to.be.revertedWithCustomError(reg, "NotOriginalIssuer");
    await reg.revoke(hash);
    const [, revoked] = await reg.verify(hash);
    expect(revoked).to.equal(true);
    await expect(reg.revoke(hash)).to.be.revertedWithCustomError(reg, "AlreadyRevoked");
  });

  it("removed issuers lose write access; only owner manages issuers", async () => {
    await expect(reg.connect(stranger).addIssuer(stranger.address)).to.be.revertedWithCustomError(reg, "NotOwner");
    await reg.addIssuer(uni.address);
    await reg.removeIssuer(uni.address);
    await expect(reg.connect(uni).issue(hash, "")).to.be.revertedWithCustomError(reg, "NotIssuer");
  });
});
