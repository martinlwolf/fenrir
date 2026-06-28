// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../FenrirProject.sol";

library ProjectDeployer {
    function deploy(
        address token_,
        address governor_,
        address developer_,
        FenrirProject.ProjectType projectType_,
        uint256 fmpa_,
        uint256 ff_,
        uint256 fundingDeadline_,
        uint256[] memory milestoneBudgets_,
        uint256[] memory milestoneDurations_,
        uint256 estimatedSalePrice_
    ) external returns (address) {
        return address(
            new FenrirProject(
                token_,
                governor_,
                developer_,
                projectType_,
                fmpa_,
                ff_,
                fundingDeadline_,
                milestoneBudgets_,
                milestoneDurations_,
                estimatedSalePrice_
            )
        );
    }
}
