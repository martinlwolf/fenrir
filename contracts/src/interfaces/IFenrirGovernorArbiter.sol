// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Vista minima del Governor que el Token necesita para disparar una re-eleccion cuando el
/// arbitro electo se queda sin FDT. La declara un archivo neutral para que el Token la consuma
/// y el Governor la implemente sin acoplarse entre si.
interface IFenrirGovernorArbiter {
    function arbiter() external view returns (address);
    function notifyArbiterDivested() external;
}


