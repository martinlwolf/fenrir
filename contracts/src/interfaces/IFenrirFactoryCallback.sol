// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Vista de la Factory que el FenrirProject usa para registrar el resultado final del
/// proyecto (exito o fracaso) y disparar el mint del certificado soulbound correspondiente.
/// Archivo neutral consumido por el proyecto e implementado por la Factory.
interface IFenrirFactoryCallback {
    function recordSuccess(address developerAddr) external;
    function recordFailure(address developerAddr) external;
}
