// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CertificateRegistry
/// @notice Stores SHA-256 fingerprints of academic certificates. No personal data goes on-chain.
/// @dev Trust model: the chain proves a record was not altered; it cannot prove the issuer
///      told the truth. So only whitelisted issuers (added by the owner) may write.
contract CertificateRegistry {
    struct Record {
        address issuer;      // which institution wallet registered it
        uint64 issuedAt;     // block timestamp
        bool revoked;
        string cid;          // optional IPFS CID of the (encrypted) PDF
    }

    address public owner;
    mapping(address => bool) public isIssuer;
    mapping(bytes32 => Record) private records;

    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);
    event CertificateIssued(bytes32 indexed certHash, address indexed issuer, string cid);
    event CertificateRevoked(bytes32 indexed certHash, address indexed issuer);

    error NotOwner();
    error NotIssuer();
    error AlreadyIssued();
    error NotFound();
    error AlreadyRevoked();
    error NotOriginalIssuer();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyIssuer() {
        if (!isIssuer[msg.sender]) revert NotIssuer();
        _;
    }

    constructor() {
        owner = msg.sender;
        isIssuer[msg.sender] = true;
        emit IssuerAdded(msg.sender);
    }

    function addIssuer(address issuer) external onlyOwner {
        isIssuer[issuer] = true;
        emit IssuerAdded(issuer);
    }

    function removeIssuer(address issuer) external onlyOwner {
        isIssuer[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    /// @notice Register a certificate fingerprint. Reverts on duplicates.
    function issue(bytes32 certHash, string calldata cid) external onlyIssuer {
        if (records[certHash].issuedAt != 0) revert AlreadyIssued();
        records[certHash] = Record(msg.sender, uint64(block.timestamp), false, cid);
        emit CertificateIssued(certHash, msg.sender, cid);
    }

    /// @notice Revoke a certificate. Only the issuer that created it can revoke it.
    function revoke(bytes32 certHash) external onlyIssuer {
        Record storage r = records[certHash];
        if (r.issuedAt == 0) revert NotFound();
        if (r.issuer != msg.sender) revert NotOriginalIssuer();
        if (r.revoked) revert AlreadyRevoked();
        r.revoked = true;
        emit CertificateRevoked(certHash, msg.sender);
    }

    /// @notice Read-only check, free to call (no gas).
    function verify(bytes32 certHash)
        external
        view
        returns (bool exists, bool revoked, address issuer, uint64 issuedAt, string memory cid)
    {
        Record storage r = records[certHash];
        return (r.issuedAt != 0, r.revoked, r.issuer, r.issuedAt, r.cid);
    }
}
