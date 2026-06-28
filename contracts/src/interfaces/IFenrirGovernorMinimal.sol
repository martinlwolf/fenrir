// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Vista del Governor que el FenrirProject necesita para abrir votaciones (eleccion de
/// arbitro, hito, oferta de venta). Archivo neutral consumido por el proyecto e implementado
/// por el Governor, para no acoplarlos entre si.
interface IFenrirGovernorMinimal {
    function proposeArbiterElection() external returns (uint256);
    function proposeMilestone(uint256 milestoneId) external returns (uint256);
    function proposeSaleOffer(uint256 offerId) external returns (uint256);
}
