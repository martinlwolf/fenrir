// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../FenrirGovernor.sol";

library GovernorDeployer {
    function deploy(address token_, FenrirGovernor.VotingMode votingMode_) external returns (address) {
        return address(new FenrirGovernor(token_, votingMode_));
    }
}
