// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/governance/utils/IVotes.sol";

/// Vista del FDT que el Governor necesita. El saldo (balanceOf) y el poder de voto historico
/// (getPastVotes / getPastTotalSupply) ya estan declarados por las interfaces estandar IERC20 e
/// IVotes de OpenZeppelin, que ERC20 y ERC20Votes implementan -- por eso se heredan en vez de
/// re-declararse, para no colisionar con esas implementaciones. Lo unico propio de Fenrir es el
/// padron de holders para iterar inversores elegibles en sorteos y conteos.
interface IFenrirVotesToken is IERC20, IVotes {
    function holdersCount() external view returns (uint256);
    function holderAt(uint256 index) external view returns (address);
}
