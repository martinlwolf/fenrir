// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../FenrirToken.sol";

/// Saca el `new FenrirToken` del bytecode de la Factory. Como es una library `external`,
/// se invoca por delegatecall: `address(this)` sigue siendo la Factory, asi que el token
/// se crea con `msg.sender == factory` (no cambian los constructores ni los immutable).
library TokenDeployer {
    function deploy(string memory name_, string memory symbol_) external returns (address) {
        return address(new FenrirToken(name_, symbol_));
    }
}
