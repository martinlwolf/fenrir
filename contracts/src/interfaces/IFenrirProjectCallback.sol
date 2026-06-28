// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Vista del proyecto que el Governor necesita para devolverle el resultado de cada votacion
/// (hito, oferta de venta o eleccion de arbitro) y consultar quien es el desarrollador. La
/// declara un archivo neutral para que el Governor la consuma y el FenrirProject la implemente
/// sin acoplarse entre si.
interface IFenrirProjectCallback {
    function developer() external view returns (address);
    function onMilestoneResolved(uint256 milestoneId, bool approved) external;
    function onSaleOfferResolved(uint256 offerId, bool approved) external;
    function onArbiterElected(address newArbiter) external;
}
