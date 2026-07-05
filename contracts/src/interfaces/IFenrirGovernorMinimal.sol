// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Vista del Governor que el FenrirProject necesita para abrir votaciones (eleccion de
/// arbitro, hito, oferta de venta). Archivo neutral consumido por el proyecto e implementado
/// por el Governor, para no acoplarlos entre si.
interface IFenrirGovernorMinimal {
    function proposeArbiterElection() external returns (uint256);
    function proposeMilestone(uint256 milestoneId) external returns (uint256);
    function proposeSaleOffer(uint256 offerId) external returns (uint256);
    /// True si la propuesta quedo esperando al arbitro y ya vencio su ventana de decision sin
    /// resolverse. El proyecto la consulta para habilitar la cancelacion de un hito trabado.
    function isArbiterTimedOut(uint256 proposalId) external view returns (bool);
}
