// Conversion CIDv0 <-> bytes32. Un CIDv0 ("Qm...") es base58(0x12 0x20 || <32 bytes
// sha2-256>): el prefijo 0x1220 (sha2-256, 32 bytes) es fijo, asi que el digest de 32
// bytes entra exacto en un bytes32 de Solidity. Esto deja guardar el CID del reporte en
// el slot reportHash del contrato sin cambiar su tipo: el "hash" on-chain pasa a ser, a
// la vez, prueba de integridad y direccion para recuperar el reporte desde IPFS.
import { decodeBase58, encodeBase58, getBytes, hexlify, toBeHex } from "ethers";

// 0x12 = sha2-256, 0x20 = 32 bytes de digest.
const CIDV0_MULTIHASH_PREFIX = "1220";

// CIDv0 "Qm..." -> bytes32 ("0x" + 64 hex) con el digest sha2-256 del CID.
export function cidV0ToBytes32(cid: string): string {
  if (!cid.startsWith("Qm")) {
    throw new Error(`CID no es CIDv0 (esperado "Qm..."): ${cid}`);
  }
  const multihash = toBeHex(decodeBase58(cid), 34).slice(2); // 68 hex (34 bytes)
  if (!multihash.startsWith(CIDV0_MULTIHASH_PREFIX)) {
    throw new Error(`CID con multihash inesperado (no sha2-256): ${cid}`);
  }
  return `0x${multihash.slice(4)}`; // descarta el prefijo 0x1220 -> 32 bytes
}

// bytes32 ("0x" + 64 hex) -> CIDv0 "Qm...", reanteponiendo el prefijo fijo 0x1220.
export function bytes32ToCidV0(bytes32: string): string {
  const digest = hexlify(getBytes(bytes32)).slice(2); // 64 hex (32 bytes)
  if (digest.length !== 64) {
    throw new Error(`bytes32 invalido para CID: ${bytes32}`);
  }
  return encodeBase58(`0x${CIDV0_MULTIHASH_PREFIX}${digest}`);
}
