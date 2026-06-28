// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// Vista minima del FDT que el FenrirProject necesita: mint al invertir, projectBurn al
/// reclamar reparto/reembolso, y los saldos/supply (balanceOf/totalSupply) para prorratear.
/// Hereda IERC20 -- en vez de re-declarar balanceOf/totalSupply -- para compartir el mismo
/// origen que ERC20 e IFenrirVotesToken y no forzar overrides de reconciliacion en el token.
interface IFenrirTokenMinimal is IERC20 {
    function mint(address to, uint256 amount) external;
    function projectBurn(address account, uint256 amount) external;
}
